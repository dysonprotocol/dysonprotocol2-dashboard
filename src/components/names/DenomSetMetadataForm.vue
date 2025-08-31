<template>
  <fieldset class="border rounded p-3 bg-base-100">
    <legend class="font-medium">Set Denom Metadata</legend>
    <div class="grid grid-cols-1 gap-2">
      <textarea
        v-model.trim="metadataJson"
        class="textarea textarea-bordered w-full"
        rows="4"
        placeholder="metadata JSON (cosmos.bank.v1beta1.Metadata)"
        :disabled="isBusy"
      />
      <div class="mt-2 grid grid-cols-2 gap-2">
        <WalletSelector
          v-model="selectedExecutor"
          :allowed-addresses="allowedAddresses"
          :default-address="authority"
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
import { ref, computed } from 'vue'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const authority = ref('')
const metadataJson = ref('')
const isBusy = ref(false)
const error = ref('')

// Wallet selection state
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const allowedAddresses = computed(() => (authority.value ? [authority.value] : []))
const canSubmit = computed(() => Boolean(authority.value) && Boolean(metadataJson.value))

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetDenomMetadata'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSetDenomMetadata' : 'Wrong msg' }
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

async function onSubmit() {
  if (!canSubmit.value) return
  isBusy.value = true
  error.value = ''
  try {
    const executor = selectedExecutorAddress.value || authority.value
    const metadata = JSON.parse(metadataJson.value)
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDenomMetadata({
        authority: authority.value,
        metadata,
        wallet: { sendMsg: wallet.sendMsg },
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Failed')
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}
</script>
