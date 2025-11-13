import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useWhaleswapClient, type PoolResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed } from 'vue'

export function useWhaleswapPool(
  poolId: MaybeRefOrGetter<string | bigint>,
  options?: Partial<UseQueryOptions<PoolResponse>>
) {
  const client = useWhaleswapClient()
  const poolIdVal = computed(() => String(toValue(poolId)))

  return useQuery({
    queryKey: whaleswapKeys.pool(poolIdVal.value),
    queryFn: async () => {
      console.log('[useWhaleswapPool] Fetching pool:', poolIdVal.value)
      const result = await client.pool({ poolId: poolIdVal.value })
      console.log('[useWhaleswapPool] Pool data:', result)
      return result
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

