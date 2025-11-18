import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useLiveQuery } from '@tanstack/vue-db'
import { CollectionOperationError } from '@tanstack/db'
import { useWhaleswapClient, type PoolResponse, type PoolsResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed, watchEffect, shallowRef } from 'vue'
import { poolsCollection } from './useWhaleswapDB'
import type { Pool } from '../utils/types'
import type { MaybeRefOrGetter } from 'vue'
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useWhaleswapClient } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'

const poolsStore = shallowRef<Pool[]>([])

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

async function fetchAllPools(
  client: ReturnType<typeof useWhaleswapClient>,
  pageSize: number
): Promise<Pool[]> {
  console.log('[fetchAllPools] Starting pool fetch using /pools/all endpoint')

  // Use the /pools/all endpoint which should return all pools at once
  const response: PoolsResponse = await client.poolsAll({
    pagination: {
      limit: String(pageSize),
    },
  })

  console.log('[fetchAllPools] Response received:', {
    poolsLength: response.pools?.length ?? 0,
    fullResponse: response,
  })

  const pools = Array.isArray(response.pools) ? response.pools : []
  console.log(
    '[fetchAllPools] Completed fetch, total pools:',
    pools.length,
    'sample:',
    pools.slice(0, 3)
  )
  return pools
}

type PoolsLiveOptions = {
  pageSize?: number
  queryOptions?: Partial<UseQueryOptions<Pool[]>>
}

export function useWhaleswapPoolsLive(options?: PoolsLiveOptions) {
  const client = useWhaleswapClient()
  const pageSize = options?.pageSize ?? 200

  const serverQuery = useQuery({
    queryKey: whaleswapKeys.pools(),
    queryFn: async () => fetchAllPools(client, pageSize),
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...options?.queryOptions,
  })

  watchEffect(() => {
    console.log('[useWhaleswapPoolsLive] serverQuery watchEffect triggered')
    const pools = serverQuery.data.value
    console.log('[useWhaleswapPoolsLive] serverQuery data:', {
      poolsLength: pools?.length ?? 0,
      poolsSample: pools?.slice(0, 2),
      isLoading: serverQuery.isLoading.value,
      isError: serverQuery.isError.value,
      error: serverQuery.error.value,
    })
    if (!pools || pools.length === 0) {
      console.log('[useWhaleswapPoolsLive] No pools from server query, skipping sync')
      return
    }
    console.debug('[useWhaleswapPoolsLive] syncing server pools to DB', { count: pools.length })
    for (const pool of pools) {
      mergePoolIntoStore(pool)
      void persistPoolCollectionEntry(pool)
    }
  })

  const localQuery = useLiveQuery(
    (q) => q.from({ pools: poolsCollection }).select(({ pools }) => pools),
    []
  )

  watchEffect(() => {
    console.debug('[useWhaleswapPoolsLive] localQuery update', {
      ready: localQuery.isReady.value,
      count: localQuery.data.value?.length,
    })
  })

  const livePools = computed(() => {
    console.log('[useWhaleswapPoolsLive] livePools computed: checking data sources')
    console.log('[useWhaleswapPoolsLive] livePools: poolsStore length:', poolsStore.value.length)
    console.log(
      '[useWhaleswapPoolsLive] livePools: localQuery ready:',
      localQuery.isReady.value,
      'data length:',
      localQuery.data.value?.length ?? 0
    )
    console.log(
      '[useWhaleswapPoolsLive] livePools: serverQuery data length:',
      serverQuery.data.value?.length ?? 0
    )

    if (poolsStore.value.length) {
      console.log('[useWhaleswapPoolsLive] returning store pools', {
        count: poolsStore.value.length,
        sample: poolsStore.value.slice(0, 2),
      })
      return poolsStore.value
    }
    if (localQuery.data.value && localQuery.data.value.length) {
      console.log('[useWhaleswapPoolsLive] returning local pools', {
        count: localQuery.data.value.length,
        sample: localQuery.data.value.slice(0, 2),
      })
      return localQuery.data.value
    }
    if (serverQuery.data.value) {
      console.log('[useWhaleswapPoolsLive] returning server pools (fallback)', {
        count: serverQuery.data.value.length,
        sample: serverQuery.data.value.slice(0, 2),
      })
      return serverQuery.data.value
    }
    console.log('[useWhaleswapPoolsLive] returning empty array - no pools available')
    return []
  })

  return {
    data: livePools,
    isLoading: computed(() => serverQuery.isLoading.value && !localQuery.isReady.value),
    isFetching: serverQuery.isFetching,
    isLocalReady: localQuery.isReady,
    error: serverQuery.error,
    refetch: serverQuery.refetch,
  }
}

function mergePoolIntoStore(pool: Pool) {
  if (!pool?.pool_id) return
  poolsStore.value = produceUpdatedPools(poolsStore.value, pool)
}

function produceUpdatedPools(existing: Pool[], next: Pool): Pool[] {
  const nextHeight = toHeight(next.updated_height || next.block_height)
  const mapped = existing.map((pool) => {
    if (pool.pool_id !== next.pool_id) return pool
    const currentHeight = toHeight(pool.updated_height || pool.block_height)
    if (!nextHeight || !currentHeight) return next
    return nextHeight >= currentHeight ? next : pool
  })
  if (!existing.some((pool) => pool.pool_id === next.pool_id)) {
    mapped.push(next)
  }
  return mapped
}

function toHeight(value?: string): bigint | null {
  if (!value) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

export async function upsertPoolSnapshot(pool: Pool) {
  mergePoolIntoStore(pool)
  await persistPoolCollectionEntry(pool)
}

async function persistPoolCollectionEntry(pool: Pool) {
  try {
    await poolsCollection.insert(pool)
  } catch (error) {
    if (error instanceof CollectionOperationError) {
      await poolsCollection.update(pool.pool_id, () => pool)
    } else {
      throw error
    }
  }
}

export function useWhaleswapPairPools(
  baseDenom: MaybeRefOrGetter<string>,
  quoteDenom: MaybeRefOrGetter<string>,
  options?: Partial<UseQueryOptions<Pool[]>>
) {
  const client = useWhaleswapClient()
  const baseDenomVal = computed(() => toValue(baseDenom))
  const quoteDenomVal = computed(() => toValue(quoteDenom))

  return useQuery({
    queryKey: whaleswapKeys.poolsByPair(baseDenomVal.value, quoteDenomVal.value),
    queryFn: async () => {
      const result = await client.poolsByPair({
        baseDenom: baseDenomVal.value,
        quoteDenom: quoteDenomVal.value,
      })
      return result.pools
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    enabled: computed(() => Boolean(baseDenomVal.value && quoteDenomVal.value)),
    ...options,
  })
}
