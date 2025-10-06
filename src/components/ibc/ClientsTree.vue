<template>
  <div class="tree">
    <ul>
      <li v-for="client in clients" :key="client.client_id">
        <details open>
          <summary>
            {{ client.client_id }}
            <span v-if="client.remote_chain_id">· chain {{ client.remote_chain_id }}</span>
          </summary>
          <ul>
            <li v-for="conn in connectionsByClient(client.client_id)" :key="conn.id">
              <details>
                <summary>{{ conn.id }}</summary>
                <ul>
                  <li
                    v-for="chan in channelsByConnection(conn)"
                    :key="chan.port_id + '/' + chan.channel_id"
                  >
                    <details>
                      <summary>{{ chan.port_id }}/{{ chan.channel_id }}</summary>
                      <div class="panel">
                        <div>next send: {{ nextSend() || '—' }}</div>
                        <div>next recv: {{ nextRecv() || '—' }}</div>
                        <div>
                          <Button type="button">View packets</Button>
                        </div>
                      </div>
                    </details>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcClient from '@/orm/models/ibc/core/client/Client'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'

const repoClients = useRepo(IbcClient)
const repoConns = useRepo(IbcConnection)
const repoChans = useRepo(IbcChannel)

const clients = computed(() => repoClients.all() as Array<any>)
const connections = computed(() => repoConns.all() as Array<any>)
const channels = computed(() => repoChans.all() as Array<any>)

function connectionsByClient(clientId: string) {
  return connections.value.filter((c: any) => c.client_id === clientId)
}
function channelsByConnection(conn: any) {
  const id = String(conn?.id || '')
  return channels.value.filter(
    (ch: any) => Array.isArray(ch.connection_hops) && ch.connection_hops.includes(id)
  )
}
function nextSend() {
  return ''
}
function nextRecv() {
  return ''
}

onMounted(async () => {
  await Promise.allSettled([
    useAxiosRepo(IbcClient).api().fetchClients(),
    useAxiosRepo(IbcConnection).api().fetchConnections(),
    useAxiosRepo(IbcChannel).api().fetchChannels(),
  ])
})
</script>

<style scoped>
.tree ul {
  padding-left: 16px;
}
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
}
button {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #f9fafb;
}
</style>
