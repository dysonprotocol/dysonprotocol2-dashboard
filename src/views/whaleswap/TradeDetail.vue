<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWhaleswapTrade } from '@/whaleswap/composables/useWhaleswapTrades'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  formatCoins,
  formatTimestamp,
  formatTradeId,
  formatCoin,
  getDisplayDenom,
} from '@/whaleswap/utils/formatters'

const route = useRoute()
const tradeId = computed(() => String(route.params.tradeId || ''))
const { data, isLoading, error } = useWhaleswapTrade(tradeId)
const trade = computed(() => data.value?.trade)
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-2xl font-semibold">Trade #{{ tradeId }}</h2>

    <Card v-if="isLoading">
      <CardContent class="p-4">
        <div class="text-center py-8 text-muted-foreground">Loading trade...</div>
      </CardContent>
    </Card>

    <Card v-else-if="error">
      <CardContent class="p-4">
        <div class="text-center py-8 text-destructive">Error: {{ error.message }}</div>
      </CardContent>
    </Card>

    <Card v-else-if="!trade">
      <CardContent class="p-4">
        <div class="text-center py-8 text-muted-foreground">Trade not found</div>
      </CardContent>
    </Card>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <div class="text-muted-foreground">Trade ID:</div>
            <div class="font-mono">{{ formatTradeId(trade.trade_id) }}</div>

            <div class="text-muted-foreground">Trader:</div>
            <div class="font-mono">{{ trade.trader }}</div>

            <div class="text-muted-foreground">Height:</div>
            <div class="font-mono">{{ trade.height }}</div>

            <div class="text-muted-foreground">Timestamp:</div>
            <div>{{ formatTimestamp(trade.timestamp) }}</div>

            <div class="text-muted-foreground">Total Sent:</div>
            <div class="font-mono">{{ formatCoins(trade.total_sent) }}</div>

            <div class="text-muted-foreground">Total Received:</div>
            <div class="font-mono">{{ formatCoins(trade.total_received) }}</div>

            <div class="text-muted-foreground">Operations:</div>
            <div class="font-mono">{{ trade.operations?.length || 0 }}</div>

            <div v-if="trade.note" class="text-muted-foreground">Note:</div>
            <div v-if="trade.note" class="italic">{{ trade.note }}</div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="trade.operations && trade.operations.length > 0">
        <CardHeader>
          <CardTitle>Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="text-left p-2 font-semibold text-muted-foreground">#</th>
                  <th class="text-left p-2 font-semibold text-muted-foreground">Type</th>
                  <th class="text-left p-2 font-semibold text-muted-foreground">Sent</th>
                  <th class="text-left p-2 font-semibold text-muted-foreground">Received</th>
                  <th class="text-right p-2 font-semibold text-muted-foreground">Price (R/S)</th>
                  <th class="text-right p-2 font-semibold text-muted-foreground">Price (S/R)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(op, idx) in trade.operations" :key="idx" class="border-b last:border-0">
                  <td class="p-2 font-mono text-muted-foreground">{{ idx + 1 }}</td>
                  <td class="p-2">
                    <div v-if="op.swap" class="space-y-1">
                      <div class="font-medium">Pool Swap</div>
                      <div class="text-xs text-muted-foreground">Pool #{{ op.swap.pool_id }}</div>
                    </div>
                    <div v-else-if="op.take" class="space-y-1">
                      <div class="font-medium">Offer Take</div>
                      <div class="text-xs text-muted-foreground">Offer #{{ op.take.offer_id }}</div>
                    </div>
                    <div v-else-if="op.auction" class="space-y-1">
                      <div class="font-medium">Auction Redeem</div>
                      <div class="text-xs text-muted-foreground">
                        Auction #{{ op.auction.auction_id }}
                      </div>
                    </div>
                  </td>
                  <td class="p-2 font-mono">{{ formatCoin(op.sent) }}</td>
                  <td class="p-2 font-mono">{{ formatCoin(op.received) }}</td>
                  <td class="p-2 font-mono text-right">
                    <div>
                      {{ (parseFloat(op.received.amount) / parseFloat(op.sent.amount)).toFixed(6) }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ getDisplayDenom(op.received.denom) }}/{{ getDisplayDenom(op.sent.denom) }}
                    </div>
                  </td>
                  <td class="p-2 font-mono text-right">
                    <div>
                      {{ (parseFloat(op.sent.amount) / parseFloat(op.received.amount)).toFixed(6) }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ getDisplayDenom(op.sent.denom) }}/{{ getDisplayDenom(op.received.denom) }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
