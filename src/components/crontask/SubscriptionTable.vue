<template>
  <div class="">
    <div class="flex items-center justify-between mb-3">
      <div class="flex gap-2">
        <Button size="sm" :disabled="isLoading" @click="refreshAll">Reload</Button>
      </div>
      <div class="text-sm opacity-70">{{ subscriptions.length }} subscription(s)</div>
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
            <TableHead>expiry</TableHead>
            <TableHead>function</TableHead>
            <TableHead>script</TableHead>
            <TableHead>gas_limit</TableHead>
            <TableHead>gas_fee</TableHead>
            <TableHead>triggers</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(s, idx) in subscriptions" :key="s.subscription_id || idx">
            <TableCell class="font-mono">{{ s.subscription_id }}</TableCell>
            <TableCell>{{ s.status }}</TableCell>
            <TableCell class="font-mono">{{ formatTimestamp(s.expiry_timestamp) }}</TableCell>
            <TableCell class="font-mono">{{ s['function'] }}</TableCell>
            <TableCell class="font-mono">{{ s.script_address }}</TableCell>
            <TableCell class="font-mono">{{ s.task_gas_limit }}</TableCell>
            <TableCell class="font-mono"
              ><span v-if="s.task_gas_fee">{{ formatCoin(s.task_gas_fee) }}</span></TableCell
            >
            <TableCell class="font-mono">{{ s.triger_count }}</TableCell>
            <TableCell class="font-mono">
              <div class="flex gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  :disabled="isActing === s.subscription_id || !isMine(s)"
                  @click="renew(s)"
                  >Renew</Button
                >
                <Button
                  size="xs"
                  variant="destructive"
                  :disabled="isActing === s.subscription_id || !isMine(s)"
                  @click="del(s)"
                  >Delete</Button
                >
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!isLoading && !error && subscriptions.length === 0">
            <TableCell colspan="9" class="text-center opacity-70">No subscriptions</TableCell>
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
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import CrontaskSubscription from '@/orm/models/crontask/Subscription'
import { useWallet } from '@/composables/useWallet'
import { formatCoin, formatTimestamp } from '@/utils/format'

const props = defineProps<{ creator: string }>()

const api = useAxiosRepo(CrontaskSubscription).api()
const repo = useRepo(CrontaskSubscription)
const subscriptions = computed<any[]>(() =>
  (repo.where('creator', props.creator).get() as any[])
    .slice()
    .sort((a, b) => Number(b.expiry_timestamp || 0) - Number(a.expiry_timestamp || 0))
)

const isLoading = ref(false)
const error = ref('')
const nextKey = ref<string | null>(null)
const isLoadingMore = ref(false)
const isActing = ref('')

async function refreshAll() {
  if (!props.creator) return
  isLoading.value = true
  error.value = ''
  try {
    const first = await api.fetchByCreatorInit({
      creator: props.creator,
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
  if (!props.creator) return
  if (!nextKey.value) return
  isLoadingMore.value = true
  error.value = ''
  try {
    const r = await api.fetchByCreatorLoadMore({
      creator: props.creator,
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

const { loadDenomMetadata } = useWallet()
function isMine(s: any): boolean {
  return !!props.creator && s?.creator === props.creator
}

async function renew(s: any) {
  if (!props.creator) return
  isActing.value = s.subscription_id
  try {
    await api.renewSubscription({
      creator: props.creator,
      subscription_id: s.subscription_id,
      wallet: { sendMsg: useWallet().sendMsg },
      gasLimit: 'auto',
    })
  } catch (e: any) {
    console.error(e)
  } finally {
    isActing.value = ''
  }
}

async function del(s: any) {
  if (!props.creator) return
  isActing.value = s.subscription_id
  try {
    await api.deleteSubscription({
      creator: props.creator,
      subscription_id: s.subscription_id,
      wallet: { sendMsg: useWallet().sendMsg },
      gasLimit: 'auto',
    })
  } catch (e: any) {
    console.error(e)
  } finally {
    isActing.value = ''
  }
}

watchEffect(() => {
  if (props.creator) void refreshAll()
})

onMounted(async () => {
  try {
    await loadDenomMetadata()
  } catch (e) {
    console.warn('Failed to load denom metadata:', e)
  }
})
</script>
