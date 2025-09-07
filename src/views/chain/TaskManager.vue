<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'
import { formatGasPrice } from '@/utils/format'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { subscribeAllCrontaskEvents, unwrap } from '@/orm/subscriptions/crontaskEvents'
import LatestBlock from '@/orm/models/base/TendermintService'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import CrontaskMetrics from '@/orm/models/crontask/Metrics'

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)
const latestRepo = useRepo(LatestBlock)
const metricsApi = useAxiosRepo(CrontaskMetrics).api()
const metricsRepo = useRepo(CrontaskMetrics)

const LIST_LIMIT = 100

// no local numeric helpers needed when server orders results

const state = reactive({ loading: false, error: '' })
const isLoadingAll = ref(false)
const latestBlockTimeMs = computed<number | null>(() => {
  try {
    const lb = latestRepo.find('default') as { time?: string } | null
    const t = lb?.time ? toMsLocal(lb.time) : null
    return t
  } catch (e) {
    console.error('[TaskManager] latest block lookup error', e)
    return null
  }
})
const chainNowMs = computed<number>(() => {
  const lb = latestBlockTimeMs.value
  return lb != null ? lb : Number.NaN
})

// no global list needed; derive per-column lists below

// gas price ordering handled by backend; helper removed

// no client-side ordering; rely on API ordering

function toMsLocal(value: string): number | null {
  const s = String(value || '').trim()
  if (!s) return null
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) {
    if (n < 1e11) return Math.floor(n * 1000)
    if (n < 1e14) return Math.floor(n)
    if (n < 1e17) return Math.floor(n / 1e3)
    return Math.floor(n / 1e6)
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.getTime()
}

const metrics = computed(() => metricsRepo.find('default') as MetricsView | null)

// removed: formatCoinsShort

const lastPendingUdysPerGas = ref<number | null>(null)
const lastExecutedUdysPerGas = ref<number | null>(null)
const lastPendingFees = ref<Array<{ denom: string; amount: string }>>([])
const lastExecutedFees = ref<Array<{ denom: string; amount: string }>>([])

watch(
  () => {
    const m = metrics.value
    if (!m) return null
    const pendingFees = Array.isArray(m.pending_total_gas_fees)
      ? m.pending_total_gas_fees.map((c) => `${c.denom}:${c.amount}`).join(',')
      : ''
    const executedFees = Array.isArray(m.executed_total_fees)
      ? m.executed_total_fees.map((c) => `${c.denom}:${c.amount}`).join(',')
      : ''
    return [m.pending_gas_requested, pendingFees, m.executed_total_gas, executedFees].join('|')
  },
  () => {
    const m = metrics.value
    if (!m) return
    const gasRequested = Number(m.pending_gas_requested || 0)
    if (Number.isFinite(gasRequested) && gasRequested > 0) {
      const list = Array.isArray(m.pending_total_gas_fees) ? m.pending_total_gas_fees : []
      if (list.length) lastPendingFees.value = list
      const udys = list.find((c) => String(c?.denom || '') === 'udys')
      if (udys) {
        const amount = Number(udys.amount || 0)
        if (Number.isFinite(amount)) lastPendingUdysPerGas.value = amount / gasRequested
      }
    }

    const gasUsed = Number(m.executed_total_gas || 0)
    if (Number.isFinite(gasUsed) && gasUsed > 0) {
      const list = Array.isArray(m.executed_total_fees) ? m.executed_total_fees : []
      if (list.length) lastExecutedFees.value = list
      const udys = list.find((c) => String(c?.denom || '') === 'udys')
      if (udys) {
        const amount = Number(udys.amount || 0)
        if (Number.isFinite(amount)) lastExecutedUdysPerGas.value = amount / gasUsed
      }
    }
  },
  { immediate: true }
)

//

const executedTaskCount = computed<number>(() => Number(metrics.value?.executed_task_count ?? 0))
const executedFees = computed(
  () => (metrics.value?.executed_total_fees ?? []) as Array<{ denom: string; amount: string }>
)
const executedGasUsed = computed<number>(() => Number(metrics.value?.executed_total_gas ?? 0))
const pendingTaskCount = computed<number>(() => Number(metrics.value?.pending_task_count ?? 0))
const pendingOldestText = computed<string>(
  () => formatDeltaShort(metrics.value?.pending_oldest_scheduled_ts ?? '', chainNowMs.value) || ''
)
const pendingFees = computed(
  () => (metrics.value?.pending_total_gas_fees ?? []) as Array<{ denom: string; amount: string }>
)
const pendingGasRequested = computed<number>(() =>
  Number(metrics.value?.pending_gas_requested ?? 0)
)

interface MetricsView {
  executed_total_gas: string
  executed_total_fees: Array<{ denom: string; amount: string }>
  executed_task_count: string
  pending_task_count: string
  pending_gas_requested: string
  pending_oldest_scheduled_ts: string
  pending_total_gas_fees: Array<{ denom: string; amount: string }>
  mode: string
}

function formatDeltaShort(a: unknown, b: unknown): string {
  const am = toMsLocal(String(a ?? ''))
  const bm = toMsLocal(String(b ?? ''))
  if (am == null || bm == null) return ''
  let diff = bm - am
  if (!Number.isFinite(diff)) return ''
  if (diff === 0) return '0s'
  if (diff < 0) return 'now'

  const SEC = 1000
  const MIN = 60 * SEC
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  const parts: string[] = []
  const d = Math.floor(diff / DAY)
  if (d > 0) {
    parts.push(`${d}d`)
    diff -= d * DAY
  }
  const h = Math.floor(diff / HOUR)
  if (h > 0) {
    parts.push(`${h}h`)
    diff -= h * HOUR
  }
  const m = Math.floor(diff / MIN)
  if (m > 0 && parts.length < 2) {
    parts.push(`${m}m`)
    diff -= m * MIN
  }
  const sec = Math.ceil(diff / SEC)
  if (parts.length < 2) parts.push(`${sec}s`)

  return parts.slice(0, 2).join(' ')
}

const DAY_MS = 24 * 60 * 60 * 1000

function bgDone(scheduled: unknown, executed: unknown): Record<string, string> {
  const sm = toMsLocal(String(scheduled ?? ''))
  const em = toMsLocal(String(executed ?? ''))
  if (sm == null || em == null) return {}
  const delay = Math.abs(em - sm)
  const ratio = Math.min(1, Math.max(0, delay / DAY_MS))
  const a = (ratio * 0.25).toFixed(3)
  return { backgroundColor: `rgba(255, 255, 0, ${a})` }
}

function bgExpiry(scheduled: unknown, expiry: unknown, now: number): Record<string, string> {
  if (!Number.isFinite(now)) return {}
  const sm = toMsLocal(String(scheduled ?? ''))
  const xm = toMsLocal(String(expiry ?? ''))
  if (sm == null || xm == null) return {}
  const total = Math.max(0, xm - sm)
  const remaining = Math.max(0, xm - now)
  if (total <= 0) return { backgroundColor: 'rgba(255, 192, 203, 0.250)' }
  const ratioLeft = Math.min(1, Math.max(0, remaining / total))
  const intensity = 1 - ratioLeft
  const a = (intensity * 0.5).toFixed(3)
  return { backgroundColor: `rgba(255, 192, 203, ${a})` }
}

// selection shared across sections (multi-select)
const selectedIds = ref<Set<string>>(new Set())
const selectedRowStyle = { backgroundColor: 'rgba(59, 130, 246, 0.18)' }
function selectTask(id: unknown) {
  const key = String(id ?? '')
  const next = new Set(selectedIds.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedIds.value = next
}
function isSelectedId(id: unknown): boolean {
  return selectedIds.value.has(String(id ?? ''))
}

const lists = reactive<{ scheduled: Array<any>; pending: Array<any>; done: Array<any> }>({
  scheduled: [],
  pending: [],
  done: [],
})

const allTasks = computed<Array<any>>(
  () =>
    repo
      .query()
      .where('status', (s: string) =>
        ['SCHEDULED', 'PENDING', 'DONE', 'FAILED', 'EXPIRED'].includes(
          String(s || '')
            .trim()
            .toUpperCase()
        )
      )
      .get() as Array<any>
)

watch(
  allTasks,
  (rows) => {
    const scheduled = rows
      .filter((t) => String(t?.status || '').toUpperCase() === 'SCHEDULED')
      .slice()
      .sort((a, b) => Number(a?.scheduled_timestamp || 0) - Number(b?.scheduled_timestamp || 0))
      .slice(0, LIST_LIMIT)

    const pending = rows
      .filter((t) => String(t?.status || '').toUpperCase() === 'PENDING')
      .slice()
      .sort((a, b) => {
        const limA = Number(a?.task_gas_limit || 0)
        const limB = Number(b?.task_gas_limit || 0)
        const feeA = Number(a?.task_gas_fee?.amount || 0)
        const feeB = Number(b?.task_gas_fee?.amount || 0)
        const pa = limA > 0 ? feeA / limA : -Infinity
        const pb = limB > 0 ? feeB / limB : -Infinity
        return pb - pa
      })
      .slice(0, LIST_LIMIT)

    const done = rows
      .filter((t) => ['DONE', 'FAILED', 'EXPIRED'].includes(String(t?.status || '').toUpperCase()))
      .slice()
      .sort(
        (a, b) => Number(b?.execution_block_height || 0) - Number(a?.execution_block_height || 0)
      )
      .slice(0, LIST_LIMIT)

    lists.scheduled = scheduled
    lists.pending = pending
    lists.done = done
  },
  { immediate: true }
)

// Loader: fetch each segment from dedicated endpoints (limit 50)
async function loadAll() {
  isLoadingAll.value = true
  state.loading = true
  state.error = ''
  try {
    // Clear existing subsets to avoid mixing stale rows
    try {
      useRepo(CrontaskTask)
        .query()
        .where('status', (s: string) =>
          ['SCHEDULED', 'PENDING', 'DONE', 'FAILED', 'EXPIRED'].includes(
            String(s || '')
              .trim()
              .toUpperCase()
          )
        )
        .delete()
    } catch (e) {
      console.error(e)
    }
    await Promise.all([
      api.fetchByStatusTimestampInit({ status: 'SCHEDULED', limit: String(LIST_LIMIT) }),
      api.fetchByStatusGasPriceInit({ status: 'PENDING', limit: String(LIST_LIMIT) }),
      api.fetchByStatusTimestampInit({ status: 'DONE', limit: String(LIST_LIMIT) }),
      api.fetchByStatusTimestampInit({ status: 'FAILED', limit: String(LIST_LIMIT) }),
      api.fetchByStatusTimestampInit({ status: 'EXPIRED', limit: String(LIST_LIMIT) }),
    ])
    scheduleMetricsRefresh()
  } catch (e: any) {
    state.error = e?.message || String(e)
  } finally {
    state.loading = false
    isLoadingAll.value = false
  }
}

let unsubscribe: (() => void) | null = null
let pendingRefreshTimer: ReturnType<typeof setTimeout> | null = null
function scheduleMetricsRefresh() {
  if (pendingRefreshTimer) return
  pendingRefreshTimer = setTimeout(() => {
    pendingRefreshTimer = null
    metricsApi
      .fetch()
      .catch((e: unknown) => console.error('[TaskManager] metrics refresh error', e))
  }, 250)
}
onMounted(() => {
  // best-effort prime metrics
  metricsApi.fetch().catch((e: unknown) => console.error('[TaskManager] metrics fetch error', e))
  unsubscribe = subscribeAllCrontaskEvents((name, d) => {
    const id = unwrap((d as { task_id?: unknown })?.task_id)
    if (!id) return
    if (
      name === 'dysonprotocol.crontask.v1.EventTaskDeleted' ||
      name === 'dysonprotocol.crontask.v1.EventTaskPurged'
    ) {
      try {
        repo.delete(id)
      } catch (e) {
        console.error('[TaskManager] delete error', e)
      }
      scheduleMetricsRefresh()
      return
    }
    api.fetchByID(id).catch((e: unknown) => {
      console.error('[TaskManager] refresh error', e)
    })
    scheduleMetricsRefresh()
  })
})
onUnmounted(() => {
  try {
    unsubscribe?.()
  } catch (e) {
    console.error('[TaskManager] unsubscribe error', e)
  }
  if (pendingRefreshTimer) globalThis.clearTimeout(pendingRefreshTimer)
  pendingRefreshTimer = null
  unsubscribe = null
})

// initial load
loadAll()

// viewport-fit height for resizable group
const groupEl = ref<any>(null)
const groupHeightPx = ref(0)
const groupRaf = ref(0)
function updateGroupHeight() {
  const w = globalThis.window as any
  if (!w) return
  const el = groupEl.value as any
  if (!el) return
  const rect = el.getBoundingClientRect()
  const bottomGapPx = 16
  const desired = Math.max(200, Math.floor(w.innerHeight - rect.top - bottomGapPx))
  if (Math.abs(desired - groupHeightPx.value) < 2) return
  const raf = groupRaf.value
  if (raf) w.cancelAnimationFrame(raf)
  groupRaf.value = w.requestAnimationFrame(() => {
    groupHeightPx.value = desired
    groupRaf.value = 0
  })
}
onMounted(() => {
  const w = globalThis.window as any
  if (!w) return
  updateGroupHeight()
  w.addEventListener('resize', updateGroupHeight)
})
onUnmounted(() => {
  const w = globalThis.window as any
  if (!w) return
  const raf = groupRaf.value
  if (raf) w.cancelAnimationFrame(raf)
  w.removeEventListener('resize', updateGroupHeight)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Crontasks</h2>
      <div class="flex items-center gap-2">
        <Button :disabled="isLoadingAll" class="h-9" @click="loadAll">Reload</Button>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border bg-card text-card-foreground shadow">
        <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium">Pending Tasks</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            class="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="p-6 pt-0">
          <div class="text-2xl font-bold">{{ pendingTaskCount }}</div>
          <p class="text-xs text-muted-foreground">oldest: {{ pendingOldestText }}</p>
        </div>
      </div>
      <div class="rounded-xl border bg-card text-card-foreground shadow">
        <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium">udys/gas requested</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            class="h-4 w-4 text-muted-foreground"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="p-6 pt-0">
          <div class="text-2xl font-bold">
            {{ lastPendingUdysPerGas != null ? lastPendingUdysPerGas.toFixed(8) : '0' }}
          </div>
          <p class="text-xs text-muted-foreground">
            <template
              v-if="lastPendingFees.length || (Array.isArray(pendingFees) && pendingFees.length)"
            >
              <template
                v-for="(c, i) in lastPendingFees.length ? lastPendingFees : pendingFees"
                :key="i"
              >
                <span class="font-mono mr-1">{{ c.amount }}{{ c.denom }}</span>
              </template>
              <span class="font-mono">/ {{ pendingGasRequested }} (gas)</span>
            </template>
            <span v-else>—</span>
          </p>
        </div>
      </div>
      <div class="rounded-xl border bg-card text-card-foreground shadow">
        <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium">Executed Tasks</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            class="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="p-6 pt-0">
          <div class="text-2xl font-bold">{{ executedTaskCount }}</div>
          <p class="text-xs text-muted-foreground">Total executed</p>
        </div>
      </div>
      <div class="rounded-xl border bg-card text-card-foreground shadow">
        <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium">udys/gas executed</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            class="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <path d="M2 10h20"></path>
          </svg>
        </div>
        <div class="p-6 pt-0">
          <div class="text-2xl font-bold">
            {{ lastExecutedUdysPerGas != null ? lastExecutedUdysPerGas.toFixed(8) : '0' }}
          </div>
          <p class="text-xs text-muted-foreground">
            <template
              v-if="lastExecutedFees.length || (Array.isArray(executedFees) && executedFees.length)"
            >
              <template
                v-for="(c, i) in lastExecutedFees.length ? lastExecutedFees : executedFees"
                :key="i"
              >
                <span class="font-mono mr-1">{{ c.amount }}{{ c.denom }}</span>
              </template>
              <span class="font-mono">/ {{ executedGasUsed }} (gas)</span>
            </template>
            <span v-else>—</span>
          </p>
        </div>
      </div>
    </div>

    <div class="text-sm min-h-5">
      <span v-if="state.error" class="text-red-600">{{ state.error }}</span>
      <span v-else-if="state.loading">Loading…</span>
    </div>

    <div ref="groupEl" class="min-h-0" :style="{ height: groupHeightPx + 'px' }">
      <ResizablePanelGroup
        direction="horizontal"
        class="gap-3 h-full"
        :auto-save-id="`task-manager:columns`"
      >
        <!-- Scheduled -->
        <ResizablePanel :default-size="33" :min-size="20" :max-size="80">
          <div class="h-full overflow-x-scroll overflow-y-scroll border rounded">
            <div class="px-3 py-2 text-sm font-medium">
              Scheduled (by timestamp) ({{ LIST_LIMIT }})
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>id</TableHead>
                  <TableHead>created </TableHead>
                  <TableHead>udys/gas</TableHead>
                  <TableHead>scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="t in lists.scheduled"
                  :key="t.task_id"
                  :style="isSelectedId(t.task_id) ? selectedRowStyle : {}"
                  @click="selectTask(t.task_id)"
                >
                  <TableCell class="font-mono">
                    <RouterLink
                      class="underline"
                      :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                      >{{ t.task_id }}</RouterLink
                    >
                  </TableCell>

                  <TableCell class="font-mono"
                    ><RouterLink
                      class="underline"
                      :to="{ name: 'BlockDetail', params: { height: t.creation_block_height } }"
                      >{{ t.creation_block_height }}</RouterLink
                    ></TableCell
                  >
                  <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
                  <TableCell class="font-mono">{{
                    formatDeltaShort(chainNowMs, t.scheduled_timestamp)
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="!state.loading && lists.scheduled.length === 0">
                  <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ResizablePanel>

        <ResizableHandle with-handle class="hover:bg-green-500" />

        <!-- Pending -->
        <ResizablePanel :default-size="33" :min-size="20" :max-size="80">
          <div class="h-full overflow-x-scroll overflow-y-scroll border rounded">
            <div class="px-3 py-2 text-sm font-medium">
              Pending (by gas price) ({{ LIST_LIMIT }})
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>id</TableHead>
                  <TableHead>created</TableHead>
                  <TableHead>udys/gas</TableHead>
                  <TableHead>remaining</TableHead>
                  <TableHead>expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="t in lists.pending"
                  :key="t.task_id"
                  :style="
                    isSelectedId(t.task_id)
                      ? selectedRowStyle
                      : bgExpiry(t.scheduled_timestamp, t.expiry_timestamp, chainNowMs)
                  "
                  @click="selectTask(t.task_id)"
                >
                  <TableCell class="font-mono">
                    <RouterLink
                      class="underline"
                      :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                      >{{ t.task_id }}</RouterLink
                    >
                  </TableCell>
                  <TableCell class="font-mono"
                    ><RouterLink
                      class="underline"
                      :to="{ name: 'BlockDetail', params: { height: t.creation_block_height } }"
                      >{{ t.creation_block_height }}</RouterLink
                    ></TableCell
                  >
                  <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
                  <TableCell class="font-mono">{{
                    formatDeltaShort(chainNowMs, t.expiry_timestamp)
                  }}</TableCell>
                  <TableCell class="font-mono">{{
                    formatDeltaShort(t.scheduled_timestamp, t.expiry_timestamp)
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="!state.loading && lists.pending.length === 0">
                  <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ResizablePanel>

        <ResizableHandle with-handle class="hover:bg-green-500" />

        <!-- Done -->
        <ResizablePanel :default-size="34" :min-size="20" :max-size="80">
          <div class="h-full overflow-x-scroll overflow-y-scroll border rounded">
            <div class="px-3 py-2 text-sm font-medium">
              Done (by block height) ({{ LIST_LIMIT }})
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>id</TableHead>
                  <TableHead>done</TableHead>
                  <TableHead>udys/gas</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>delay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="t in lists.done"
                  :key="t.task_id"
                  :style="
                    isSelectedId(t.task_id)
                      ? selectedRowStyle
                      : bgDone(t.scheduled_timestamp, t.execution_timestamp)
                  "
                  @click="selectTask(t.task_id)"
                >
                  <TableCell class="font-mono">
                    <RouterLink
                      class="underline"
                      :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                      >{{ t.task_id }}</RouterLink
                    >
                  </TableCell>
                  <TableCell class="font-mono"
                    ><RouterLink
                      class="underline"
                      :to="{ name: 'BlockDetail', params: { height: t.execution_block_height } }"
                      >{{ t.execution_block_height }}</RouterLink
                    ></TableCell
                  >
                  <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
                  <TableCell class="font-mono">{{ t.status }}</TableCell>
                  <TableCell class="font-mono">{{
                    formatDeltaShort(t.scheduled_timestamp, t.execution_timestamp)
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="!state.loading && lists.done.length === 0">
                  <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </div>
</template>
