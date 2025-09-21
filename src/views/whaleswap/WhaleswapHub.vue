<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-semibold">Whaleswap</h1>
    <div class="flex gap-2 flex-wrap text-sm">
      <RouterLink :to="{ query: { tab: 'offers' } }" class="underline">Offers</RouterLink>
      <RouterLink :to="{ query: { tab: 'pools' } }" class="underline">Pools</RouterLink>
      <RouterLink :to="{ query: { tab: 'auctions' } }" class="underline">Auctions</RouterLink>
      <RouterLink :to="{ query: { tab: 'trades' } }" class="underline">Trades</RouterLink>
    </div>
    <component :is="activeComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tab = computed(() => String((route.query.tab as string) || 'offers'))

const activeComponent = computed(() => {
  if (tab.value === 'pools') return () => import('./tabs/HubPools.vue')
  if (tab.value === 'auctions') return () => import('./tabs/HubAuctions.vue')
  if (tab.value === 'trades') return () => import('./tabs/HubTrades.vue')
  return () => import('./tabs/HubOffers.vue')
})
</script>
