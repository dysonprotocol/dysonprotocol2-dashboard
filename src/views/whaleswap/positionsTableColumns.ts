import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import type { LeveragePosition } from '@/whaleswap/utils/types'
import { formatCoin, truncateAddress } from '@/whaleswap/utils/formatters'
import { calculatePositionHealth } from '@/whaleswap/composables/usePositionMutations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type PositionWithOwnership = LeveragePosition & {
  isOwn: boolean
}

function formatStatus(status: string | undefined): string {
  if (!status) return 'unknown'
  const cleaned = status.replace('POSITION_STATUS_', '')
  return cleaned.toLowerCase()
}

function getHealthEmoji(position: LeveragePosition): string {
  const health = calculatePositionHealth(position)
  return health.riskLevel === 'safe' ? '🟢' : health.riskLevel === 'medium' ? '🟡' : '🔴'
}

function getHealthScore(position: LeveragePosition): number {
  const health = calculatePositionHealth(position)
  const collateral = BigInt(position.collateral.amount)
  const borrowed = BigInt(position.borrowed.amount)
  const interest = BigInt(position.accrued_interest.amount)
  const debt = borrowed + interest
  if (debt === 0n) return 999999
  return Number((collateral * 10000n) / debt) / 10000
}

export function createPositionsColumns(
  onManage: (position: LeveragePosition) => void
): ColumnDef<PositionWithOwnership>[] {
  return [
    {
      accessorKey: 'position_id',
      header: 'Position',
      cell: ({ row }) => h('span', { class: 'font-mono' }, `#${row.original.position_id}`),
      sortingFn: (a, b) => Number(a.original.position_id) - Number(b.original.position_id),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) =>
        h('div', { class: 'font-mono text-sm' }, [
          truncateAddress(row.original.user),
          row.original.isOwn ? h('span', { class: 'ml-1 text-xs text-primary' }, '(You)') : null,
        ]),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'collateral',
      header: 'Collateral',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, formatCoin(row.original.collateral)),
      sortingFn: (a, b) =>
        Number(BigInt(a.original.collateral.amount) - BigInt(b.original.collateral.amount)),
    },
    {
      accessorKey: 'borrowed',
      header: 'Borrowed',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, formatCoin(row.original.borrowed)),
      sortingFn: (a, b) =>
        Number(BigInt(a.original.borrowed.amount) - BigInt(b.original.borrowed.amount)),
    },
    {
      accessorKey: 'accrued_interest',
      header: 'Interest',
      cell: ({ row }) =>
        h('span', { class: 'font-mono text-sm' }, formatCoin(row.original.accrued_interest)),
      sortingFn: (a, b) =>
        Number(
          BigInt(a.original.accrued_interest.amount) - BigInt(b.original.accrued_interest.amount)
        ),
    },
    {
      id: 'pnl',
      header: 'Realized Equity',
      cell: ({ row }) => {
        const profit = BigInt(row.original.total_realized_profit?.amount || '0')
        const loss = BigInt(row.original.total_realized_loss?.amount || '0')
        const netPnl = profit - loss
        const denom = row.original.total_realized_profit?.denom || row.original.borrowed.denom
        const pnlText =
          netPnl >= 0n
            ? `+${formatCoin({ amount: netPnl.toString(), denom })}`
            : formatCoin({ amount: (-netPnl).toString(), denom })
        return h(
          'span',
          {
            class: `font-mono text-sm ${netPnl >= 0n ? 'text-green-600' : 'text-red-600'}`,
          },
          pnlText
        )
      },
      sortingFn: (a, b) => {
        const aProfit = BigInt(a.original.total_realized_profit?.amount || '0')
        const aLoss = BigInt(a.original.total_realized_loss?.amount || '0')
        const aNet = aProfit - aLoss
        const bProfit = BigInt(b.original.total_realized_profit?.amount || '0')
        const bLoss = BigInt(b.original.total_realized_loss?.amount || '0')
        const bNet = bProfit - bLoss
        return Number(aNet - bNet)
      },
    },
    {
      id: 'health',
      header: 'Health',
      accessorFn: (row) => getHealthScore(row),
      cell: ({ row }) =>
        h('span', { class: 'text-lg text-center block' }, getHealthEmoji(row.original)),
      sortingFn: (a, b) => getHealthScore(a.original) - getHealthScore(b.original),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        h(
          Badge,
          { variant: 'outline', class: 'capitalize' },
          { default: () => formatStatus(row.original.status) }
        ),
      filterFn: 'equalsString',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            disabled: !row.original.isOwn,
            onClick: () => onManage(row.original),
          },
          { default: () => (row.original.isOwn ? 'Manage' : 'View') }
        ),
    },
  ]
}
