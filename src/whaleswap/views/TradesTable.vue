<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { FlexRender, getCoreRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, Header, SortingState } from '@tanstack/vue-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatCoinsPrimary,
  formatTimestamp,
  formatTradeId,
  truncateAddress,
} from '@/whaleswap/utils/formatters'
import type { Trade } from '@/whaleswap/utils/types'
import {
  useWhaleswapTradesByOffer,
  useWhaleswapTradesByPool,
  useWhaleswapTradesByTaker,
} from '../composables/useWhaleswapTrades'

const props = defineProps<TradesTableProps>()

const searchMode = ref<SearchMode>('taker')
const takerInput = ref(props.filterTaker || '')
const offerIdInput = ref('')
const poolIdInput = ref('')
const limit = ref('50')
const page = ref(1)

const activeTaker = ref(props.filterTaker || '')
const activeOfferId = ref('')
const activePoolId = ref('')

const sanitizedLimit = computed(() => sanitizeLimit(limit.value))
const supportsOffset = computed(() => searchMode.value !== 'taker')
const offset = computed(() => {
  if (!supportsOffset.value) return '0'
  const perPage = Number(sanitizedLimit.value)
  return String((page.value - 1) * perPage)
})

watch(
  () => props.filterTaker,
  (next) => {
    if (!next) return
    searchMode.value = 'taker'
    takerInput.value = next
    activeTaker.value = next
    page.value = 1
  },
  { immediate: true }
)

watch(searchMode, (mode) => {
  if (mode === 'taker') page.value = 1
})

watch(
  () => sanitizedLimit.value,
  () => {
    if (supportsOffset.value) page.value = 1
  }
)

const takerQuery = useWhaleswapTradesByTaker(activeTaker, {
  limit: sanitizedLimit,
  options: {
    enabled: computed(() => searchMode.value === 'taker' && activeTaker.value.length > 0),
  },
})

const offerQuery = useWhaleswapTradesByOffer(activeOfferId, {
  limit: sanitizedLimit,
  offset,
  options: {
    enabled: computed(() => searchMode.value === 'offer' && activeOfferId.value.length > 0),
  },
})

const poolQuery = useWhaleswapTradesByPool(activePoolId, {
  limit: sanitizedLimit,
  offset,
  options: {
    enabled: computed(() => searchMode.value === 'pool' && activePoolId.value.length > 0),
  },
})

const trades = computed(() => {
  if (searchMode.value === 'taker') return takerQuery.data.value?.trades || []
  if (searchMode.value === 'offer') return offerQuery.data.value?.trades || []
  if (searchMode.value === 'pool') return poolQuery.data.value?.trades || []
  return []
})

const isLoading = computed(() => {
  if (searchMode.value === 'taker') return takerQuery.isLoading.value
  if (searchMode.value === 'offer') return offerQuery.isLoading.value
  return poolQuery.isLoading.value
})

const error = computed(() => {
  if (searchMode.value === 'taker') return takerQuery.error.value
  if (searchMode.value === 'offer') return offerQuery.error.value
  return poolQuery.error.value
})

const paginationInfo = computed(() => {
  if (searchMode.value === 'taker') return takerQuery.data.value?.pagination
  if (searchMode.value === 'offer') return offerQuery.data.value?.pagination
  return poolQuery.data.value?.pagination
})

const totalPages = computed(() => {
  if (!supportsOffset.value) return 1
  const total = Number(paginationInfo.value?.total || '0')
  if (!Number.isFinite(total) || total <= 0) return Math.max(1, page.value)
  const perPage = Number(sanitizedLimit.value)
  if (!Number.isFinite(perPage) || perPage <= 0) return 1
  return Math.max(1, Math.ceil(total / perPage))
})

const tableRows = computed(() => trades.value.map(buildTradeRow))
const sorting = ref<SortingState>([{ id: 'timestamp', desc: true }])
const columns = createColumns()

const table = useVueTable({
  get data() {
    return tableRows.value
  },
  columns,
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})

const displayedCount = computed(() => tableRows.value.length)
const activeQueryLabel = computed(() => {
  if (searchMode.value === 'taker' && activeTaker.value) {
    return `Trades for taker ${truncateAddress(activeTaker.value)}`
  }
  if (searchMode.value === 'offer' && activeOfferId.value) {
    return `Trades for offer #${activeOfferId.value}`
  }
  if (searchMode.value === 'pool' && activePoolId.value) {
    return `Trades for pool #${activePoolId.value}`
  }
  return 'Provide a taker address, offer ID, or pool ID to search trades.'
})

function searchTrades() {
  page.value = 1
  const taker = takerInput.value.trim()
  const offer = offerIdInput.value.trim()
  const pool = poolIdInput.value.trim()

  if (taker.length > 0) {
    searchMode.value = 'taker'
    activeTaker.value = taker
    activeOfferId.value = ''
    activePoolId.value = ''
    return
  }

  if (offer.length > 0) {
    searchMode.value = 'offer'
    activeOfferId.value = offer
    activeTaker.value = ''
    activePoolId.value = ''
    return
  }

  if (pool.length > 0) {
    searchMode.value = 'pool'
    activePoolId.value = pool
    activeTaker.value = ''
    activeOfferId.value = ''
    return
  }

  searchMode.value = 'taker'
  activeTaker.value = ''
  activeOfferId.value = ''
  activePoolId.value = ''
}

function clearFilters() {
  takerInput.value = ''
  offerIdInput.value = ''
  poolIdInput.value = ''
  activeTaker.value = ''
  activeOfferId.value = ''
  activePoolId.value = ''
  searchMode.value = 'taker'
  page.value = 1
}

function nextPage() {
  if (!supportsOffset.value) return
  if (page.value >= totalPages.value) return
  page.value += 1
}

function prevPage() {
  if (!supportsOffset.value) return
  if (page.value <= 1) return
  page.value -= 1
}

const pageLabel = computed(() => {
  if (!supportsOffset.value) return 'Single page mode'
  return `Page ${page.value} of ${totalPages.value}`
})

function sanitizeLimit(value: string): string {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return '50'
  const clamped = Math.min(Math.max(Math.floor(parsed), 10), 500)
  return String(clamped)
}

function buildTradeRow(trade: Trade): TradeRow {
  const meta = extractOperationMeta(trade)
  return {
    trade,
    tradeId: trade.trade_id,
    trader: trade.trader,
    primarySent: formatCoinsPrimary(trade.total_sent),
    primaryReceived: formatCoinsPrimary(trade.total_received),
    timestamp: trade.timestamp,
    ...meta,
  }
}

function extractOperationMeta(trade: Trade): OperationMeta {
  const pools = new Set<string>()
  const offers = new Set<string>()
  const auctions = new Set<string>()
  const operations = trade.operations || []

  for (const op of operations) {
    if (op.swap?.pool_id) pools.add(op.swap.pool_id)
    if (op.take?.offer_id) offers.add(op.take.offer_id)
    if (op.auction?.auction_id) auctions.add(op.auction.auction_id)
  }

  return {
    pools: [...pools],
    offers: [...offers],
    auctions: [...auctions],
    operationCount: operations.length,
    note: trade.note,
  }
}

function handleHeaderClick(header: Header<TradeRow, unknown>, event: MouseEvent) {
  const handler = header.column.getToggleSortingHandler()
  if (handler) handler(event)
}

function createColumns(): ColumnDef<TradeRow>[] {
  return [
    {
      accessorKey: 'tradeId',
      header: 'Trade',
      cell: ({ row }) =>
        h(
          RouterLink,
          {
            to: { name: 'WhaleswapTrade', params: { tradeId: row.original.tradeId } },
            class: 'text-primary hover:underline font-mono',
          },
          { default: () => `#${formatTradeId(row.original.tradeId)}` }
        ),
    },
    {
      accessorKey: 'trader',
      header: 'Trader',
      cell: ({ row }) =>
        h('div', { class: 'font-mono text-sm' }, truncateAddress(row.original.trader)),
    },
    {
      accessorKey: 'primarySent',
      header: 'Sent',
      cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.primarySent || '—'),
    },
    {
      accessorKey: 'primaryReceived',
      header: 'Received',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, row.original.primaryReceived || '—'),
    },
    {
      id: 'context',
      header: 'Context',
      cell: ({ row }) => {
        const summary = summarizeMeta(row.original)
        return h(
          'div',
          { class: 'text-xs text-muted-foreground space-y-1' },
          summary.map((line) => h('div', { key: line }, line))
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'timestamp',
      header: 'Time',
      cell: ({ row }) =>
        h(
          'span',
          { class: 'text-xs text-muted-foreground' },
          formatTimestamp(row.original.timestamp)
        ),
      sortingFn: (a, b) =>
        new Date(a.original.timestamp).getTime() - new Date(b.original.timestamp).getTime(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        h(
          RouterLink,
          {
            to: { name: 'WhaleswapTrade', params: { tradeId: row.original.tradeId } },
            class: 'text-xs text-primary hover:underline whitespace-nowrap',
          },
          { default: () => 'Details' }
        ),
      enableSorting: false,
    },
  ]
}

function summarizeMeta(row: TradeRow): string[] {
  const summary: string[] = []
  if (row.pools.length) summary.push(`Pools ${row.pools.join(', ')}`)
  if (row.offers.length) summary.push(`Offers ${row.offers.join(', ')}`)
  if (row.auctions.length) summary.push(`Auctions ${row.auctions.join(', ')}`)
  summary.push(`${row.operationCount} operation(s)`)
  if (row.note) summary.push(`Note: ${row.note}`)
  return summary
}

interface TradesTableProps {
  filterTaker?: string
}

interface TradeRow {
  trade: Trade
  tradeId: string
  trader: string
  primarySent: string
  primaryReceived: string
  pools: string[]
  offers: string[]
  auctions: string[]
  operationCount: number
  timestamp: string
  note?: string
}

interface OperationMeta {
  pools: string[]
  offers: string[]
  auctions: string[]
  operationCount: number
  note?: string
}

type SearchMode = 'taker' | 'offer' | 'pool'
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-semibold">Whaleswap Trades</h2>
      <p class="text-sm text-muted-foreground">TanStack-powered table synced from on-chain data.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Filter Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-4">
          <div class="space-y-2">
            <Label for="taker">Taker Address</Label>
            <Input
              id="taker"
              v-model="takerInput"
              placeholder="dys1..."
              class="font-mono text-sm"
            />
          </div>
          <div class="space-y-2">
            <Label for="offer">Offer ID</Label>
            <Input id="offer" v-model="offerIdInput" placeholder="123" class="font-mono text-sm" />
          </div>
          <div class="space-y-2">
            <Label for="pool">Pool ID</Label>
            <Input id="pool" v-model="poolIdInput" placeholder="456" class="font-mono text-sm" />
          </div>
          <div class="flex items-end gap-2">
            <Button class="flex-1" @click="searchTrades">Search</Button>
            <Button variant="outline" @click="clearFilters">Clear</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="space-y-4 p-4">
        <div
          class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <span>{{ activeQueryLabel }}</span>
          <div class="flex items-center gap-2">
            <Label for="limit" class="text-xs">Rows per query</Label>
            <Input
              id="limit"
              v-model="limit"
              type="number"
              min="10"
              max="500"
              class="w-24 h-8 text-sm"
            />
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-10 text-muted-foreground">
          Loading trades...
        </div>

        <div v-else-if="error" class="text-center py-10 text-destructive">
          {{ error.message }}
        </div>

        <div v-else class="space-y-3">
          <div class="text-sm text-muted-foreground">Showing {{ displayedCount }} trade(s)</div>

          <div class="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                  <TableHead
                    v-for="header in headerGroup.headers"
                    :key="header.id"
                    :class="header.column.getCanSort() ? 'cursor-pointer select-none' : ''"
                    @click="handleHeaderClick(header, $event)"
                  >
                    <div class="flex items-center gap-2">
                      <FlexRender
                        v-if="!header.isPlaceholder"
                        :render="header.column.columnDef.header"
                        :props="header.getContext()"
                      />
                      <span v-if="header.column.getIsSorted() === 'asc'">↑</span>
                      <span v-else-if="header.column.getIsSorted() === 'desc'">↓</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-if="table.getRowModel().rows.length">
                  <TableRow
                    v-for="row in table.getRowModel().rows"
                    :key="row.id"
                    class="hover:bg-accent/50"
                  >
                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                    </TableCell>
                  </TableRow>
                </template>
                <TableRow v-else>
                  <TableCell colspan="7" class="text-center text-muted-foreground py-8">
                    No trades found. Try searching by taker, offer ID, or pool ID.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div
            class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
          >
            <span>{{ pageLabel }}</span>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="!supportsOffset || page <= 1"
                @click="prevPage"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!supportsOffset || page >= totalPages"
                @click="nextPage"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
