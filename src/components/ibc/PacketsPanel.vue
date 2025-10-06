<template>
  <div class="panel">
    <h3 class="title">Packets</h3>
    <div class="grid">
      <div>
        <div class="label">Commitments</div>
        <div>{{ (row?.commitments || []).length }}</div>
      </div>
      <div>
        <div class="label">Unreceived Packets</div>
        <div>{{ (row?.unreceived_packets || []).length }}</div>
      </div>
      <div>
        <div class="label">Unreceived Acks</div>
        <div>{{ (row?.unreceived_acks || []).length }}</div>
      </div>
    </div>
    <form class="form" @submit.prevent>
      <label>
        Channel
        <input v-model="channelId" placeholder="channel-0" />
      </label>
      <label>
        Port
        <input v-model="portId" placeholder="transfer" />
      </label>
      <Button type="button" @click="load">Load</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'
import { Button } from '@/components/ui/button'

const channelId = ref('')
const portId = ref('transfer')

const repo = useRepo(IbcChannel)
const row = computed(() => (repo.find([portId.value, channelId.value]) as any) || {})

async function load() {
  const ch = channelId.value.trim()
  const pt = portId.value.trim()
  if (!ch || !pt) return
  const api = useAxiosRepo(IbcChannel).api()
  await Promise.allSettled([
    api.fetchChannel(ch, pt),
    api.fetchNextSend(ch, pt),
    api.fetchNextRecv(ch, pt),
    api.fetchPacketCommitments(ch, pt).then(async () => {
      const seqs = ((repo.find([pt, ch]) as any)?.commitments as string[]) || []
      if (seqs.length)
        await Promise.allSettled([
          api.fetchUnreceivedPackets(ch, pt, seqs),
          api.fetchPacketAcknowledgements(ch, pt).then(async () => {
            const acks = ((repo.find([pt, ch]) as any)?.ack_sequences as string[]) || []
            if (acks.length) await api.fetchUnreceivedAcks(ch, pt, acks)
          }),
        ])
    }),
  ])
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
.label {
  font-size: 12px;
  color: #6b7280;
}
</style>
