<template>
  <h2 class="text-xl font-semibold">
    NFTs — <code>{{ address }}</code>
  </h2>
  <div class="flex gap-2">
    <button class="btn btn-primary" @click="refresh">Refresh</button>
  </div>
  <div>
    <h3 class="font-semibold">nameservice.dys</h3>
    <div class="text-sm opacity-70">
      count: <code>{{ items.length }}</code>
    </div>
    <ul class="list-disc pl-6 text-sm">
      <li v-for="n in items" :key="n.id">
        <span class="font-mono">{{ n.id }}</span>
        <span class="opacity-70"> — {{ n.uri }}</span>
      </li>
      <li v-if="items.length === 0" class="opacity-70">No NFTs</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NftItem from '@/orm/models/nft/NftItem'

const props = defineProps<{ address: string }>()

const repo = useRepo(NftItem)
const items = computed<any[]>(() =>
  (repo.all() as any[]).filter((n) => n.class_id === 'nameservice.dys' && n.owner === props.address)
)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
