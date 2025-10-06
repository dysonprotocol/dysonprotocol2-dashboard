<template>
  <form class="form" @submit.prevent="onSubmit">
    <label>
      Source Port
      <input v-model="source_port" placeholder="transfer" />
    </label>
    <label>
      Source Channel
      <select v-model="source_channel">
        <option value="" disabled>select a channel</option>
        <option v-for="opt in channelOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </label>
    <label>
      Sender
      <input v-model="sender" placeholder="cosmos1..." />
    </label>
    <label>
      Receiver
      <input v-model="receiver" placeholder="cosmos1..." />
    </label>
    <AmountDenomSelector v-model:base="tokenBase" />
    <label>
      Timeout
      <select v-model="timeoutSeconds">
        <option value="10">10s</option>
        <option value="30">30s</option>
        <option value="60">60s</option>
        <option value="90">90s</option>
        <option value="120">120s</option>
      </select>
    </label>
    <label>
      Memo
      <input v-model="memo" placeholder="optional" />
    </label>
    <div>
      <Button type="submit" :disabled="isBusy">Send</Button>
    </div>
  </form>
  <div v-if="error" class="mt-2 text-red-600 text-sm">{{ error }}</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useAxiosRepo } from '@pinia-orm/axios'
import { Button } from '@/components/ui/button'
import Ics20Actions from '@/orm/models/ibc/applications/transfer/v1/Actions'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import { useRepo } from 'pinia-orm'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'

const source_port = ref('transfer')
const source_channel = ref('')
const sender = ref('')
const receiver = ref('')
const tokenBase = ref<{ amount: string; denom: string }>({ amount: '', denom: '' })
const repo = useRepo(IbcChannel)
const channelOptions = computed(() => {
  const list = (repo.all() as Array<any>).filter((c) => c.port_id === 'transfer')
  return Array.from(new Set(list.map((c) => String(c.channel_id || '')))).filter(Boolean)
})

onMounted(async () => {
  try {
    if ((repo.all() as any[]).length === 0) await useAxiosRepo(IbcChannel).api().fetchChannels()
  } catch (e) {
    // ignore
  }
})
const timeoutSeconds = ref('60')
const memo = ref('')
const isBusy = ref(false)
const error = ref('')

const { sendMsg } = useWallet()

async function onSubmit() {
  error.value = ''
  if (
    !sender.value ||
    !receiver.value ||
    !source_channel.value ||
    !tokenBase.value?.denom ||
    !tokenBase.value?.amount
  ) {
    error.value = 'Missing required fields'
    return
  }
  isBusy.value = true
  try {
    await useAxiosRepo(Ics20Actions)
      .api()
      .transfer({
        source_port: source_port.value,
        source_channel: source_channel.value,
        token: { denom: tokenBase.value.denom, amount: tokenBase.value.amount },
        sender: sender.value,
        receiver: receiver.value,
        timeout_timestamp: computeAbsoluteTimeoutNs(timeoutSeconds.value),
        memo: memo.value || undefined,
        wallet: { sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    error.value = e?.message || 'Transfer failed'
  } finally {
    isBusy.value = false
  }
}

function computeAbsoluteTimeoutNs(secsStr: string): string {
  const secs = Number(secsStr || '0')
  const nowMs = Date.now()
  const nowNs = BigInt(nowMs) * 1000000n
  const addNs = BigInt(Math.max(1, Math.floor(secs))) * 1000000000n
  return (nowNs + addNs).toString()
}
</script>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
</style>
