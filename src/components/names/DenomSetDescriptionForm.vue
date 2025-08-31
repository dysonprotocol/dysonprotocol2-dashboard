<template>
  <fieldset class="border rounded p-3 bg-base-100">
    <legend class="font-medium">Set Denom Description</legend>
    <div class="text-xs opacity-70 mb-2">
      Destination:
      <span class="font-mono">{{ resolvedAddress || '—' }}</span>
    </div>
    <div class="grid grid-cols-1 gap-2">
      <input class="input input-bordered w-full" :value="denom" readonly />
      <input
        v-model.trim="description"
        class="input input-bordered w-full"
        placeholder="description"
        :disabled="isBusy || !canSubmit"
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
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import { useWallet } from '@/composables/useWallet'

interface Props {
  name: string
  denom: string
}
const props = defineProps<Props>()

const wallet = useWallet()

const resolvedAddress = ref('')
const isBusy = ref(false)
const error = ref('')
const description = ref('')

// Wallet selection state
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const allowedAddresses = computed(() => (resolvedAddress.value ? [resolvedAddress.value] : []))
const canSubmit = computed(() => Boolean(resolvedAddress.value) && Boolean(description.value))

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetDenomDescription'
    return {
      valid: ok,
      notes: ok ? 'GenericAuthorization for MsgSetDenomDescription' : 'Wrong msg',
    }
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
  const name = String(props.name || '')
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

async function onSubmit() {
  if (!canSubmit.value) return
  isBusy.value = true
  error.value = ''
  try {
    const executor = selectedExecutorAddress.value || resolvedAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDenomDescription({
        name_destination: String(resolvedAddress.value || ''),
        denom: String(props.denom || ''),
        description: String(description.value || ''),
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Failed')
    description.value = ''
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}
</script>
