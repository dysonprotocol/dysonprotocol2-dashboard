<template>
  <div class="max-w-5xl mx-auto p-4 space-y-4">
    <h1 class="text-2xl font-semibold">Name: {{ routeName }}</h1>
    <div v-if="isLoading" class="opacity-70">Loading…</div>
    <div v-else-if="error" class="text-error">{{ error }}</div>
    <div v-else>
      <div v-if="!nft" class="space-y-3">
        <div class="alert alert-info">This name is available</div>
        <RegisterName :initialName="routeName" @registered="onRegistered" />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="rounded-box bg-base-200 p-4">
          <table class="table">
            <tbody>
              <tr>
                <th>Owner</th>
                <td class="font-mono break-all">{{ ownerAddress || '—' }}</td>
              </tr>
              <tr>
                <th>Class ID</th>
                <td class="font-mono">{{ nft.class_id }}</td>
              </tr>
              <tr>
                <th>ID</th>
                <td class="font-mono">{{ nft.id }}</td>
              </tr>
              <tr>
                <th>Destination</th>
                <td class="font-mono break-all">{{ nft.uri || '—' }}</td>
              </tr>
              <tr>
                <th>Resolved</th>
                <td class="font-mono break-all">{{ resolvedAddress || '—' }}</td>
              </tr>
              <tr>
                <th>Valuation</th>
                <td>
                  <span v-if="valuationDisplay.label"
                    >{{ valuationDisplay.amount }} {{ valuationDisplay.label }}</span
                  >
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="rounded-box bg-base-200 p-4">
          <div class="font-medium mb-2">Set Destination</div>
          <input
            v-model.trim="destination"
            class="input input-bordered w-full font-mono"
            placeholder="bech32 or name"
            :disabled="isSettingDest"
          />
          <div v-if="setDestError" class="text-error text-sm mt-1">{{ setDestError }}</div>
          <div class="mt-2">
            <WalletSelector
              v-model="selectedExecutor"
              :allowed-addresses="allowedAddresses"
              :default-address="ownerAddress"
              :button-class="'btn-sm w-full'"
              :msg-type-filter="msgTypeFilter"
              @update:executor-address="onExecutorAddress"
              @update:grantee-address="onGranteeAddress"
              @update:is-authz="onIsAuthz"
              :show-locked="false"
            />
          </div>
          <button
            class="btn btn-primary mt-2"
            :disabled="isSettingDest || !canSetDestination"
            @click="setDestination"
          >
            Set Destination
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import RegisterName from '@/components/names/RegisterName.vue'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))
const chainInfo = inject('chainInfo', { restUrl: '' })

const isLoading = ref(false)
const error = ref('')
const resolvedAddress = ref('')
const nft = ref(null)
const ownerAddress = ref('')
const destination = ref('')
const isSettingDest = ref(false)
const setDestError = ref('')
const canSetDestination = computed(() => Boolean(destination.value))
const { sendMsg } = useWallet()

// Wallet selection (direct or via Authz)
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)
const allowedAddresses = computed(() => (ownerAddress.value ? [ownerAddress.value] : []))

function msgTypeFilter(grant) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetDestination'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSetDestination' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

function onExecutorAddress(addr) {
  selectedExecutorAddress.value = addr || ''
}
function onGranteeAddress(addr) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v) {
  isAuthz.value = !!v
}

function getDisplayInfoForBase(baseDenom) {
  if (String(baseDenom || '') === 'udys') return { display: 'dys2', exponent: 6 }
  return { display: String(baseDenom || ''), exponent: 0 }
}
function baseToDisplayFor(amountBase, baseDenom) {
  const { exponent } = getDisplayInfoForBase(baseDenom)
  const s = String(amountBase || '0')
  const exp = Number(exponent || 0)
  if (exp <= 0) return s
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`.replace(/\.0+$/, '')
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
}
const valuationDisplay = computed(() => {
  const coin = nft.value?.data?.valuation || { amount: '0', denom: '' }
  const denom = String(coin?.denom || '')
  if (!denom) return { amount: '0', label: '' }
  return {
    amount: baseToDisplayFor(coin.amount, denom),
    label: getDisplayInfoForBase(denom).display,
  }
})

async function fetchResolveName(name) {
  if (!name) return
  isLoading.value = true
  error.value = ''
  resolvedAddress.value = ''
  nft.value = null
  ownerAddress.value = ''
  try {
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(name)}`
    const resp = await fetch(url)
    if (resp.ok) {
      const json = await resp.json()
      resolvedAddress.value = json?.address || ''
    } else if (resp.status === 400 || resp.status === 404) {
      resolvedAddress.value = ''
    } else {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
    }
    const nftUrl = `${
      chainInfo.restUrl
    }/dysonprotocol/nft/v1beta1/nft?class_id=nameservice.dys&id=${encodeURIComponent(name)}`
    const nftResp = await fetch(nftUrl)
    if (nftResp.ok) {
      const nftJson = await nftResp.json()
      nft.value = nftJson?.nft || null
    } else {
      nft.value = null
    }
    destination.value = nft.value?.uri || ''
    const ownerUrl = `${
      chainInfo.restUrl
    }/dysonprotocol/nft/v1beta1/owner?class_id=nameservice.dys&id=${encodeURIComponent(name)}`
    const ownerResp = await fetch(ownerUrl)
    if (ownerResp.ok) {
      const ownerJson = await ownerResp.json()
      ownerAddress.value = ownerJson?.owner || ''
    } else {
      ownerAddress.value = ''
    }
  } catch (e) {
    error.value = e?.message || 'Failed to resolve name'
  } finally {
    isLoading.value = false
  }
}

async function reload() {
  await fetchResolveName(routeName.value)
}
watchEffect(() => reload())

function onRegistered() {
  reload()
}

async function setDestination() {
  if (!canSetDestination.value) return
  isSettingDest.value = true
  setDestError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgSetDestination',
      owner: String(ownerAddress.value || ''),
      name: String(routeName.value || ''),
      destination: String(destination.value || ''),
    }
    const executor = selectedExecutorAddress.value || ownerAddress.value
    const res = await sendMsg({
      msg,
      executorAddress: executor,
      grantee: isAuthz.value ? selectedGranteeAddress.value : undefined,
      gasLimit: 'auto',
    })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    await reload()
  } catch (e) {
    setDestError.value = e?.message || 'Failed to set destination'
  } finally {
    isSettingDest.value = false
  }
}
</script>
