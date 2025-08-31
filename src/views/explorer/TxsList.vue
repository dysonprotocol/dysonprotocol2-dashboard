<script setup lang="ts">
import { ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import TxRecord from '@/orm/models/tx/TxRecord'

const repo = useRepo(TxRecord)
const api = useAxiosRepo(TxRecord).api()

const query = ref('')
const nextKey = ref<string | undefined>()
const isLoading = ref(false)
const loadError = ref('')

const rows = () =>
  repo.all() as Array<{
    hash: string
    height: string
    timestamp: string
    code: string
  }>

async function runSearch() {
  if (isLoading.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await api.searchInit({ query: query.value || 'tx.height>0', limit: '25' })
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
      query: query.value || 'tx.height>0',
      next_key: nextKey.value,
      limit: '25',
    })
    nextKey.value = res.next_key
  } catch (e) {
    loadError.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="flex gap-2">
      <input
        v-model="query"
        class="border rounded px-2 py-1 w-full"
        placeholder="Search (e.g., tx.height>0 or message.module='bank')"
      />
      <button class="px-3 py-1.5 border rounded text-sm" @click="runSearch">Search</button>
    </div>
    <div v-if="loadError" class="text-red-600 text-sm">{{ loadError }}</div>
    <div class="border rounded divide-y">
      <div
        v-for="t in rows()"
        :key="t.hash"
        class="p-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div class="space-y-1">
          <RouterLink
            :to="{ name: 'TransactionDetails', params: { hash: t.hash } }"
            class="font-mono"
          >
            {{ t.hash.slice(0, 16) }}…
          </RouterLink>
          <div class="text-xs text-gray-500">Height {{ t.height }} • {{ t.timestamp }}</div>
        </div>
        <div class="text-xs" :class="t.code === '0' ? 'text-green-600' : 'text-red-600'">
          {{ t.code === '0' ? 'OK' : 'ERR ' + t.code }}
        </div>
      </div>
    </div>
    <div class="pt-2 flex gap-2">
      <button class="px-3 py-1.5 border rounded text-sm" @click="runSearch">Refresh</button>
      <button
        class="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
        :disabled="!nextKey"
        @click="loadMore"
      >
        Load more
      </button>
    </div>
  </div>
</template>
