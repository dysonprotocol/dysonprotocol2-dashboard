import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { RouterLink } from 'vue-router'
import type { Trade } from '@/whaleswap/utils/types'
import {
  formatTradeId,
  formatCoinsPrimary,
  formatTimestamp,
  truncateAddress,
  getDisplayDenom,
} from '@/whaleswap/utils/formatters'

export type TradeRow = Trade & {
  side: string | null
  amount: string | null
  price: string | null
}

export function createTradesColumns(
  poolId: string,
  base: string,
  quote: string
): ColumnDef<TradeRow>[] {
  return [
    {
      accessorKey: 'trade_id',
      header: 'Trade ID',
      cell: ({ row }) =>
        h(
          RouterLink,
          {
            to: { name: 'WhaleswapTrade', params: { tradeId: row.original.trade_id } },
            class: 'text-primary hover:underline font-mono',
          },
          () => `#${formatTradeId(row.original.trade_id)}`
        ),
      sortingFn: (a, b) => Number(a.original.trade_id) - Number(b.original.trade_id),
    },
    {
      accessorKey: 'trader',
      header: 'Trader',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, truncateAddress(row.original.trader)),
    },
    {
      accessorKey: 'side',
      header: 'Side',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, row.original.side || '—'),
      sortingFn: (a, b) => {
        const aSide = a.original.side || ''
        const bSide = b.original.side || ''
        return aSide.localeCompare(bSide)
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, row.original.amount || '—'),
    },
    {
      accessorKey: 'price',
      header: () => h('div', { class: 'text-right' }, 'Price'),
      cell: ({ row }) =>
        h(
          'span',
          { class: 'text-right font-mono text-sm' },
          row.original.price ? `${row.original.price} ${getDisplayDenom(quote)}` : '—'
        ),
      sortingFn: (a, b) => {
        const aPrice = parseFloat(a.original.price || '0')
        const bPrice = parseFloat(b.original.price || '0')
        return aPrice - bPrice
      },
    },
    {
      accessorKey: 'timestamp',
      header: () => h('div', { class: 'text-right' }, 'Time'),
      cell: ({ row }) =>
        h(
          'span',
          { class: 'text-right text-xs text-muted-foreground' },
          formatTimestamp(row.original.timestamp)
        ),
      sortingFn: (a, b) => {
        const aTime = new Date(a.original.timestamp).getTime()
        const bTime = new Date(b.original.timestamp).getTime()
        return aTime - bTime
      },
    },
  ]
}







