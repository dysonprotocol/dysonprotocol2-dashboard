<template>
  <div class="space-y-3">
    <div class="flex gap-2 items-end">
      <label class="text-sm"
        >Sell <Input v-model="sell" class="ml-2 w-48" placeholder="denom"
      /></label>
      <label class="text-sm"
        >Bid <Input v-model="bid" class="ml-2 w-48" placeholder="denom"
      /></label>
      <Button @click="load">Search</Button>
    </div>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <ul v-else class="space-y-2">
      <li v-for="a in auctions" :key="a.auction_id" class="rounded-md border p-2">
        <RouterLink
          :to="{ name: 'WhaleswapAuction', params: { auctionId: a.auction_id } }"
          class="hover:underline"
        >
          Auction #{{ a.auction_id }} — {{ a.sell?.amount }} {{ a.sell?.denom }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const sell = ref('')
const bid = ref('')
const isLoading = ref(false)
const auctionApi = useAxiosRepo(WhaleswapAuction).api()
const auctionRepo = useRepo(WhaleswapAuction)
const auctions = computed(() => auctionRepo.all() as Array<Record<string, any>>)

async function load() {
  isLoading.value = true
  try {
    await auctionApi.fetchAuctions({
      sell_denom: sell.value || undefined,
      bid_denom: bid.value || undefined,
      limit: '50',
    })
  } finally {
    isLoading.value = false
  }
}

load()
</script>
