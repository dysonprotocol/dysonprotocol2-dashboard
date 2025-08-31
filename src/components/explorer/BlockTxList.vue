<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import TxRecord from '@/orm/models/tx/TxRecord'

const props = defineProps<{ height: string }>()
const repo = useRepo(TxRecord)
const api = useAxiosRepo(TxRecord).api()

const nextKey = ref<string | undefined>()
const isLoading = ref(false)
const loadError = ref('')

const rows = computed(
  () =>
    repo.where('height', (x: string) => x === props.height).get() as Array<{
      hash: string
      height: string
      timestamp: string
      code: string
      tx_response?: { code?: string; gas_used?: string; gas_wanted?: string }
      tx?: { body?: { messages?: Array<{ ['@type']?: string }> } }
    }>
)

async function init() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await api.searchInit({ query: `tx.height=${props.height}`, limit: '50' })
    nextKey.value = res.next_key
  } catch (e) {
    loadError.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (!nextKey.value || isLoading.value) return
  isLoading.value = true
  try {
    const res = await api.searchLoadMore({
      query: `tx.height=${props.height}`,
      next_key: nextKey.value,
      limit: '50',
    })
    nextKey.value = res.next_key
  } catch (e) {
    loadError.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

init()
</script>

<template>
  <div class="space-y-2">
    <div v-if="loadError" class="alert alert-error">{{ loadError }}</div>
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Hash</th>
            <th>Type</th>
            <th>Code</th>
            <th>Gas</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.hash">
            <td class="font-mono">
              <RouterLink :to="{ name: 'TransactionDetails', params: { hash: t.hash } }">{{
                t.hash
              }}</RouterLink>
            </td>
            <td class="text-xs">
              {{ (t.tx?.body?.messages?.[0]?.['@type'] as string) || '' }}
            </td>
            <td
              class="text-xs"
              :class="(t.tx_response?.code || t.code) === '0' ? 'text-green-600' : 'text-red-600'"
            >
              {{ (t.tx_response?.code || t.code) === '0' ? 'OK' : t.tx_response?.code || t.code }}
            </td>
            <td class="text-xs">
              {{ t.tx_response?.gas_used || '0' }}/{{ t.tx_response?.gas_wanted || '0' }}
            </td>
            <td class="text-xs">{{ t.timestamp }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pt-2">
      <button class="btn btn-sm" :disabled="!nextKey" @click="loadMore">Load more</button>
    </div>
  </div>
</template>
