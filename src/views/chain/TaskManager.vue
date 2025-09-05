<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'
import { formatTimestamp, formatCoin, formatGasPrice } from '@/utils/format'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)

// no local numeric helpers needed when server orders results

const state = reactive({ loading: false, error: '' })
const isLoadingAll = ref(false)

// no global list needed; derive per-column lists below

// gas price ordering handled by backend; helper removed

// no client-side ordering; rely on API ordering

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
  ).slice(0, 100)
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
    .slice(0, 100)
)

const doneList = computed(() =>
  (
    repo
      .query()
      .where(
        'status',
        (s: string) =>
          String(s || '')
            .trim()
            .toUpperCase() === 'DONE'
      )
      .get() as Array<any>
  )
    .slice()
    .sort(
      (a, b) => Number(b?.execution_block_height || '0') - Number(a?.execution_block_height || '0')
    )
    .slice(0, 100)
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
          ['SCHEDULED', 'PENDING', 'DONE'].includes(
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
      api.fetchByStatusTimestampInit({ status: 'SCHEDULED', limit: '100', count_total: 'true' }),
      api.fetchByStatusGasPriceInit({ status: 'PENDING', limit: '100', count_total: 'true' }),
      api.fetchByStatusTimestampInit({ status: 'DONE', limit: '100', count_total: 'true' }),
    ])
  } catch (e: any) {
    state.error = e?.message || String(e)
  } finally {
    state.loading = false
    isLoadingAll.value = false
  }
}

function copyId(id: string) {
  if (!id) return // use globalThis for SSR-safety and linter friendliness
  ;(globalThis as any)?.navigator?.clipboard?.writeText(String(id))?.catch(() => {})
}

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
        <div class="px-3 py-2 text-sm font-medium">Scheduled (by timestamp) (100)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>

              <TableHead>created block</TableHead>
              <TableHead>gas_price</TableHead>
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
                  >#{{ t.creation_block_height }}</RouterLink
                ></TableCell
              >

              <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
            </TableRow>
            <TableRow v-if="!state.loading && scheduledList.length === 0">
              <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pending -->
      <div class="overflow-x-auto border rounded">
        <div class="px-3 py-2 text-sm font-medium">Pending (by gas price) (100)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>created block</TableHead>
              <TableHead>gas_price</TableHead>
              <TableHead>priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(t, i) in pendingList" :key="t.task_id">
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
                  >#{{ t.creation_block_height }}</RouterLink
                ></TableCell
              >

              <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
              <TableCell class="font-mono">{{ i }}</TableCell>
            </TableRow>
            <TableRow v-if="!state.loading && pendingList.length === 0">
              <TableCell colspan="9" class="text-center opacity-70">No tasks</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Done -->
      <div class="overflow-x-auto border rounded">
        <div class="px-3 py-2 text-sm font-medium">Done (by block height) (100)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>

              <TableHead>executed block</TableHead>

              <TableHead>gas_price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="t in doneList" :key="t.task_id">
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
                  >#{{ t.execution_block_height }}</RouterLink
                ></TableCell
              >

              <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
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
