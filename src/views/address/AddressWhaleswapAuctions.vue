<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Auctions by {{ address }}</h2>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <div v-else>
      <div v-if="auctions.length === 0" class="text-sm">No auctions.</div>
      <ul v-else class="space-y-2">
        <li v-for="a in auctions" :key="a.auction_id" class="rounded-md border p-2">
          <RouterLink
            :to="{ name: 'WhaleswapAuction', params: { auctionId: a.auction_id } }"
            class="hover:underline"
          >
            Auction #{{ a.auction_id }} — {{ a.sell?.amount }} {{ a.sell?.denom }}
          </RouterLink>
          <div class="text-xs text-muted-foreground">bid denom {{ a.bid_denom }}</div>
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
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'

const route = useRoute()
const address = computed(() => String(route.params.address || ''))
const isLoading = ref(false)

const auctionApi = useAxiosRepo(WhaleswapAuction).api()
const auctionRepo = useRepo(WhaleswapAuction)
const auctions = computed(() =>
  (auctionRepo.all() as Array<Record<string, any>>).filter((a) => a.seller === address.value)
)

async function load() {
  if (!address.value) return
  isLoading.value = true
  try {
    await auctionApi.fetchAuctionsBySeller(address.value, { limit: '50' })
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => address.value, load)
</script>
