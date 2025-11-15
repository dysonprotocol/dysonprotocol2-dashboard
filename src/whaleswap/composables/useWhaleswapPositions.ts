import { computed } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useWhaleswapClient, type PositionsResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'

type BasePositionsOptions = {
  limit?: MaybeRefOrGetter<string>
  offset?: MaybeRefOrGetter<string>
  status?: MaybeRefOrGetter<string>
  options?: Partial<UseQueryOptions<PositionsResponse>>
}

export function useWhaleswapPositionsByPool(
  poolId: MaybeRefOrGetter<string | bigint>,
  opts?: BasePositionsOptions
) {
  const client = useWhaleswapClient()
  const poolIdVal = computed(() => String(toValue(poolId)))
  const limitVal = computed(() => toValue(opts?.limit))
  const offsetVal = computed(() => toValue(opts?.offset))
  const statusVal = computed(() => toValue(opts?.status))

  return useQuery({
    queryKey: whaleswapKeys.positionsByPool(
      poolIdVal.value,
      statusVal.value,
      limitVal.value,
      offsetVal.value
    ),
    queryFn: async () => {
      const pagination =
        limitVal.value || offsetVal.value
          ? { limit: limitVal.value, offset: offsetVal.value }
          : undefined
      return client.positionsByPool({
        poolId: poolIdVal.value,
        pagination,
        status: statusVal.value,
      })
    },
    enabled: computed(() => Boolean(poolIdVal.value)),
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...opts?.options,
  })
}

type PositionsByAddressOptions = BasePositionsOptions & {
  poolId?: MaybeRefOrGetter<string | bigint | undefined>
  borrowedDenom?: MaybeRefOrGetter<string | undefined>
  collateralDenom?: MaybeRefOrGetter<string | undefined>
}

export function useWhaleswapPositionsByAddress(
  address: MaybeRefOrGetter<string>,
  opts?: PositionsByAddressOptions
) {
  const client = useWhaleswapClient()
  const addressVal = computed(() => String(toValue(address) || ''))
  const poolIdVal = computed(() => toValue(opts?.poolId))
  const borrowedVal = computed(() => toValue(opts?.borrowedDenom))
  const collateralVal = computed(() => toValue(opts?.collateralDenom))
  const limitVal = computed(() => toValue(opts?.limit))
  const offsetVal = computed(() => toValue(opts?.offset))
  const statusVal = computed(() => toValue(opts?.status))

  return useQuery({
    queryKey: whaleswapKeys.positionsByAddress(
      addressVal.value,
      poolIdVal.value ? String(poolIdVal.value) : undefined,
      statusVal.value,
      borrowedVal.value,
      collateralVal.value,
      limitVal.value,
      offsetVal.value
    ),
    queryFn: async () => {
      const pagination =
        limitVal.value || offsetVal.value
          ? { limit: limitVal.value, offset: offsetVal.value }
          : undefined
      return client.positionsByAddress({
        address: addressVal.value,
        poolId: poolIdVal.value,
        borrowedDenom: borrowedVal.value,
        collateralDenom: collateralVal.value,
        pagination,
        status: statusVal.value,
      })
    },
    enabled: computed(() => Boolean(addressVal.value)),
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...opts?.options,
  })
}

type UseWhaleswapPositionsArgs = {
  poolId: MaybeRefOrGetter<string | bigint>
  enabled?: MaybeRefOrGetter<boolean>
  options?: Partial<UseQueryOptions<PositionsResponse>>
}

export function useWhaleswapPositions({
  poolId,
  enabled,
  options,
}: UseWhaleswapPositionsArgs) {
  const client = useWhaleswapClient()
  const poolIdVal = computed(() => String(toValue(poolId)))
  const enabledVal = computed(() => {
    const resolved = toValue(enabled)
    if (typeof resolved === 'boolean') return resolved
    return true
  })

  return useQuery({
    queryKey: whaleswapKeys.positionsByPool(poolIdVal.value, undefined, '1000', undefined),
    queryFn: async () => {
      return client.positionsByPool({
        poolId: poolIdVal.value,
        pagination: { limit: '1000' },
      })
    },
    enabled: computed(() => enabledVal.value && Boolean(poolIdVal.value)),
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}
