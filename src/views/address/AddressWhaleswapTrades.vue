<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Trades by {{ address }}</h2>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <div v-else>
      <div v-if="trades.length === 0" class="text-sm">No trades.</div>
      <ul v-else class="space-y-2">
        <li v-for="t in trades" :key="t.trade_id" class="rounded-md border p-2">
          <RouterLink
            :to="{ name: 'WhaleswapTrade', params: { tradeId: t.trade_id } }"
            class="hover:underline"
          >
            Trade #{{ t.trade_id }} — offer {{ t.offer_id }}
          </RouterLink>
          <div class="text-xs text-muted-foreground">
            sent {{ t.sent?.amount }} {{ t.sent?.denom }} → received {{ t.received?.amount }}
            {{ t.received?.denom }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'

const route = useRoute()
const address = computed(() => String(route.params.address || ''))
const isLoading = ref(false)

const tradeApi = useAxiosRepo(WhaleswapTrade).api()
const tradeRepo = useRepo(WhaleswapTrade)
const trades = computed(() =>
  (tradeRepo.all() as Array<Record<string, any>>).filter((t) => t.taker === address.value)
)

async function load() {
  if (!address.value) return
  isLoading.value = true
  try {
    await tradeApi.fetchTradesByTaker(address.value, { limit: '50' })
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => address.value, load)
</script>
