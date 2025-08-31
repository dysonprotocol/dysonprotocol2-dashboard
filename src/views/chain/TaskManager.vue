<script setup lang="ts">
import { ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)

const nextKey = ref<string | undefined>()
const isLoading = ref(false)
const loadError = ref('')

async function init() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await api.fetchAllInit({ limit: '25' })
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
    const res = await api.fetchAllLoadMore({ next_key: nextKey.value, limit: '25' })
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
  <div class="p-4 space-y-3">
    <div class="text-lg font-medium">Tasks</div>
    <div v-if="loadError" class="text-red-600 text-sm">{{ loadError }}</div>
    <div class="border rounded divide-y">
      <div
        v-for="t in repo.all() as Array<{ task_id: string; status: string; creator: string }>"
        :key="t.task_id"
        class="p-3 flex items-center justify-between hover:bg-gray-50"
      >
        <RouterLink :to="{ name: 'TaskDetails', params: { taskId: t.task_id } }"
          >#{{ t.task_id }}</RouterLink
        >
        <div class="text-xs text-gray-500">{{ t.status }}</div>
      </div>
    </div>
    <div class="pt-2">
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
