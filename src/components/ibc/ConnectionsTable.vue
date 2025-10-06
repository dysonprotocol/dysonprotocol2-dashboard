<template>
  <div>
    <h2 class="title">Connections</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>connection_id</th>
            <th>client_id</th>
            <th>state</th>
            <th>delay_period</th>
            <th>versions</th>
            <th>counterparty</th>
            <th>remote_chain_id</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.client_id }}</td>
            <td>{{ c.state }}</td>
            <td>{{ c.delay_period }}</td>
            <td>{{ c.versions.join(', ') }}</td>
            <td>{{ c.counterparty_client_id }}/{{ c.counterparty_connection_id }}</td>
            <td>{{ remoteChainId(c.client_id) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="mt-2 text-sm" v-if="params">
        <strong>max_expected_time_per_block</strong> = {{ params.max_expected_time_per_block }} ns
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcConnectionParams from '@/orm/models/ibc/core/connection/Params'
import IbcClient from '@/orm/models/ibc/core/client/Client'

const repo = useRepo(IbcConnection)
const rows = computed(() => repo.all() as Array<any>)
const params = computed(() => (useRepo(IbcConnectionParams).find('default') as any) || null)

function remoteChainId(clientId: string): string {
  const row = (useRepo(IbcClient).find(clientId) as any) || null
  return row?.remote_chain_id || ''
}

onMounted(async () => {
  await useAxiosRepo(IbcConnection).api().fetchConnections()
  await useAxiosRepo(IbcConnectionParams).api().fetch()
})
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
