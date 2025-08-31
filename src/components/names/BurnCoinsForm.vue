<template>
  <fieldset class="border rounded p-3 bg-base-100">
    <legend class="font-medium">Burn Coins</legend>
    <div class="text-xs opacity-70 mb-2">
      Destination: <span class="font-mono">{{ resolvedAddress || '—' }}</span>
    </div>
    <div class="grid grid-cols-1 gap-2">
      <AmountDenomSelector v-model:base="amountBase" :base-denoms="baseDenoms" :disabled="isBusy" />
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
          Burn
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
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import DenomsByName from '@/orm/models/nameservice/DenomsByName'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()
const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))

const resolvedAddress = ref('')
const baseDenoms = ref<string[]>([])
const amountBase = ref<{ amount: string; denom: string }>({ amount: '', denom: '' })
const isBusy = ref(false)
const error = ref('')

// Wallet selection state
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const allowedAddresses = computed(() => (resolvedAddress.value ? [resolvedAddress.value] : []))
const canSubmit = computed(
  () =>
    Boolean(resolvedAddress.value) &&
    Boolean(amountBase.value?.denom) &&
    Boolean(amountBase.value?.amount)
)

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgBurnCoins'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgBurnCoins' : 'Wrong msg' }
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
    await Promise.all([
      useAxiosRepo(NameResolution).api().resolve(name),
      useAxiosRepo(DenomsByName).api().fetchInit({ name }),
    ])
    const repo = useRepo(NameResolution)
    resolvedAddress.value = (repo.find(name) as any)?.address || ''
    const dRepo = useRepo(DenomsByName)
    baseDenoms.value = (dRepo.all() as unknown as Array<{ name: string; denom: string }>)
      .filter((r) => r.name === name)
      .map((r) => r.denom)
      .filter((v, i, a) => a.indexOf(v) === i)
  } catch (e) {
    console.error(e)
    resolvedAddress.value = ''
    baseDenoms.value = []
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
      .burnCoins({
        name_destination: resolvedAddress.value,
        amount: [{ denom: amountBase.value.denom, amount: amountBase.value.amount }],
        wallet: { sendMsg: wallet.sendMsg },
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Failed')
    amountBase.value = { ...amountBase.value, amount: '' }
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}
</script>
