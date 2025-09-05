<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { decodeJsonRecursively } from '@/utils/decodeJsonRecursively'
import { useRoute, RouterLink } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'
import { formatTimestamp, formatCoin, formatGasPrice } from '@/utils/format'
import { useWallet } from '@/composables/useWallet'

const route = useRoute()
const taskId = computed(() => String(route.params.taskId || ''))

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)
const { loadDenomMetadata } = useWallet()

onMounted(async () => {
  if (taskId.value) api.fetchByID(taskId.value).catch((e: unknown) => console.error(e))
  try {
    await loadDenomMetadata()
  } catch (e) {
    console.warn('Failed to load denom metadata:', e)
  }
})

const t = computed(
  () =>
    repo.find(taskId.value) as {
      task_id: string
      creator: string
      status: string
      scheduled_timestamp: string
      expiry_timestamp: string
      creation_time: string
      execution_timestamp: string
      creation_block_height?: string
      execution_block_height?: string
      error_log: string
      msgs: unknown[]
      msg_results: unknown[]
      task_gas_limit: string
      task_gas_consumed: string
      task_gas_fee?: { amount?: string; denom?: string }
      task_gas_price?: { amount?: string; denom?: string }
    } | null
)

// formatting helpers imported from utils/format

const msgPairs = computed(() => {
  const arr: Array<{ index: number; msg: unknown; res: unknown }> = []
  const msgs = (t.value?.msgs || []) as unknown[]
  const res = (t.value?.msg_results || []) as unknown[]
  const len = Math.max(msgs.length, res.length)
  for (let i = 0; i < len; i++) arr.push({ index: i, msg: msgs[i], res: res[i] })
  return arr
})

function tryParseErrorJson(raw: string): unknown | null {
  if (!raw) return null
  const cleaned = raw.replace(/(: script execution error)$/, '')
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  try {
    return JSON.parse(cleaned.substring(first, last + 1))
  } catch {
    return null
  }
}

const parsedError = computed(() => tryParseErrorJson(String(t.value?.error_log || '')))

const msgPairsDecoded = computed(() =>
  msgPairs.value.map((p) => ({
    index: p.index,
    msg: decodeJsonRecursively(p.msg),
    res: decodeJsonRecursively(p.res),
  }))
)

const parsedErrorDeep = computed(() => decodeJsonRecursively(parsedError.value))
</script>

<template>
  <div class="p-4 space-y-4 max-w-screen-xl mx-auto">
    <div class="flex items-center justify-between">
      <div class="text-lg font-medium">Task #{{ taskId }}</div>
      <RouterLink class="link" :to="{ name: 'TaskManager' }">Back to Tasks</RouterLink>
    </div>

    <div v-if="t" class="space-y-3">
      <div class="border rounded p-3 space-y-2">
        <div class="text-sm">
          <span class="opacity-70">Creator:</span> <span class="font-mono">{{ t.creator }}</span>
        </div>
        <div class="text-sm"><span class="opacity-70">Status:</span> {{ t.status }}</div>
        <div class="text-sm">
          <span class="opacity-70">Created:</span>
          <span class="font-mono">{{ formatTimestamp(t.creation_time) }}</span>
        </div>
        <div class="text-sm" v-if="t.creation_block_height">
          <span class="opacity-70">Creation block:</span>
          <RouterLink
            class="link font-mono"
            :to="{ name: 'BlockDetail', params: { height: t.creation_block_height } }"
          >
            #{{ t.creation_block_height }}
          </RouterLink>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Scheduled:</span>
          <span class="font-mono">{{ formatTimestamp(t.scheduled_timestamp) }}</span>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Expiry:</span>
          <span class="font-mono">{{ formatTimestamp(t.expiry_timestamp) }}</span>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Executed:</span>
          <span class="font-mono">{{ formatTimestamp(t.execution_timestamp) }}</span>
        </div>
        <div class="text-sm" v-if="t.execution_block_height">
          <span class="opacity-70">Execution block:</span>
          <RouterLink
            class="link font-mono"
            :to="{ name: 'BlockDetail', params: { height: t.execution_block_height } }"
          >
            #{{ t.execution_block_height }}
          </RouterLink>
        </div>
      </div>

      <div class="border rounded p-3 space-y-2">
        <div class="text-sm">
          <span class="opacity-70">Gas limit:</span>
          <span class="font-mono">{{ t.task_gas_limit }}</span>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Gas consumed:</span>
          <span class="font-mono">{{ t.task_gas_consumed }}</span>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Gas fee:</span>
          <span class="font-mono">{{ formatCoin(t.task_gas_fee) }}</span>
        </div>
        <div class="text-sm">
          <span class="opacity-70">Gas price:</span>
          <span class="font-mono">{{ formatGasPrice(t) }}</span>
          <span v-if="t.task_gas_price" class="opacity-70"
            >(raw: {{ formatCoin(t.task_gas_price) }})</span
          >
        </div>
      </div>
    </div>

    <div v-if="t?.error_log" class="border rounded p-3 bg-base-200">
      <div class="text-sm font-medium text-error">Error</div>
      <pre class="text-xs whitespace-pre-wrap break-words">{{ t.error_log }}</pre>
      <div v-if="parsedError" class="mt-2">
        <div class="text-sm font-medium">Parsed error</div>
        <pre class="text-xs overflow-auto">{{ JSON.stringify(parsedErrorDeep, null, 2) }}</pre>
      </div>
    </div>

    <div v-if="t" class="border rounded p-3">
      <div class="text-sm font-medium mb-2">Messages & Results ({{ msgPairsDecoded.length }})</div>
      <div class="alert alert-soft mb-2">
        <div class="flex items-center gap-2">
          <div class="text-xs">
            <span class="font-medium">Note:</span>
            <span class="opacity-70"
              >Messages and results are decoded recursively to JSON and what is displayed may differ
              from the raw API response.</span
            >
          </div>
        </div>
      </div>
      <ul class="text-xs space-y-2">
        <li v-for="p in msgPairsDecoded" :key="p.index" class="p-2 rounded bg-base-200">
          <div class="text-[11px] opacity-70 mb-1">#{{ p.index }}</div>
          <div class="mb-1">
            <span class="opacity-70">msg @type:</span>
            <code class="font-mono">{{
              (p.msg as any)?.['@type'] || (p.msg as any)?.type_url || 'unknown'
            }}</code>
          </div>
          <pre class="overflow-auto">{{ JSON.stringify(p.msg ?? {}, null, 2) }}</pre>
          <div class="mt-2 mb-1">
            <span class="opacity-70">result @type:</span>
            <code class="font-mono">{{
              (p.res as any)?.['@type'] || (p.res as any)?.type_url || 'unknown'
            }}</code>
          </div>
          <pre class="overflow-auto">{{ JSON.stringify(p.res ?? {}, null, 2) }}</pre>
        </li>
        <li v-if="msgPairsDecoded.length === 0" class="opacity-70">No messages</li>
      </ul>
    </div>

    <div v-else class="opacity-70">Loading…</div>
  </div>
</template>
