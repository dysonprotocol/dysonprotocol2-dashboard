<template>
  <div>
    <h2 class="title">Channels</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>port_id</th>
            <th>channel_id</th>
            <th>state</th>
            <th>ordering</th>
            <th>connection_hops</th>
            <th>counterparty</th>
            <th>next_send</th>
            <th>next_recv</th>
            <th>commitments</th>
            <th>unreceived_packets</th>
            <th>remote_chain_id</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.port_id + '/' + c.channel_id">
            <td>{{ c.port_id }}</td>
            <td>{{ c.channel_id }}</td>
            <td>{{ c.state }}</td>
            <td>{{ c.ordering }}</td>
            <td>{{ c.connection_hops.join(', ') }}</td>
            <td>{{ c.counterparty_port_id }}/{{ c.counterparty_channel_id }}</td>
            <td>{{ c.next_sequence_send || '—' }}</td>
            <td>{{ c.next_sequence_receive || '—' }}</td>
            <td>{{ (c.commitments || []).length }}</td>
            <td>{{ (c.unreceived_packets || []).length }}</td>
            <td>{{ remoteChainId(c) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcClient from '@/orm/models/ibc/core/client/Client'

const repo = useRepo(IbcChannel)
const rows = computed(() => repo.all() as Array<any>)

onMounted(async () => {
  await useAxiosRepo(IbcChannel).api().fetchChannels()
  const list = repo.all() as Array<any>
  // Fire-and-forget enrichment for each channel
  list.forEach(async (ch) => {
    const api = useAxiosRepo(IbcChannel).api()
    await Promise.allSettled([
      api.fetchNextSend(ch.channel_id, ch.port_id),
      api.fetchNextRecv(ch.channel_id, ch.port_id),
      api.fetchPacketCommitments(ch.channel_id, ch.port_id).then(async () => {
        const seqs =
          ((repo.find([ch.port_id, ch.channel_id]) as any)?.commitments as string[]) || []
        if (seqs.length) await api.fetchUnreceivedPackets(ch.channel_id, ch.port_id, seqs)
      }),
    ])
  })
})

function remoteChainId(ch: any): string {
  const hop = Array.isArray(ch?.connection_hops) ? String(ch.connection_hops[0] || '') : ''
  if (!hop) return ''
  const conn = (useRepo(IbcConnection).find(hop) as any) || null
  const clientId = conn?.client_id || ''
  if (!clientId) return ''
  const client = (useRepo(IbcClient).find(clientId) as any) || null
  return client?.remote_chain_id || ''
}
</script>

<style scoped>
.title {
  font-size: 16px;
  margin: 8px 0;
}
.table-wrap {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}
thead th {
  font-size: 12px;
  color: #6b7280;
}
</style>
