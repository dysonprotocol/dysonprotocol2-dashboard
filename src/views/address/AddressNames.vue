<template>
  <div class="">
    <h2 class="text-xl font-semibold">
      Names — <code>{{ address }}</code>
    </h2>
    <div class="flex gap-2">
      <button class="btn btn-primary" @click="refresh">Refresh</button>
    </div>
    <div>
      <h3 class="font-semibold">Names by Destination</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ byDest.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="r in byDest" :key="r.name">
          <span class="font-mono">{{ r.name }}</span>
        </li>
        <li v-if="byDest.length === 0" class="opacity-70">No names</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'

const props = defineProps<{ address: string }>()

const repo = useRepo(NamesByDestination)
const byDest = computed<any[]>(() =>
  (repo.all() as any[]).filter((r) => r.destination === props.address)
)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
