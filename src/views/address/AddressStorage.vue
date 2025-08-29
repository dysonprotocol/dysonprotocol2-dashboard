<template>
  <h2 class="text-xl font-semibold">
    Storage — <code>{{ address }}</code>
  </h2>
  <div class="grid gap-2 md:grid-cols-3">
    <input v-model="prefix" class="input w-full" placeholder="index_prefix" />
    <input v-model="filter" class="input w-full" placeholder="filter (optional)" />
    <input v-model="extract" class="input w-full" placeholder="extract (optional)" />
  </div>
  <div class="flex gap-2">
    <button class="btn btn-primary" @click="initList">Init</button>
    <button class="btn" @click="loadMore">Load More</button>
  </div>
  <div class="text-sm opacity-70">
    count: <code>{{ entries.length }}</code>
  </div>
  <ul class="list-disc pl-6 text-sm">
    <li v-for="e in entries" :key="e.index + ':' + e.extract">
      <span class="font-mono">{{ e.index }}</span>
      <span class="opacity-70"> — {{ e.data }}</span>
    </li>
    <li v-if="entries.length === 0" class="opacity-70">No entries</li>
  </ul>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Storage from '@/orm/models/storage/Storage'

const props = defineProps<{ address: string }>()

const repo = useRepo(Storage)
const prefix = ref('')
const filter = ref('')
const extract = ref('')
const nextKey = ref<string | undefined>(undefined)

const entries = computed<any[]>(() =>
  (repo.all() as any[]).filter((e) => e.owner === props.address)
)

async function doList(loadMore: boolean) {
  if (!props.address || !prefix.value.trim()) return
  const res = await useAxiosRepo(Storage)
    .api()
    .storageList({
      owner: props.address,
      index_prefix: prefix.value,
      filter: filter.value || undefined,
      extract: extract.value || undefined,
      next_key: loadMore ? nextKey.value : undefined,
      limit: '50',
    })
  nextKey.value = res.next_key
}

async function initList() {
  await doList(false)
}
async function loadMore() {
  await doList(true)
}
</script>
