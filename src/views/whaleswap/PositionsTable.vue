<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
import type { LeveragePosition } from '@/whaleswap/utils/types'
import { createPositionsColumns, type PositionWithOwnership } from './positionsTableColumns'
import PositionDetailModal from './PositionDetailModal.vue'
import { useWallet } from '@/composables/useWallet'
import { calculatePositionHealth } from '@/whaleswap/composables/usePositionMutations'

const props = defineProps<{
  positions: LeveragePosition[]
  poolId?: string
}>()

const wallet = useWallet()

const selectedPosition = ref<LeveragePosition | null>(null)
const showDetailModal = ref(false)
const sorting = ref<SortingState>([{ id: 'position_id', desc: true }])
const statusFilter = ref('all')
const userFilter = ref('all')
const healthFilter = ref('all')

const unlockedAddresses = computed(() =>
  (wallet.unlockedWallets.value as { address: string }[]).map((w) => w.address)
)

function openPositionDetail(position: LeveragePosition) {
  selectedPosition.value = position
  showDetailModal.value = true
}

function handleModalClose(isOpen: boolean) {
  showDetailModal.value = isOpen
  if (!isOpen) selectedPosition.value = null
}

// Update selected position with fresh data
watch(
  () => props.positions,
  (positions) => {
    const posId = selectedPosition.value?.position_id
    if (!posId) return

    const updated = positions.find((p) => p.position_id === posId)
    if (!updated) return

    selectedPosition.value = updated

    // Auto-close if closed/liquidated
    if (
      showDetailModal.value &&
      (updated.status === 'POSITION_STATUS_CLOSED' ||
        updated.status === 'POSITION_STATUS_LIQUIDATED')
    ) {
      handleModalClose(false)
    }
  },
  { deep: true }
)

const filteredData = computed(() => {
  let data = props.positions.map((p) => ({
    ...p,
    isOwn: unlockedAddresses.value.includes(p.user),
  })) as PositionWithOwnership[]

  if (statusFilter.value !== 'all') {
    data = data.filter((p) => p.status === `POSITION_STATUS_${statusFilter.value.toUpperCase()}`)
  }

  if (userFilter.value === 'mine') {
    data = data.filter((p) => p.isOwn)
  } else if (userFilter.value !== 'all') {
    data = data.filter((p) => p.user === userFilter.value)
  }

  if (healthFilter.value !== 'all') {
    data = data.filter((p) => calculatePositionHealth(p).riskLevel === healthFilter.value)
  }

  return data
})

const columns = createPositionsColumns(openPositionDetail)

const table = useVueTable({
  get data() {
    return filteredData.value
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
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: { pageSize: 25 },
  },
})

const userFilterOptions = computed(() => {
  const wallets = Array.isArray(wallet.localCosmJsWallets?.value)
    ? (wallet.localCosmJsWallets.value as { name: string; address: string }[])
    : []
  const walletOptions = wallets.map((w) => ({
    value: w.address,
    label: `${w.name} ${w.address}`,
  }))
  return [
    { value: 'all', label: 'All Users' },
    { value: 'mine', label: 'My Positions' },
    ...walletOptions,
  ]
})
</script>

<template>
  <div class="h-full flex flex-col gap-3">
    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <Select v-model="statusFilter">
        <SelectTrigger class="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="liquidating">Liquidating</SelectItem>
          <SelectItem value="liquidated">Liquidated</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="userFilter">
        <SelectTrigger class="w-[200px]">
          <SelectValue placeholder="User" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in userFilterOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="healthFilter">
        <SelectTrigger class="w-[160px]">
          <SelectValue placeholder="Health" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Health</SelectItem>
          <SelectItem value="safe">🟢 Safe</SelectItem>
          <SelectItem value="medium">🟡 Medium</SelectItem>
          <SelectItem value="risky">🔴 Risky</SelectItem>
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
              class="hover:bg-accent/50"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-8">
              No positions found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">
          {{ table.getFilteredRowModel().rows.length }} position(s)
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

    <!-- Position Detail Modal -->
    <PositionDetailModal
      v-if="showDetailModal && selectedPosition"
      :key="selectedPosition.position_id"
      :position="selectedPosition"
      :pool-id="poolId || ''"
      :open="showDetailModal"
      @update:open="handleModalClose"
    />
  </div>
</template>
