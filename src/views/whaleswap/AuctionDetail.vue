<template>
  <div class="p-4 space-y-2">
    <h2 class="text-xl font-semibold">Auction #{{ auctionId }}</h2>
    <pre class="text-xs overflow-auto">{{ JSON.stringify(auction, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'

const route = useRoute()
const auctionId = computed(() => String(route.params.auctionId || ''))
const api = useAxiosRepo(WhaleswapAuction).api()
const repo = useRepo(WhaleswapAuction)
const auction = computed(() => repo.find(auctionId.value) || {})

onMounted(() => {
  if (auctionId.value) api.fetchAuction(auctionId.value)
})
</script>
