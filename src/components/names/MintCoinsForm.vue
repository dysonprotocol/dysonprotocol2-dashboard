<template>
  <fieldset class="border rounded p-3 bg-base-100">
    <legend class="font-medium">Mint Coins</legend>
    <div class="text-xs opacity-70 mb-2">
      Destination: <span class="font-mono">{{ resolvedAddress || '—' }}</span>
    </div>
    <div class="grid grid-cols-1 gap-2">
      <input
        v-model.trim="denom"
        class="input input-bordered w-full"
        placeholder="denom"
        :disabled="isBusy"
      />
      <input
        v-model.trim="amount"
        class="input input-bordered w-full"
        placeholder="amount (base units)"
        inputmode="numeric"
        :disabled="isBusy"
      />
      <div class="mt-2 grid grid-cols-2 gap-2">
        <WalletSelector
          v-model="selectedExecutor"
          :allowed-addresses="allowedAddresses"
          :default-address="resolvedAddress"
          :button-class="'btn-sm w-full'"
          :msg-type-filter="msgTypeFilter"
          :show-locked="false"
          @update:executor-address="onExecutorAddress"
          @update:grantee-address="onGranteeAddress"
          @update:is-authz="onIsAuthz"
        />
        <button class="btn btn-primary btn-sm" :disabled="isBusy || !canSubmit" @click="onSubmit">
          Mint
        </button>
      </div>
      <div v-if="error" class="alert alert-error alert-soft mt-2">{{ error }}</div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRoute } from 'vue-router'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()
const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))

const resolvedAddress = ref('')
const denom = ref('')
const amount = ref('')
const isBusy = ref(false)
const error = ref('')

// Wallet selection state
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const allowedAddresses = computed(() => (resolvedAddress.value ? [resolvedAddress.value] : []))
const canSubmit = computed(
  () => Boolean(resolvedAddress.value) && Boolean(denom.value) && Boolean(amount.value)
)

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgMintCoins'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgMintCoins' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}
function onExecutorAddress(addr: string) {
  selectedExecutorAddress.value = addr || ''
}
function onGranteeAddress(addr: string) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}

watchEffect(async () => {
  const name = routeName.value
  if (!name) return
  try {
    await useAxiosRepo(NameResolution).api().resolve(name)
    const repo = useRepo(NameResolution)
    resolvedAddress.value = (repo.find(name) as any)?.address || ''
  } catch (e) {
    console.error(e)
    resolvedAddress.value = ''
  }
})

async function onSubmit() {
  if (!canSubmit.value) return
  isBusy.value = true
  error.value = ''
  try {
    const executor = selectedExecutorAddress.value || resolvedAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .mintCoins({
        name_destination: resolvedAddress.value,
        amount: [{ denom: denom.value, amount: amount.value }],
        wallet: { sendMsg: wallet.sendMsg },
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Failed')
    amount.value = ''
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}
</script>
