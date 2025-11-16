import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useLiveQuery } from '@tanstack/vue-db'
import { CollectionOperationError } from '@tanstack/db'
import { useWhaleswapClient, type PoolResponse, type PoolsResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed, watchEffect, shallowRef } from 'vue'
import { poolsCollection } from './useWhaleswapDB'
import type { Pool } from '../utils/types'

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
  const pools: Pool[] = []
  let nextKey: string | undefined
  do {
    const response: PoolsResponse = await client.pools({
      pagination: {
        key: nextKey,
        limit: String(pageSize),
      },
    })
    if (Array.isArray(response.pools)) pools.push(...response.pools)
    nextKey = response.pagination?.next_key
  } while (nextKey)
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
    const pools = serverQuery.data.value
    if (!pools || pools.length === 0) return
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
    if (poolsStore.value.length) {
      console.debug('[useWhaleswapPoolsLive] returning store pools', {
        count: poolsStore.value.length,
      })
      return poolsStore.value
    }
    if (localQuery.data.value && localQuery.data.value.length) {
      console.debug('[useWhaleswapPoolsLive] returning local pools', {
        count: localQuery.data.value.length,
      })
      return localQuery.data.value
    }
    if (serverQuery.data.value) {
      console.debug('[useWhaleswapPoolsLive] returning server pools (fallback)', {
        count: serverQuery.data.value.length,
      })
      return serverQuery.data.value
    }
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
