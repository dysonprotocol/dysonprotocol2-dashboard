<template>
  <h2 class="text-xl font-semibold">
    Tasks — <code>{{ address }}</code>
  </h2>
  <div class="flex gap-2">
    <button class="btn btn-primary" @click="refresh">Refresh</button>
  </div>
  <div class="text-sm opacity-70">
    count: <code>{{ tasks.length }}</code>
  </div>
  <ul class="list-disc pl-6 text-sm">
    <li v-for="t in tasks" :key="t.task_id">
      <span class="font-mono">{{ t.task_id }}</span>
      <span class="opacity-70"> — {{ t.status }}</span>
    </li>
    <li v-if="tasks.length === 0" class="opacity-70">No tasks</li>
  </ul>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import CrontaskTask from '@/orm/models/crontask/Task'

const props = defineProps<{ address: string }>()

const repo = useRepo(CrontaskTask)
const tasks = computed<any[]>(() =>
  (repo.all() as any[]).filter((t) => t.creator === props.address)
)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(CrontaskTask).api().fetchByCreatorInit({ creator: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
