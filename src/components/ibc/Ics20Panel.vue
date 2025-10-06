<template>
  <div class="panel">
    <h3 class="title">ICS-20 (Transfer)</h3>
    <div class="grid">
      <div>
        <div class="label">send_enabled</div>
        <div>{{ params?.send_enabled ? 'true' : 'false' }}</div>
      </div>
      <div>
        <div class="label">receive_enabled</div>
        <div>{{ params?.receive_enabled ? 'true' : 'false' }}</div>
      </div>
    </div>
    <form class="form" @submit.prevent>
      <label>
        Channel
        <input name="channel" placeholder="channel-0" v-model="channelId" />
      </label>
      <label>
        Port
        <input name="port" placeholder="transfer" v-model="portId" />
      </label>
      <Button type="button" @click="lookupEscrow">Escrow address</Button>
    </form>
    <div v-if="escrowAddress" class="mt-2">Escrow: {{ escrowAddress }}</div>
    <form class="form" @submit.prevent>
      <label>
        Denom
        <input name="denom" placeholder="udys" v-model="denom" />
      </label>
      <Button type="button" @click="lookupTotalEscrow">Total escrow for denom</Button>
    </form>
    <div v-if="totalEscrow" class="mt-2">
      Amount: {{ totalEscrow.amount }} {{ totalEscrow.denom }}
    </div>
    <h3 class="title">Send Transfer</h3>
    <Ics20TransferForm />
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed, onMounted, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Ics20Params from '@/orm/models/ibc/applications/transfer/v1/Params'
import Ics20TransferForm from '@/components/ibc/forms/Ics20TransferForm.vue'

const repo = useRepo(Ics20Params)
const params = computed(
  () => (repo.find('default') as any) || { send_enabled: false, receive_enabled: false }
)

const channelId = ref('')
const portId = ref('transfer')
const escrowAddress = ref('')
const denom = ref('')
const totalEscrow = ref<{ denom: string; amount: string } | null>(null)

onMounted(async () => {
  await useAxiosRepo(Ics20Params).api().fetch()
})

async function lookupEscrow() {
  escrowAddress.value = ''
  const ch = channelId.value.trim()
  const pt = portId.value.trim()
  if (!ch || !pt) return
  await useAxiosRepo(Ics20Params).api().fetchEscrowAddress(ch, pt)
  const row = repo.find('default') as any
  escrowAddress.value = String((row && (row as any).escrow_address) || '')
}

async function lookupTotalEscrow() {
  totalEscrow.value = null
  const d = denom.value.trim()
  if (!d) return
  const res = await useAxiosRepo(Ics20Params).api().fetchTotalEscrowForDenom(d)
  const out = res as unknown as { amount?: { denom?: string; amount?: string } }
  const amt = (out && (out as any).amount) || null
  totalEscrow.value = amt
    ? { denom: String(amt.denom || ''), amount: String(amt.amount || '0') }
    : null
}
</script>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.title {
  margin: 0 0 8px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.label {
  font-size: 12px;
  color: #6b7280;
}
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
</style>
