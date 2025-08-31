<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)

function toNumber(x: string | number | undefined): number {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

// Section state
const scheduled = reactive({ loading: false, error: '' })
const pending = reactive({ loading: false, error: '' })
const finished = reactive({ status: 'DONE', loading: false, error: '' })
const isLoadingAll = ref(false)

// Derived lists from repo
const scheduledItems = computed(() =>
  (
    repo.where('status', 'SCHEDULED').get() as Array<{
      task_id: string
      creator: string
      scheduled_timestamp: string
      expiry_timestamp: string
      task_gas_limit: string
      task_gas_fee?: { amount?: string; denom?: string }
    }>
  )
    .slice()
    .sort((a, b) => toNumber(a.scheduled_timestamp) - toNumber(b.scheduled_timestamp))
)

const pendingAll = computed(() =>
  (
    repo.where('status', 'PENDING').get() as Array<{
      task_id: string
      creator: string
      task_gas_price?: { amount?: string; denom?: string }
    }>
  )
    .slice()
    .sort((a, b) => toNumber(b.task_gas_price?.amount) - toNumber(a.task_gas_price?.amount))
)

const finishedItems = computed(() =>
  (
    repo.where('status', finished.status).get() as Array<{
      task_id: string
      status: string
      creation_time: string
      execution_timestamp: string
      task_gas_consumed: string
      error_log: string
    }>
  )
    .slice()
    .sort((a, b) => toNumber(b.execution_timestamp) - toNumber(a.execution_timestamp))
)

// Loader: fetch all tasks into memory (paginate internally)
async function loadAll() {
  isLoadingAll.value = true
  scheduled.loading = true
  pending.loading = true
  finished.loading = true
  scheduled.error = ''
  pending.error = ''
  finished.error = ''
  try {
    const first = await api.fetchAllInit({ limit: '200' })
    let next = first.next_key
    while (next) {
      const res = await api.fetchAllLoadMore({ next_key: next, limit: '200' })
      next = res.next_key
    }
  } catch (e: any) {
    const msg = e?.message || String(e)
    scheduled.error = msg
    pending.error = msg
    finished.error = msg
  } finally {
    scheduled.loading = false
    pending.loading = false
    finished.loading = false
    isLoadingAll.value = false
  }
}

// initial load
loadAll()
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Crontasks</h2>

    <!-- Scheduled (by timestamp) -->
    <div class="bg-base-200 p-4 rounded mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Scheduled (by timestamp)</h3>
        <div class="flex gap-2 items-end">
          <button class="btn btn-sm" :disabled="isLoadingAll" @click="loadAll">Reload</button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="scheduled.error" class="text-error">{{ scheduled.error }}</span>
        <span v-else-if="scheduled.loading">Loading…</span>
        <span v-else class="opacity-70">{{ scheduledItems.length }} task(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>id</th>
              <th>creator</th>
              <th>scheduled</th>
              <th>expiry</th>
              <th>gas_limit</th>
              <th>fee</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in scheduledItems" :key="t.task_id">
              <td class="font-mono">
                <RouterLink
                  class="link"
                  :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                  >{{ t.task_id }}</RouterLink
                >
              </td>
              <td class="font-mono break-all">{{ t.creator }}</td>
              <td class="font-mono">{{ t.scheduled_timestamp }}</td>
              <td class="font-mono">{{ t.expiry_timestamp }}</td>
              <td class="font-mono">{{ t.task_gas_limit }}</td>
              <td class="font-mono">
                <span v-if="t.task_gas_fee"
                  >{{ t.task_gas_fee.amount }} {{ t.task_gas_fee.denom }}</span
                >
              </td>
            </tr>
            <tr v-if="!scheduled.loading && !scheduled.error && scheduledItems.length === 0">
              <td colspan="6" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pending (by gas price) -->
    <div class="bg-base-200 p-4 rounded mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Pending (by gas price)</h3>
        <div class="flex gap-2 items-end">
          <button class="btn btn-sm" :disabled="isLoadingAll" @click="loadAll">Reload</button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="pending.error" class="text-error">{{ pending.error }}</span>
        <span v-else-if="pending.loading">Loading…</span>
        <span v-else class="opacity-70">{{ pendingAll.length }} task(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>id</th>
              <th>creator</th>
              <th>gas_price</th>
              <th>ahead</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in pendingAll" :key="t.task_id">
              <td class="font-mono">{{ i + 1 }}</td>
              <td class="font-mono">
                <RouterLink
                  class="link"
                  :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                  >{{ t.task_id }}</RouterLink
                >
              </td>
              <td class="font-mono break-all">{{ t.creator }}</td>
              <td class="font-mono">
                <span v-if="(t as any).task_gas_price"
                  >{{ (t as any).task_gas_price.amount }}
                  {{ (t as any).task_gas_price.denom }}</span
                >
              </td>
              <td class="font-mono">{{ i }}</td>
            </tr>
            <tr v-if="!pending.loading && !pending.error && pendingAll.length === 0">
              <td colspan="5" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Finished (by timestamp) -->
    <div class="bg-base-200 p-4 rounded">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Finished (by timestamp)</h3>
        <div class="flex gap-2 items-end">
          <label class="form-control">
            <span class="label-text">status</span>
            <select v-model="finished.status" class="select select-bordered select-sm">
              <option value="DONE">DONE</option>
              <option value="FAILED">FAILED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </label>
          <button class="btn btn-sm" :disabled="isLoadingAll" @click="loadAll">Reload</button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="finished.error" class="text-error">{{ finished.error }}</span>
        <span v-else-if="finished.loading">Loading…</span>
        <span v-else class="opacity-70">{{ finishedItems.length }} task(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>id</th>
              <th>status</th>
              <th>created</th>
              <th>executed</th>
              <th>gas_used</th>
              <th>error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in finishedItems" :key="t.task_id">
              <td class="font-mono">
                <RouterLink
                  class="link"
                  :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
                  >{{ t.task_id }}</RouterLink
                >
              </td>
              <td>{{ t.status }}</td>
              <td class="font-mono">{{ t.creation_time }}</td>
              <td class="font-mono">{{ t.execution_timestamp }}</td>
              <td class="font-mono">{{ t.task_gas_consumed }}</td>
              <td class="font-mono break-all">{{ t.error_log }}</td>
            </tr>
            <tr v-if="!finished.loading && !finished.error && finishedItems.length === 0">
              <td colspan="6" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
