<template>
  <fieldset class="border rounded p-3 bg-base-100">
    <legend class="font-medium">Set Denom URI</legend>
    <div class="text-xs opacity-70 mb-2">
      Destination:
      <span class="font-mono">{{ resolvedAddress || '—' }}</span>
    </div>
    <div class="grid grid-cols-1 gap-2">
      <input class="input input-bordered w-full" :value="routeDenom" readonly />
      <input
        v-model.trim="uri"
        class="input input-bordered w-full"
        placeholder="uri (optional)"
        :disabled="isBusy || !resolvedAddress"
      />
      <input
        v-model.trim="uriHash"
        class="input input-bordered w-full"
        placeholder="uri_hash (optional)"
        :disabled="isBusy || !resolvedAddress"
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
          Save
        </button>
      </div>
      <div v-if="error" class="alert alert-error alert-soft mt-2">{{ error }}</div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRoute } from 'vue-router'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()
const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))
const routeDenom = computed(() => String(route.params.denom || ''))

const resolvedAddress = ref('')
const isBusy = ref(false)
const error = ref('')
const uri = ref('')
const uriHash = ref('')

// Wallet selection state
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const allowedAddresses = computed(() => (resolvedAddress.value ? [resolvedAddress.value] : []))
const canSubmit = computed(
  () => Boolean(resolvedAddress.value) && (Boolean(uri.value) || Boolean(uriHash.value))
)

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetDenomURI'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSetDenomURI' : 'Wrong msg' }
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

// Resolve destination for current name (react to route changes)
watchEffect(async () => {
  console.log('watchEffect routeName', routeName.value)
  const name = routeName.value
  if (!name) return
  try {
    await useAxiosRepo(NameResolution).api().resolve(name)
    const repo = useRepo(NameResolution)
    resolvedAddress.value = (repo.find(name) as any)?.address || ''
  } catch (e: any) {
    console.error(e)
    resolvedAddress.value = ''
  }
})

// Prefill current URI/URI hash from DenomMetadata in ORM
watchEffect(() => {
  console.log('watchEffect routeDenom', routeDenom.value)
  const denom = routeDenom.value
  if (!denom) return
  const all = useRepo(DenomMetadata).all() as unknown as Array<{
    base: string
    uri?: string
    uri_hash?: string
    denom_units?: Array<{ denom: string; exponent: number; aliases?: string[] }>
  }>
  const md = all.find(
    (m) =>
      m.base === denom ||
      (m.denom_units || []).some((u) => u.denom === denom || (u.aliases || []).includes(denom))
  )
  if (md) {
    if (!uri.value) uri.value = String(md.uri || '')
    if (!uriHash.value) uriHash.value = String(md.uri_hash || '')
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
      .setDenomURI({
        name_destination: String(resolvedAddress.value || ''),
        denom: routeDenom.value,
        uri: uri.value || undefined,
        uri_hash: uriHash.value || undefined,
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Failed')
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}
</script>
