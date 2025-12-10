<template>
  <div class="container mx-auto max-w-4xl p-6 space-y-6">
    <h1 class="text-2xl font-bold">IBC Channel Setup</h1>
    <p class="text-muted-foreground">
      Status of IBC connection to <code class="font-mono">{{ OLD_CHAIN_ID }}</code>
    </p>

    <!-- Refresh button -->
    <Button variant="outline" :disabled="loading" @click="refresh">
      <RefreshCw class="mr-2 size-4" :class="{ 'animate-spin': loading }" />
      Refresh
    </Button>

    <!-- Status Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <!-- Client -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-base">
            <component :is="clientStatus.icon" :class="clientStatus.class" class="size-5" />
            Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="targetClient" class="space-y-1 text-sm">
            <div><span class="text-muted-foreground">ID:</span> {{ targetClient.client_id }}</div>
            <div>
              <span class="text-muted-foreground">Status:</span> {{ targetClient.status || '—' }}
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">
            No client found for {{ OLD_CHAIN_ID }}
          </div>
        </CardContent>
      </Card>

      <!-- Connection -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-base">
            <component :is="connectionStatus.icon" :class="connectionStatus.class" class="size-5" />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="targetConnection" class="space-y-1 text-sm">
            <div><span class="text-muted-foreground">ID:</span> {{ targetConnection.id }}</div>
            <div>
              <span class="text-muted-foreground">State:</span> {{ targetConnection.state }}
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">No connection found</div>
        </CardContent>
      </Card>

      <!-- Channel -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-base">
            <component :is="channelStatus.icon" :class="channelStatus.class" class="size-5" />
            Transfer Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="targetChannel" class="space-y-1 text-sm">
            <div>
              <span class="text-muted-foreground">Local:</span> {{ targetChannel.channel_id }}
            </div>
            <div>
              <span class="text-muted-foreground">Remote:</span>
              {{ targetChannel.counterparty_channel_id }}
            </div>
            <div><span class="text-muted-foreground">State:</span> {{ targetChannel.state }}</div>
          </div>
          <div v-else class="text-sm text-muted-foreground">No transfer channel found</div>
        </CardContent>
      </Card>
    </div>

    <!-- Summary -->
    <Alert :variant="allReady ? 'default' : 'destructive'">
      <CheckCircle v-if="allReady" class="size-4" />
      <AlertCircle v-else class="size-4" />
      <AlertTitle>{{ allReady ? 'Ready' : 'Not Ready' }}</AlertTitle>
      <AlertDescription>
        <span v-if="allReady"> IBC channel is configured. You can proceed with migrations. </span>
        <span v-else>
          IBC channel to <code>{{ OLD_CHAIN_ID }}</code> is not fully set up. See the steps below.
        </span>
      </AlertDescription>
    </Alert>

    <!-- Setup Command -->
    <Card v-if="!allReady">
      <CardHeader>
        <CardTitle>Create IBC Channel</CardTitle>
        <CardDescription>
          Run this single command to create the client, connection, and channel all at once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre class="bg-muted p-3 rounded text-xs overflow-auto whitespace-pre-wrap">
hermes create channel \
  --a-chain {{ NEW_CHAIN_ID }} \
  --b-chain {{ OLD_CHAIN_ID }} \
  --a-port transfer \
  --b-port transfer \
  --new-client-connection \
  --yes</pre
        >
      </CardContent>
    </Card>

    <!-- Hermes Config -->
    <Card v-if="!allReady">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <FileCode class="size-5" />
          Hermes Config
        </CardTitle>
        <CardDescription>
          Save this as <code>config.toml</code> in your Hermes directory (~/.hermes/)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="relative">
          <Button variant="outline" size="sm" class="absolute top-2 right-2" @click="copyConfig">
            <Copy v-if="!copied" class="size-4 mr-1" />
            <Check v-else class="size-4 mr-1" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </Button>
          <pre class="bg-muted p-4 rounded text-xs overflow-auto max-h-96">{{ hermesConfig }}</pre>
        </div>
      </CardContent>
    </Card>

    <!-- Debug info -->
    <details class="mt-6">
      <summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        Debug: Raw Data
      </summary>
      <div class="mt-2 space-y-2 text-xs font-mono">
        <div><strong>Looking for chain:</strong> {{ OLD_CHAIN_ID }}</div>
        <div>
          <strong>Clients ({{ clients.length }}):</strong>
          <pre class="bg-muted p-2 rounded overflow-auto max-h-32">{{
            clients.map((c) => ({ id: c.client_id, chain: c.remote_chain_id }))
          }}</pre>
        </div>
        <div><strong>Target Client:</strong> {{ targetClient?.client_id || 'NOT FOUND' }}</div>
        <div>
          <strong>Connections ({{ connections.length }}):</strong>
          <pre class="bg-muted p-2 rounded overflow-auto max-h-32">{{
            connections.map((c) => ({ id: c.id, client: c.client_id, state: c.state }))
          }}</pre>
        </div>
        <div>
          <strong>Target Connection:</strong> {{ targetConnection?.id || 'NOT FOUND' }} (state:
          {{ targetConnection?.state }})
        </div>
        <div>
          <strong>Channels ({{ channels.length }}):</strong>
          <pre class="bg-muted p-2 rounded overflow-auto max-h-32">{{
            channels.map((c) => ({
              port: c.port_id,
              ch: c.channel_id,
              conn: c.connection_hops,
              state: c.state,
            }))
          }}</pre>
        </div>
        <div>
          <strong>Target Channel:</strong> {{ targetChannel?.channel_id || 'NOT FOUND' }} (state:
          {{ targetChannel?.state }})
        </div>
      </div>
    </details>

    <!-- All Channels with inline connection/client data -->
    <details class="mt-6">
      <summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        All IBC Channels ({{ channels.length }})
      </summary>
      <div class="mt-2 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Remote Chain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in channelRows"
              :key="row.channel.port_id + '/' + row.channel.channel_id"
              :class="{ 'bg-primary/5': row.remoteChainId === OLD_CHAIN_ID }"
            >
              <TableCell class="font-mono text-sm"
                >{{ row.channel.port_id }}/{{ row.channel.channel_id }}</TableCell
              >
              <TableCell class="font-mono text-sm"
                >{{ row.channel.counterparty_port_id }}/{{
                  row.channel.counterparty_channel_id
                }}</TableCell
              >
              <TableCell>{{ formatState(row.channel.state) }}</TableCell>
              <TableCell class="font-mono text-sm">{{ row.connectionId }}</TableCell>
              <TableCell class="font-mono text-sm">{{ row.clientId }}</TableCell>
              <TableCell
                :class="{ 'font-semibold text-primary': row.remoteChainId === OLD_CHAIN_ID }"
              >
                {{ row.remoteChainId || '—' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IbcClient from '@/orm/models/ibc/core/client/Client'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Circle,
  FileCode,
  Copy,
  Check,
} from 'lucide-vue-next'

const OLD_CHAIN_ID = 'dyson-mainnet-01'
const NEW_CHAIN_ID = 'dys2-mainnet-1'

// Hermes config for migration IBC channel
const hermesConfig = `[global]
log_level = 'info'

[mode.clients]
enabled = true
refresh = true
misbehaviour = false

[mode.connections]
enabled = true

[mode.channels]
enabled = true

[mode.packets]
enabled = true
clear_interval = 100
clear_on_start = true
tx_confirmation = true

[telemetry]
enabled = false
host = '127.0.0.1'
port = 3001

# Old Chain - dyson-mainnet-01 (unbonding period = 7 days)
[[chains]]
id = "${OLD_CHAIN_ID}"
type = "CosmosSdk"
rpc_addr = "https://dys-tm.dysonprotocol.com"
grpc_addr = "https://dys-grpc.dysonprotocol.com"
event_source = { mode = "pull", interval = "1s" }
rpc_timeout = "15s"
trusted_node = true
account_prefix = "dys"
key_name = "relayer"
store_prefix = "ibc"
gas_price = { price = 0.001, denom = "dys" }
gas_multiplier = 1.5
default_gas = 500000
max_gas = 5000000
max_msg_num = 30
max_tx_size = 2097152
clock_drift = "60s"
max_block_time = "30s"
trusting_period = "5days"
trust_threshold = { numerator = "2", denominator = "3" }

[chains.packet_filter]
policy = "allow"
list = [["transfer", "*"]]

# New Chain - dysonprotocol
[[chains]]
id = "${NEW_CHAIN_ID}"
type = "CosmosSdk"
rpc_addr = "http://localhost:26657"
grpc_addr = "http://localhost:9090"
event_source = { mode = "pull", interval = "1s" }
rpc_timeout = "15s"
trusted_node = true
account_prefix = "dys2"
key_name = "relayer"
store_prefix = "ibc"
gas_price = { price = 0.001, denom = "udys" }
gas_multiplier = 1.5
default_gas = 500000
max_gas = 5000000
max_msg_num = 30
max_tx_size = 2097152
clock_drift = "60s"
max_block_time = "30s"
trusting_period = "14days"
trust_threshold = { numerator = "2", denominator = "3" }

[chains.packet_filter]
policy = "allow"
list = [["transfer", "*"]]
`

const loading = ref(false)
const copied = ref(false)

async function copyConfig() {
  await navigator.clipboard.writeText(hermesConfig)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

const repoClients = useRepo(IbcClient)
const repoConns = useRepo(IbcConnection)
const repoChans = useRepo(IbcChannel)

const clients = computed(() => repoClients.all() as Array<any>)
const connections = computed(() => repoConns.all() as Array<any>)
const channels = computed(() => repoChans.all() as Array<any>)

// Find the working chain: start from channels and work backwards
// This ensures we find a client that actually has an open connection and channel

// First find any transfer channel that connects to old chain
const targetChannel = computed(() => {
  // Get clients for old chain
  const oldChainClients = new Set(
    clients.value
      .filter((c: any) => c.remote_chain_id === OLD_CHAIN_ID)
      .map((c: any) => c.client_id)
  )

  // Get connections using those clients
  const oldChainConnections = new Set(
    connections.value
      .filter(
        (c: any) =>
          oldChainClients.has(c.client_id) && (c.state === 'STATE_OPEN' || c.state === 'OPEN')
      )
      .map((c: any) => c.id)
  )

  // Find transfer channel using one of those connections
  return channels.value.find(
    (ch: any) =>
      ch.port_id === 'transfer' &&
      ch.connection_hops?.some((hop: string) => oldChainConnections.has(hop)) &&
      (ch.state === 'STATE_OPEN' || ch.state === 'OPEN')
  )
})

// Find connection from target channel
const targetConnection = computed(() => {
  if (!targetChannel.value) return null
  const connId = targetChannel.value.connection_hops?.[0]
  return connections.value.find((c: any) => c.id === connId)
})

// Find client from target connection
const targetClient = computed(() => {
  if (!targetConnection.value) return null
  return clients.value.find((c: any) => c.client_id === targetConnection.value.client_id)
})

// Build rows with inline connection/client data
const channelRows = computed(() => {
  const connMap = new Map(connections.value.map((c: any) => [c.id, c]))
  const clientMap = new Map(clients.value.map((c: any) => [c.client_id, c]))

  return channels.value.map((ch: any) => {
    const connectionId = ch.connection_hops?.[0] || ''
    const conn = connMap.get(connectionId)
    const clientId = conn?.client_id || ''
    const client = clientMap.get(clientId)
    return {
      channel: ch,
      connectionId,
      clientId,
      remoteChainId: client?.remote_chain_id || '',
    }
  })
})

function formatState(state: string) {
  return state?.replace('STATE_', '') || '—'
}

const allReady = computed(() =>
  Boolean(targetClient.value && targetConnection.value && targetChannel.value)
)

const clientStatus = computed(() => {
  if (targetClient.value) return { icon: CheckCircle, class: 'text-green-500' }
  return { icon: XCircle, class: 'text-destructive' }
})

const connectionStatus = computed(() => {
  if (targetConnection.value) return { icon: CheckCircle, class: 'text-green-500' }
  if (targetClient.value) return { icon: Circle, class: 'text-muted-foreground' }
  return { icon: XCircle, class: 'text-destructive' }
})

const channelStatus = computed(() => {
  if (targetChannel.value) return { icon: CheckCircle, class: 'text-green-500' }
  if (targetConnection.value) return { icon: Circle, class: 'text-muted-foreground' }
  return { icon: XCircle, class: 'text-destructive' }
})

async function refresh() {
  loading.value = true
  await Promise.allSettled([
    useAxiosRepo(IbcClient).api().fetchClients(),
    useAxiosRepo(IbcConnection).api().fetchConnections(),
    useAxiosRepo(IbcChannel).api().fetchChannels(),
  ])
  // Fetch status for each client
  for (const c of clients.value) {
    await useAxiosRepo(IbcClient)
      .api()
      .fetchStatus(c.client_id)
      .catch(() => {})
  }
  loading.value = false
}

onMounted(() => refresh())
</script>
