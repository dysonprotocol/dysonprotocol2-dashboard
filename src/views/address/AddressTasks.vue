<template>
  <div class="p-4 max-w-screen-xl mx-auto">
    <h2 class="text-xl font-bold mb-2">Crontasks</h2>
    <p class="text-sm text-gray-600 mb-4">Address: {{ address }}</p>
    <div>
      <!-- Create subscription -->
      <SubscriptionForm :creator="address" />

      <hr class="my-4" />
      <!-- List subscriptions by creator -->
      <SubscriptionTable :creator="address" />
      <hr class="my-4" />
      <!-- Create/schedule a task -->
      <div class="">
        <h3 class="font-semibold mb-3">Create task</h3>
        <form class="grid gap-3" @submit.prevent="onCreate">
          <div class="flex flex-col-2 gap-4">
            <!-- Left column: stacked fieldset with inputs -->
            <fieldset class="fieldset border-base-300 rounded-box max-w-md border p-4">
              <legend class="fieldset-legend">Task parameters</legend>

              <label class="label">scheduled_timestamp</label>
              <Input
                v-model.trim="form.scheduled"
                type="text"
                class="w-full"
                placeholder="e.g. +1h30m or 1736467200"
              />

              <label class="label">expiry_timestamp</label>
              <Input
                v-model.trim="form.expiry"
                type="text"
                class="w-full"
                placeholder="optional, e.g. +2h"
              />

              <label class="label">task_gas_limit</label>
              <Input
                v-model.trim="form.gasLimit"
                type="text"
                class="w-full"
                placeholder="e.g. 500000"
              />

              <label class="label">task_gas_fee</label>
              <div class="grid gap-2">
                <AmountDenomSelector
                  v-model:base="form.feeBase"
                  :base-denoms="['udys']"
                  default-base-denom="udys"
                />
              </div>

              <label class="label">tx memo (optional)</label>
              <Input v-model.trim="form.memo" type="text" class="w-full" placeholder="" />

              <div class="flex items-center gap-2 pt-2">
                <Button size="sm" type="submit" :disabled="isCreating">{{
                  isCreating ? 'Creating…' : 'Create Task'
                }}</Button>
                <span v-if="createError" class="text-error text-sm">{{ createError }}</span>
                <span v-if="createOk" class="text-success text-sm">Created</span>
              </div>
            </fieldset>

            <!-- Right column: textarea -->
            <div class="flex-1 min-w-0">
              <span class="font-medium">Message(s) (raw JSON including @type)</span>
              <Textarea
                ref="msgTextarea"
                v-model="form.rawMsg"
                class="w-full max-w-full font-mono resize-y"
                rows="10"
                placeholder='{"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"...","to_address":"...","amount":[{"denom":"udys","amount":"1"}]}'
              />
              <span class="text-xs opacity-70"
                >Provide the full message JSON(s) as sent to including "@type".</span
              >
            </div>
          </div>
        </form>
      </div>

      <hr class="my-4" />
      <!-- List tasks by creator -->
      <div class="">
        <div class="flex items-center justify-between mb-3">
          <div class="flex gap-2 items-end">
            <Button size="sm" :disabled="isLoading" @click="refreshAll">Reload</Button>
          </div>
          <div class="text-sm opacity-70">{{ tasks.length }} task(s)</div>
        </div>

        <div class="text-sm mb-2">
          <span v-if="error" class="text-error">{{ error }}</span>
          <span v-else-if="isLoading">Loading…</span>
        </div>

        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>id</TableHead>
                <TableHead>status</TableHead>
                <TableHead>scheduled</TableHead>
                <TableHead>expiry</TableHead>
                <TableHead>gas_limit</TableHead>
                <TableHead>gas_fee</TableHead>
                <TableHead>gas_price</TableHead>
                <TableHead>created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="t in tasks" :key="t.task_id">
                <TableCell class="font-mono">
                  <Button as-child variant="link" class="px-0">
                    <RouterLink :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }">
                      {{ t.task_id }}
                    </RouterLink>
                  </Button>
                </TableCell>
                <TableCell>{{ t.status }}</TableCell>
                <TableCell class="font-mono">{{
                  formatTimestamp(t.scheduled_timestamp)
                }}</TableCell>
                <TableCell class="font-mono">{{ formatTimestamp(t.expiry_timestamp) }}</TableCell>
                <TableCell class="font-mono">{{ t.task_gas_limit }}</TableCell>
                <TableCell class="font-mono"
                  ><span v-if="t.task_gas_fee">{{ formatCoin(t.task_gas_fee) }}</span></TableCell
                >
                <TableCell class="font-mono">{{ formatGasPrice(t) }}</TableCell>
                <TableCell class="font-mono">{{ formatTimestamp(t.creation_time) }}</TableCell>
              </TableRow>
              <TableRow v-if="!isLoading && !error && tasks.length === 0">
                <TableCell colspan="8" class="text-center opacity-70">No tasks</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div class="mt-3 flex justify-center">
          <Button
            v-if="nextKey && !error"
            size="sm"
            :disabled="isLoading || isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? 'Loading…' : 'Load more' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import CrontaskTask from '@/orm/models/crontask/Task'
import { useWallet } from '@/composables/useWallet'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import { formatGasPrice } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import SubscriptionForm from '@/components/crontask/SubscriptionForm.vue'
import SubscriptionTable from '@/components/crontask/SubscriptionTable.vue'

const props = defineProps<{ address: string }>()

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask) as any
const tasks = computed<any[]>(() =>
  (repo.where('creator', props.address).get() as any[])
    .slice()
    .sort((a, b) => Number(b.creation_time || 0) - Number(a.creation_time || 0))
)

const isLoading = ref(false)
const error = ref('')
const nextKey = ref<string | null>(null)
const isLoadingMore = ref(false)

async function refreshAll() {
  if (!props.address) return
  isLoading.value = true
  error.value = ''
  try {
    const first = await api.fetchByCreatorInit({
      creator: props.address,
      limit: '20',
      reverse: true,
    })
    nextKey.value = first?.next_key || null
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (!props.address) return
  if (!nextKey.value) return
  isLoadingMore.value = true
  error.value = ''
  try {
    const r = await api.fetchByCreatorLoadMore({
      creator: props.address,
      next_key: nextKey.value,
      limit: '20',
      reverse: true,
    })
    nextKey.value = r?.next_key || null
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isLoadingMore.value = false
  }
}

watchEffect(() => {
  if (props.address) void refreshAll()
})

// Create task
const { sendMsg, loadDenomMetadata } = useWallet()
const form = ref({
  scheduled: '+10s',
  expiry: '',
  gasLimit: '500000',
  feeBase: { amount: '0', denom: 'udys' },
  memo: '',
  rawMsg: '',
})
const isCreating = ref(false)
const createError = ref('')
const createOk = ref(false)

async function onCreate() {
  if (!props.address) return
  isCreating.value = true
  createError.value = ''
  createOk.value = false
  try {
    const raw = String(form.value.rawMsg || '').trim()
    if (!raw) throw new Error('Message JSON is required')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Invalid JSON in message')
    }
    const msgs = Array.isArray(parsed) ? (parsed as unknown[]) : [parsed]
    const res = await api.createTask({
      creator: props.address,
      scheduled_timestamp: String(form.value.scheduled || '+1h'),
      expiry_timestamp: String(form.value.expiry || ''),
      task_gas_limit: String(form.value.gasLimit || '500000'),
      task_gas_fee: {
        amount: String(form.value.feeBase?.amount || '0'),
        denom: String(form.value.feeBase?.denom || 'udys'),
      },
      msgs,
      wallet: { sendMsg },
      gasLimit: 'auto',
      memo: form.value.memo,
    })
    if (!res?.success) throw new Error('Broadcast failed')
    createOk.value = true
    await refreshAll()
  } catch (e: any) {
    console.error(e)
    createError.value = e?.message || String(e)
  } finally {
    isCreating.value = false
  }
}

// Autosize for raw message textarea
const rawMsg = computed({
  get: () => form.value.rawMsg,
  set: (v: string) => (form.value.rawMsg = v),
})
const { textarea: msgTextarea } = useTextareaAutosize({ input: rawMsg })

// Formatting helpers
function parseMaybeUnixSecondsOrDate(v: string): Date | null {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  // If relative format like "+1h", show as-is (no conversion)
  if (s.startsWith('+')) return null
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) {
    // Heuristic: <= 10 digits -> seconds, else milliseconds
    const ms = s.length <= 10 ? n * 1000 : n
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function formatTimestamp(v: string): string {
  const d = parseMaybeUnixSecondsOrDate(v)
  if (!d) return v || ''
  return d.toLocaleString()
}

function formatCoin(c?: { amount?: string; denom?: string } | null): string {
  const amount = String(c?.amount || '0')
  const denom = String(c?.denom || 'udys')
  const norm = DenomMetadata.normalize({ amount, denom })
  return `${norm.display.amount} ${norm.display.denom}`
}

// Ensure denom metadata is available for normalization
onMounted(async () => {
  try {
    await loadDenomMetadata()
  } catch (e) {
    console.warn('Failed to load denom metadata:', e)
  }
})
</script>
