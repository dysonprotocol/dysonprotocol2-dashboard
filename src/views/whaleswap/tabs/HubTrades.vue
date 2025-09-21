<template>
  <div class="space-y-3">
    <div class="flex gap-2 items-end">
      <label class="text-sm">
        Taker
        <input v-model="taker" class="input input-sm ml-2" placeholder="address" />
      </label>
      <label class="text-sm">
        Offer ID
        <input v-model="offerId" class="input input-sm ml-2" placeholder="id" />
      </label>
    </div>
    <div class="flex gap-2 items-end">
      <label class="text-sm">
        Pool ID
        <input v-model="poolId" class="input input-sm ml-2" placeholder="id" />
      </label>
      <button class="btn btn-sm" @click="load">Search</button>
    </div>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <ul v-else class="space-y-2">
      <li v-for="t in trades" :key="t.trade_id" class="rounded-md border p-2">
        <RouterLink
          :to="{ name: 'WhaleswapTrade', params: { tradeId: t.trade_id } }"
          class="hover:underline"
        >
          Trade #{{ t.trade_id }} — offer {{ t.offer_id }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'

const taker = ref('')
const offerId = ref('')
const poolId = ref('')
const isLoading = ref(false)
const repo = useAxiosRepo(WhaleswapTrade)
const trades = computed(() => repo.repo().all() as Array<Record<string, any>>)

async function load() {
  isLoading.value = true
  try {
    if (offerId.value) await repo.api().fetchTradesByOffer(offerId.value, { limit: '50' })
    else if (poolId.value) await repo.api().fetchTradesByPool(poolId.value, { limit: '50' })
    else if (taker.value) await repo.api().fetchTradesByTaker(taker.value, { limit: '50' })
    else await repo.api().fetchTradesByTaker('') // no-op to clear
  } finally {
    isLoading.value = false
  }
}

load()
</script>
