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
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tab = computed(() => String((route.query.tab as string) || 'offers'))

const Tabs: Record<string, any> = {
  offers: defineAsyncComponent(() => import('./tabs/HubOffers.vue')),
  pools: defineAsyncComponent(() => import('./tabs/HubPools.vue')),
  auctions: defineAsyncComponent(() => import('./tabs/HubAuctions.vue')),
  trades: defineAsyncComponent(() => import('./tabs/HubTrades.vue')),
}

const activeComponent = computed(() => Tabs[tab.value] || Tabs.offers)
</script>
