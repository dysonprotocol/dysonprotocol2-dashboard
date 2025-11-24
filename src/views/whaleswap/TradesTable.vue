<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatTradeId,
  formatCoinsPrimary,
  formatTimestamp,
  truncateAddress,
  getDisplayDenom,
} from '@/whaleswap/utils/formatters'
import type { Trade } from '@/whaleswap/utils/types'

const props = defineProps<{
  trades: Trade[]
  poolId: string
  base: string
  quote: string
}>()

const filteredTrades = computed(() => {
  return props.trades.filter((trade) => {
    if (!trade.operations) return false
    return trade.operations.some(
      (op) => op.swap && String(op.swap.pool_id) === String(props.poolId)
    )
  })
})

function getTradeSide(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const receivedDenom = op.received.denom
    const sentDenom = op.sent.denom

    if (receivedDenom === props.quote) {
      return 'Sell'
    } else if (sentDenom === props.quote) {
      return 'Buy'
    }
  }
  return null
}

function getTradeAmount(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const receivedDenom = op.received.denom
    const sentDenom = op.sent.denom

    if (receivedDenom === props.quote) {
      return formatCoinsPrimary([op.sent])
    } else if (sentDenom === props.quote) {
      return formatCoinsPrimary([op.received])
    }
  }
  return null
}

function getPrice(trade: Trade): string | null {
  for (const op of trade.operations || []) {
    if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
    if (!op.sent || !op.received) continue

    const sentDenom = op.sent.denom
    const receivedDenom = op.received.denom
    const sentAmount = BigInt(op.sent.amount)
    const receivedAmount = BigInt(op.received.amount)

    if (sentAmount === 0n || receivedAmount === 0n) continue

    let price: number | null = null

    if (sentDenom === props.base && receivedDenom === props.quote) {
      price = Number(receivedAmount) / Number(sentAmount)
    } else if (sentDenom === props.quote && receivedDenom === props.base) {
      price = Number(sentAmount) / Number(receivedAmount)
    }

    if (price !== null && isFinite(price) && price > 0) {
      return price.toFixed(6)
    }
  }
  return null
}
</script>

<template>
  <div class="h-full overflow-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-[100px]">Trade ID</TableHead>
          <TableHead>Trader</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead class="text-right">Price</TableHead>
          <TableHead class="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="trade in filteredTrades"
          :key="trade.trade_id"
          :class="[
            'hover:bg-accent/50',
            getTradeSide(trade) === 'Buy' ? 'bg-green-50/50 dark:bg-green-900/20' : '',
            getTradeSide(trade) === 'Sell' ? 'bg-red-50/50 dark:bg-red-900/20' : '',
          ]"
        >
          <TableCell class="font-mono">
            <RouterLink
              :to="{ name: 'WhaleswapTrade', params: { tradeId: trade.trade_id } }"
              class="text-primary hover:underline"
            >
              #{{ formatTradeId(trade.trade_id) }}
            </RouterLink>
          </TableCell>
          <TableCell class="font-mono text-sm">
            {{ truncateAddress(trade.trader) }}
          </TableCell>
          <TableCell class="font-mono text-sm">
            {{ getTradeSide(trade) || '—' }}
          </TableCell>
          <TableCell class="font-mono text-sm">
            {{ getTradeAmount(trade) || '—' }}
          </TableCell>
          <TableCell class="text-right font-mono text-sm">
            {{ getPrice(trade) ? `${getPrice(trade)} ${getDisplayDenom(props.quote)}` : '—' }}
          </TableCell>
          <TableCell class="text-right text-xs text-muted-foreground">
            {{ formatTimestamp(trade.timestamp) }}
          </TableCell>
        </TableRow>
        <TableRow v-if="filteredTrades.length === 0">
          <TableCell colspan="6" class="text-center text-muted-foreground py-8">
            No trades found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
