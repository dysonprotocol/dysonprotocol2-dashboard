import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useWallet } from '@/composables/useWallet'
import { whaleswapKeys } from '../utils/queryKeys'
import { toast } from 'vue-sonner'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

type ClosePositionArgs = {
  positionId: string
  executorAddress: string
  note?: string
  fraction?: string
}

type AddCollateralArgs = {
  positionId: string
  poolId: string
  collateral: { denom: string; amount: string }
  executorAddress: string
}

type CoverPositionArgs = {
  positionId: string
  payment: { denom: string; amount: string }
  executorAddress: string
  note?: string
}

type RemoveCollateralArgs = {
  positionId: string
  poolId: string
  collateral: { denom: string; amount: string }
  executorAddress: string
}

export function useClosePositionMutation() {
  const wallet = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ positionId, executorAddress, note = '', fraction }: ClosePositionArgs) => {
      const fractionValue = fraction ?? '1'
      const msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgClosePosition',
        user: executorAddress,
        position_id: positionId,
        note,
        fraction: fractionValue,
      }

      const result = await wallet.sendMsg({
        msg,
        gasLimit: 'auto',
        executorAddress,
      })

      if (!result.success) {
        throw new Error(result.rawLog || 'Failed to close position')
      }

      return result
    },
    onSuccess: (_, variables) => {
      toast.success('Position closed successfully')
      // Invalidate all position queries
      queryClient.invalidateQueries({ queryKey: whaleswapKeys.positions() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to close position: ${error.message}`)
    },
  })
}

export function useAddCollateralMutation() {
  const wallet = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ positionId, poolId, collateral, executorAddress }: AddCollateralArgs) => {
      const msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgAddCollateral',
        user: executorAddress,
        pool_id: poolId,
        position_id: positionId,
        collateral,
      }

      const result = await wallet.sendMsg({
        msg,
        gasLimit: 'auto',
        executorAddress,
      })

      if (!result.success) {
        throw new Error(result.rawLog || 'Failed to add collateral')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Collateral added successfully')
      queryClient.invalidateQueries({ queryKey: whaleswapKeys.positions() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to add collateral: ${error.message}`)
    },
  })
}

export function useCoverPositionMutation() {
  const wallet = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ positionId, payment, executorAddress, note = '' }: CoverPositionArgs) => {
      const msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgCoverPosition',
        user: executorAddress,
        position_id: positionId,
        payment,
        note,
      }

      const result = await wallet.sendMsg({
        msg,
        gasLimit: 'auto',
        executorAddress,
      })

      if (!result.success) {
        throw new Error(result.rawLog || 'Failed to cover position')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Position covered successfully')
      queryClient.invalidateQueries({ queryKey: whaleswapKeys.positions() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to cover position: ${error.message}`)
    },
  })
}

export function useRemoveCollateralMutation() {
  const wallet = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      positionId,
      poolId,
      collateral,
      executorAddress,
    }: RemoveCollateralArgs) => {
      const msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgRemoveCollateral',
        user: executorAddress,
        pool_id: poolId,
        position_id: positionId,
        collateral,
      }

      const result = await wallet.sendMsg({
        msg,
        gasLimit: 'auto',
        executorAddress,
      })

      if (!result.success) {
        throw new Error(result.rawLog || 'Failed to remove collateral')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Collateral removed successfully')
      queryClient.invalidateQueries({ queryKey: whaleswapKeys.positions() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove collateral: ${error.message}`)
    },
  })
}

// Helper to calculate position health
export function calculatePositionHealth(position: {
  collateral: { denom: string; amount: string }
  borrowed: { denom: string; amount: string }
  accrued_interest: { denom: string; amount: string }
  min_collateral_ratio?: string
  liquidation_threshold?: string
}) {
  const collateralAmt = BigInt(position.collateral.amount)
  const borrowedAmt = BigInt(position.borrowed.amount)
  const interestAmt = BigInt(position.accrued_interest.amount)
  const totalDebt = borrowedAmt + interestAmt
  const minRatio = position.min_collateral_ratio ? parseFloat(position.min_collateral_ratio) : 1.5
  const liqThreshold = position.liquidation_threshold
    ? parseFloat(position.liquidation_threshold)
    : 1.2

  if (totalDebt === 0n) {
    return {
      ratio: Infinity,
      riskLevel: 'safe' as const,
      distanceToLiquidation: Infinity,
      minRatio,
      liqThreshold,
    }
  }

  // Simplified: assumes 1:1 price for now
  // In production, you'd fetch actual pool price
  const ratio = Number(collateralAmt) / Number(totalDebt)

  const distanceToLiquidation = ratio - liqThreshold

  let riskLevel: 'safe' | 'medium' | 'high'
  if (ratio >= minRatio) {
    riskLevel = 'safe'
  } else if (ratio >= liqThreshold + (minRatio - liqThreshold) * 0.5) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'high'
  }

  return {
    ratio,
    riskLevel,
    distanceToLiquidation,
    minRatio,
    liqThreshold,
  }
}
