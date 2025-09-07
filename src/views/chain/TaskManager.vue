<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
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

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)
const latestRepo = useRepo(LatestBlock)

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

function formatDeltaShort(a: unknown, b: unknown): string {
  const am = toMsLocal(String(a ?? ''))
  const bm = toMsLocal(String(b ?? ''))
  if (am == null || bm == null) return ''
  let diff = Math.abs(bm - am)
  if (!Number.isFinite(diff)) return ''
  if (diff === 0) return '0s'

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

function bgPending(scheduled: unknown, now: number): Record<string, string> {
  if (!Number.isFinite(now)) return {}
  const ms = toMsLocal(String(scheduled ?? ''))
  if (ms == null) return {}
  const waiting = Math.max(0, now - ms)
  const ratio = Math.min(1, Math.max(0, waiting / DAY_MS))
  const a = (ratio * 0.25).toFixed(3)
  return { backgroundColor: `rgba(255, 255, 0, ${a})` }
}

function bgDone(scheduled: unknown, executed: unknown): Record<string, string> {
  const sm = toMsLocal(String(scheduled ?? ''))
  const em = toMsLocal(String(executed ?? ''))
  if (sm == null || em == null) return {}
  const delay = Math.abs(em - sm)
  const ratio = Math.min(1, Math.max(0, delay / DAY_MS))
  const a = (ratio * 0.25).toFixed(3)
  return { backgroundColor: `rgba(255, 255, 0, ${a})` }
}

const scheduledList = computed(() =>
  (
    repo
      .query()
      .where(
        'status',
        (s: string) =>
          String(s || '')
            .trim()
            .toUpperCase() === 'SCHEDULED'
      )
      .get() as Array<any>
  )
    .slice()
    .sort((a, b) => {
      return a.scheduled_timestamp - b.scheduled_timestamp
    })
    .slice(0, LIST_LIMIT)
)

const pendingList = computed(() =>
  (
    repo
      .query()
      .where(
        'status',
        (s: string) =>
          String(s || '')
            .trim()
            .toUpperCase() === 'PENDING'
      )
      .get() as Array<any>
  )
    .slice()
    .sort((a, b) => {
      const limA = Number(a?.task_gas_limit || '0')
      const limB = Number(b?.task_gas_limit || '0')
      const feeA = Number(a?.task_gas_fee?.amount || '0')
      const feeB = Number(b?.task_gas_fee?.amount || '0')
      const pa = limA > 0 ? feeA / limA : -Infinity
      const pb = limB > 0 ? feeB / limB : -Infinity
      return pb - pa
    })
    .slice(0, LIST_LIMIT)
)

const doneList = computed(() =>
  (
    repo
      .query()
      .where('status', (s: string) =>
        ['DONE', 'FAILED', 'EXPIRED'].includes(
          String(s || '')
            .trim()
            .toUpperCase()
        )
      )
      .get() as Array<any>
  )
    .slice()
    .sort(
      (a, b) => Number(b?.execution_block_height || '0') - Number(a?.execution_block_height || '0')
    )
    .slice(0, LIST_LIMIT)
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
  } catch (e: any) {
    state.error = e?.message || String(e)
  } finally {
    state.loading = false
    isLoadingAll.value = false
  }
}

let unsubscribe: (() => void) | null = null
let pendingRefreshTimer: ReturnType<typeof setTimeout> | null = null
onMounted(() => {
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
      return
    }
    api.fetchByID(id).catch((e: unknown) => {
      console.error('[TaskManager] refresh error', e)
    })
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
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Crontasks</h2>
      <div class="flex items-center gap-2">
        <Button :disabled="isLoadingAll" class="h-9" @click="loadAll">Reload</Button>
      </div>
    </div>

    <div class="text-sm min-h-5">
      <span v-if="state.error" class="text-red-600">{{ state.error }}</span>
      <span v-else-if="state.loading">Loading…</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Scheduled -->
      <div class="overflow-x-auto border rounded">
        <div class="px-3 py-2 text-sm font-medium">Scheduled (by timestamp) ({{ LIST_LIMIT }})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>created </TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="t in scheduledList" :key="t.task_id">
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
                formatDeltaShort(t.scheduled_timestamp, chainNowMs)
              }}</TableCell>
            </TableRow>
            <TableRow v-if="!state.loading && scheduledList.length === 0">
              <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pending -->
      <div class="overflow-x-auto border rounded">
        <div class="px-3 py-2 text-sm font-medium">Pending (by gas price) ({{ LIST_LIMIT }})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>created</TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>priority</TableHead>
              <TableHead>waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(t, i) in pendingList"
              :key="t.task_id"
              :style="bgPending(t.scheduled_timestamp, chainNowMs)"
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
              <TableCell class="font-mono">{{ i }}</TableCell>
              <TableCell class="font-mono">{{
                formatDeltaShort(t.scheduled_timestamp, chainNowMs)
              }}</TableCell>
            </TableRow>
            <TableRow v-if="!state.loading && pendingList.length === 0">
              <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Done -->
      <div class="overflow-x-auto border rounded">
        <div class="px-3 py-2 text-sm font-medium">Done (by block height) ({{ LIST_LIMIT }})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>executed</TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>status</TableHead>
              <TableHead>delay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="t in doneList"
              :key="t.task_id"
              :style="bgDone(t.scheduled_timestamp, t.execution_timestamp)"
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
            <TableRow v-if="!state.loading && doneList.length === 0">
              <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>
