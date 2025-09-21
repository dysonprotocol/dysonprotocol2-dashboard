<template>
  <div class="p-4 space-y-2">
    <h2 class="text-xl font-semibold">Trade #{{ tradeId }}</h2>
    <pre class="text-xs overflow-auto">{{ JSON.stringify(trade, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'

const route = useRoute()
const tradeId = computed(() => String(route.params.tradeId || ''))
const api = useAxiosRepo(WhaleswapTrade).api()
const repo = useAxiosRepo(WhaleswapTrade).repo()
const trade = computed(() => repo.find(tradeId.value) || {})

onMounted(() => {
  if (tradeId.value) api.fetchTrade(tradeId.value)
})
</script>
