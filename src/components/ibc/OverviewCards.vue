<template>
  <div class="cards">
    <div class="card">
      <div class="card-title">Clients</div>
      <div class="card-value">
        {{ counts.clients
        }}<span v-if="counts.clientsOpen != null"> ({{ counts.clientsOpen }})</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Connections</div>
      <div class="card-value">
        {{ counts.connections
        }}<span v-if="counts.connectionsOpen != null"> ({{ counts.connectionsOpen }})</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Channels</div>
      <div class="card-value">
        {{ counts.channels
        }}<span v-if="counts.channelsOpen != null"> ({{ counts.channelsOpen }})</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Backlog</div>
      <div class="card-value">
        {{ counts.commitments
        }}<span v-if="counts.unreceived != null"> / {{ counts.unreceived }}</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Latest</div>
      <div class="card-value">{{ latest.height || '—' }}</div>
    </div>
    <div class="card">
      <div class="card-title">Client allowed</div>
      <div class="card-value">{{ (clientParams?.allowed_clients || []).length }}</div>
    </div>
    <div class="card">
      <div class="card-title">Conn max block ns</div>
      <div class="card-value">{{ connParams?.max_expected_time_per_block || '—' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcClient from '@/orm/models/ibc/core/client/Client'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'
import LatestBlock from '@/orm/models/base/TendermintService'
import IbcClientParams from '@/orm/models/ibc/core/client/Params'
import IbcConnectionParams from '@/orm/models/ibc/core/connection/Params'

const repoClients = useRepo(IbcClient)
const repoConns = useRepo(IbcConnection)
const repoChans = useRepo(IbcChannel)
const repoLB = useRepo(LatestBlock)

const counts = computed(() => {
  const clients = repoClients.all() as any[]
  const connections = repoConns.all() as any[]
  const channels = repoChans.all() as any[]
  const openConn = connections.filter((c) =>
    String(c.state || '')
      .toUpperCase()
      .includes('OPEN')
  ).length
  const openChan = channels.filter((c) =>
    String(c.state || '')
      .toUpperCase()
      .includes('OPEN')
  ).length
  const commitments = channels.reduce((a, c) => a + ((c.commitments || []).length || 0), 0)
  const unreceived = channels.reduce((a, c) => a + ((c.unreceived_packets || []).length || 0), 0)
  return {
    clients: clients.length,
    clientsOpen: null as number | null, // no open/closed concept for clients
    connections: connections.length,
    connectionsOpen: openConn,
    channels: channels.length,
    channelsOpen: openChan,
    commitments,
    unreceived,
  }
})

const latest = computed(() => (repoLB.find('default') as any) || { height: '' })
const clientParams = computed(() => (useRepo(IbcClientParams).find('default') as any) || null)
const connParams = computed(() => (useRepo(IbcConnectionParams).find('default') as any) || null)

onMounted(async () => {
  await Promise.allSettled([
    useAxiosRepo(IbcClient).api().fetchClients(),
    useAxiosRepo(IbcConnection).api().fetchConnections(),
    useAxiosRepo(IbcChannel).api().fetchChannels(),
    useAxiosRepo(IbcClientParams).api().fetch(),
    useAxiosRepo(IbcConnectionParams).api().fetch(),
  ])
})
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.card {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.card-title {
  font-size: 12px;
  color: #6b7280;
}
.card-value {
  font-size: 20px;
}
</style>
