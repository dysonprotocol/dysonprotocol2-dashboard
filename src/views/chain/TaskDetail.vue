<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'

const route = useRoute()
const taskId = computed(() => String(route.params.taskId || ''))

const api = useAxiosRepo(CrontaskTask).api()
const repo = useRepo(CrontaskTask)

onMounted(() => {
  if (taskId.value) api.fetchByID(taskId.value).catch((e: unknown) => console.error(e))
})

const t = computed(
  () =>
    repo.find(taskId.value) as {
      task_id: string
      creator: string
      status: string
      scheduled_timestamp: string
      execution_timestamp: string
      error_log: string
      msgs: unknown[]
      msg_results: unknown[]
    } | null
)
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="text-lg font-medium">Task #{{ taskId }}</div>
    <div v-if="t" class="border rounded p-3 space-y-2">
      <div class="text-sm"><span class="text-gray-500">Creator:</span> {{ t.creator }}</div>
      <div class="text-sm"><span class="text-gray-500">Status:</span> {{ t.status }}</div>
      <div class="text-sm">
        <span class="text-gray-500">Scheduled:</span> {{ t.scheduled_timestamp }}
      </div>
      <div class="text-sm">
        <span class="text-gray-500">Executed:</span> {{ t.execution_timestamp }}
      </div>
      <div class="text-sm whitespace-pre-wrap break-words" v-if="t.error_log">
        <span class="text-gray-500">Error:</span> {{ t.error_log }}
      </div>
    </div>
  </div>
</template>
