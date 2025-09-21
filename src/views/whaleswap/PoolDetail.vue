<template>
  <div class="p-4 space-y-2">
    <h2 class="text-xl font-semibold">Pool #{{ poolId }}</h2>
    <pre class="text-xs overflow-auto">{{ JSON.stringify(pool, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'

const route = useRoute()
const poolId = computed(() => String(route.params.poolId || ''))
const api = useAxiosRepo(WhaleswapPool).api()
const repo = useAxiosRepo(WhaleswapPool).repo()
const pool = computed(() => repo.find(poolId.value) || {})

onMounted(() => {
  if (poolId.value) api.fetchPool(poolId.value)
})
</script>
