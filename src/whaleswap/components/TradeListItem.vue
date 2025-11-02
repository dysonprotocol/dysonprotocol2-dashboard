<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Trade } from '../utils/types'
import {
  formatTradeId,
  formatCoinsPrimary,
  formatTimestamp,
  truncateAddress,
} from '../utils/formatters'

const props = defineProps<{
  trade: Trade
}>()

// Extract IDs from operations
const poolId = computed(() => {
  const op = props.trade.operations?.find((o) => o.swap?.pool_id)
  return op?.swap?.pool_id
})

const offerId = computed(() => {
  const op = props.trade.operations?.find((o) => o.take?.offer_id)
  return op?.take?.offer_id
})

const auctionId = computed(() => {
  const op = props.trade.operations?.find((o) => o.auction?.auction_id)
  return op?.auction?.auction_id
})

const numOps = computed(() => props.trade.operations?.length || 0)
</script>

<template>
  <RouterLink
    :to="{ name: 'WhaleswapTrade', params: { tradeId: trade.trade_id } }"
    class="block rounded-lg border p-3 hover:bg-accent/50 transition-colors"
  >
    <div class="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
      <div class="text-sm font-mono text-muted-foreground">
        #{{ formatTradeId(trade.trade_id) }}
      </div>
      <div class="space-y-1">
        <div class="text-sm">
          <span class="text-muted-foreground">Trader:</span>
          <span class="font-mono ml-1">{{ truncateAddress(trade.trader) }}</span>
        </div>
        <div class="text-xs space-x-2">
          <span class="text-muted-foreground">Sent:</span>
          <span class="font-mono">{{ formatCoinsPrimary(trade.total_sent) }}</span>
          <span class="text-muted-foreground mx-1">→</span>
          <span class="text-muted-foreground">Received:</span>
          <span class="font-mono">{{ formatCoinsPrimary(trade.total_received) }}</span>
        </div>
        <div class="text-xs text-muted-foreground space-x-2">
          <span v-if="numOps > 1">{{ numOps }} ops</span>
          <span v-if="poolId">Pool #{{ poolId }}</span>
          <span v-if="offerId">Offer #{{ offerId }}</span>
          <span v-if="auctionId">Auction #{{ auctionId }}</span>
          <span v-if="trade.note" class="italic">"{{ trade.note }}"</span>
        </div>
      </div>
      <div class="text-xs text-muted-foreground text-right">
        {{ formatTimestamp(trade.timestamp) }}
      </div>
    </div>
  </RouterLink>
</template>
