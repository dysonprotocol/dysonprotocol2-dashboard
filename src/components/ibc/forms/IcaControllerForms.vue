<template>
  <div class="panel">
    <h3 class="title">Register Interchain Account</h3>
    <form class="form" @submit.prevent="onRegister">
      <label>
        Owner
        <input v-model="owner" placeholder="cosmos1..." />
      </label>
      <label>
        Connection ID
        <input v-model="connection_id" placeholder="connection-0" />
      </label>
      <label>
        Version
        <input v-model="version" placeholder="ics27-1" />
      </label>
      <label>
        Ordering
        <select v-model="ordering">
          <option value="">(default)</option>
          <option value="ORDER_UNORDERED">UNORDERED</option>
          <option value="ORDER_ORDERED">ORDERED</option>
        </select>
      </label>
      <div>
        <Button type="submit" :disabled="isBusy">Register</Button>
      </div>
    </form>
    <h3 class="title">Send ICA Tx</h3>
    <form class="form" @submit.prevent="onSendTx">
      <label>
        Owner
        <input v-model="owner" placeholder="cosmos1..." />
      </label>
      <label>
        Connection ID
        <input v-model="connection_id" placeholder="connection-0" />
      </label>
      <label>
        Payload (base64)
        <input v-model="payload" placeholder="base64-encoded tx bytes" />
      </label>
      <label>
        Relative Timeout (ns)
        <input v-model="relative_timeout" placeholder="60000000000" />
      </label>
      <div>
        <Button type="submit" :disabled="isBusy">Send Tx</Button>
      </div>
    </form>
    <div v-if="error" class="mt-2 text-red-600 text-sm">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/composables/useWallet'
import { useAxiosRepo } from '@pinia-orm/axios'
import IcaControllerActions from '@/orm/models/ibc/applications/interchain_accounts/controller/v1/Actions'

const owner = ref('')
const connection_id = ref('')
const version = ref('')
const ordering = ref('')
const payload = ref('')
const relative_timeout = ref('60000000000')
const isBusy = ref(false)
const error = ref('')

const { sendMsg } = useWallet()

async function onRegister() {
  error.value = ''
  if (!owner.value || !connection_id.value) {
    error.value = 'Owner and connection_id are required'
    return
  }
  isBusy.value = true
  try {
    await useAxiosRepo(IcaControllerActions)
      .api()
      .registerInterchainAccount({
        owner: owner.value,
        connection_id: connection_id.value,
        version: version.value || undefined,
        ordering: (ordering.value as any) || undefined,
        wallet: { sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    error.value = e?.message || 'Register failed'
  } finally {
    isBusy.value = false
  }
}

async function onSendTx() {
  error.value = ''
  if (!owner.value || !connection_id.value || !payload.value) {
    error.value = 'Owner, connection_id and payload are required'
    return
  }
  isBusy.value = true
  try {
    await useAxiosRepo(IcaControllerActions)
      .api()
      .sendTx({
        owner: owner.value,
        connection_id: connection_id.value,
        packet_data: { type: 'TYPE_EXECUTE_TX', data: payload.value },
        relative_timeout: relative_timeout.value,
        wallet: { sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    error.value = e?.message || 'Send ICA tx failed'
  } finally {
    isBusy.value = false
  }
}
</script>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.title {
  margin: 8px 0;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
</style>
