<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useVueTable,
  type SortingState,
} from '@tanstack/vue-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCoinsPrimary, getDisplayDenom } from '@/whaleswap/utils/formatters'
import type { Trade } from '@/whaleswap/utils/types'
import { createTradesColumns, type TradeRow } from './tradesTableColumns'
import { useWallet } from '@/composables/useWallet'

const props = defineProps<{
  trades: Trade[]
  poolId: string
  base: string
  quote: string
}>()

const wallet = useWallet()
const sorting = ref<SortingState>([{ id: 'timestamp', desc: true }])
const traderFilter = ref('all')

const unlockedAddresses = computed(() =>
  (wallet.unlockedWallets.value as { address: string }[]).map((w) => w.address)
)

const traderFilterOptions = computed(() => {
  const wallets = Array.isArray(wallet.localCosmJsWallets?.value)
    ? (wallet.localCosmJsWallets.value as { name: string; address: string }[])
    : []
  const walletOptions = wallets.map((w) => ({
    value: w.address,
    label: `${w.name} ${w.address}`,
  }))
  return [
    { value: 'all', label: 'All Traders' },
    { value: 'mine', label: 'My Trades' },
    ...walletOptions,
  ]
})

function getTradeSide(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const receivedDenom = op.received.denom
    const sentDenom = op.sent.denom

    if (receivedDenom === props.quote) {
      return 'Sell'
    } else if (sentDenom === props.quote) {
      return 'Buy'
    }
  }
  return null
}

function getTradeAmount(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const receivedDenom = op.received.denom
    const sentDenom = op.sent.denom

    if (receivedDenom === props.quote) {
      return formatCoinsPrimary([op.sent])
    } else if (sentDenom === props.quote) {
      return formatCoinsPrimary([op.received])
    }
  }
  return null
}

function getPrice(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const sentDenom = op.sent.denom
    const receivedDenom = op.received.denom

    // Normalize amounts to account for different decimal exponents
    const normalizedSent = wallet.normalizeCoin({ amount: op.sent.amount, denom: sentDenom })
    const normalizedReceived = wallet.normalizeCoin({
      amount: op.received.amount,
      denom: receivedDenom,
    })
    const sentAmount = parseFloat(normalizedSent.display.amount)
    const receivedAmount = parseFloat(normalizedReceived.display.amount)

    if (sentAmount === 0 || receivedAmount === 0) continue

    let price: number | null = null

    if (sentDenom === props.base && receivedDenom === props.quote) {
      price = receivedAmount / sentAmount
    } else if (sentDenom === props.quote && receivedDenom === props.base) {
      price = sentAmount / receivedAmount
    }

    if (price !== null && isFinite(price) && price > 0) {
      return price.toFixed(6)
    }
  }
  return null
}

const filteredTrades = computed(() => {
  let data = props.trades.filter((trade) => {
    if (!trade.operations) return false
    return trade.operations.some(
      (op) => op.swap && String(op.swap.pool_id) === String(props.poolId)
    )
  })

  if (traderFilter.value === 'mine') {
    data = data.filter((t) => unlockedAddresses.value.includes(t.trader))
  } else if (traderFilter.value !== 'all') {
    data = data.filter((t) => t.trader === traderFilter.value)
  }

  return data
})

const tableData = computed<TradeRow[]>(() => {
  return filteredTrades.value.map((trade) => ({
    ...trade,
    side: getTradeSide(trade),
    amount: getTradeAmount(trade),
    price: getPrice(trade),
  }))
})

const columns = computed(() => createTradesColumns(props.poolId, props.base, props.quote))

const table = useVueTable({
  get data() {
    return tableData.value
  },
  get columns() {
    return columns.value
  },
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
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: { pageSize: 25 },
  },
})
</script>

<template>
  <div class="h-full flex flex-col gap-3">
    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <Select v-model="traderFilter">
        <SelectTrigger class="w-[200px]">
          <SelectValue placeholder="Trader" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in traderFilterOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="header.column.getCanSort() ? 'cursor-pointer select-none' : ''"
              @click="header.column.getToggleSortingHandler()?.($event)"
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
              :class="[
                'hover:bg-accent/50',
                row.original.side === 'Buy' ? 'bg-green-50/50 dark:bg-green-900/20' : '',
                row.original.side === 'Sell' ? 'bg-red-50/50 dark:bg-red-900/20' : '',
              ]"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-8">
              No trades found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">
          {{ table.getFilteredRowModel().rows.length }} trade(s)
        </span>
        <Select
          :model-value="String(table.getState().pagination.pageSize)"
          @update:model-value="(v) => table.setPageSize(Number(v))"
        >
          <SelectTrigger class="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          Previous
        </Button>
        <span class="text-sm">
          Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
