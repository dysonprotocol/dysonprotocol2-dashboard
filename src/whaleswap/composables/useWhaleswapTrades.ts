import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useLiveQuery, eq } from '@tanstack/vue-db'
import { useWhaleswapClient, type TradeResponse, type TradesResponse } from './useWhaleswapClient'
import { tradesCollection } from './useWhaleswapDB'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed, watchEffect } from 'vue'

export function useWhaleswapTrade(
  tradeId: MaybeRefOrGetter<string | bigint>,
  options?: Partial<UseQueryOptions<TradeResponse>>
) {
  const client = useWhaleswapClient()
  return useQuery({
    queryKey: whaleswapKeys.trade(toValue(tradeId)),
    queryFn: async () => {
      const id = toValue(tradeId)
      return await client.trade({ tradeId: id })
    },
    staleTime: 5000,
    ...options,
  })
}

/**
 * TANSTACK DB LEARNING EXAMPLE
 *
 * This composable demonstrates the full TanStack Query + DB pattern:
 *
 * Step 1: TanStack Query fetches from server (with stale-while-revalidate)
 * Step 2: watchEffect syncs server data → TanStack DB collection
 * Step 3: useLiveQuery reads from local collection (reactive!)
 * Step 4: Return local data (instant) + loading only if local empty
 *
 * Benefits:
 * - First render: Instant if data cached locally
 * - Background: Server fetch if stale (>5s old)
 * - UI updates: Reactive when fresh data arrives
 * - Offline: Works from cached data
 */
export function useWhaleswapTradesByTaker(
  taker: MaybeRefOrGetter<string>,
  opts?: {
    limit?: MaybeRefOrGetter<string>
    nextKey?: MaybeRefOrGetter<string>
    options?: Partial<UseQueryOptions<TradesResponse>>
  }
) {
  const client = useWhaleswapClient()
  const limitVal = computed(() => toValue(opts?.limit))
  const takerVal = computed(() => toValue(taker))

  // STEP 1: Fetch from server (TanStack Query)
  const serverQuery = useQuery({
    queryKey: whaleswapKeys.tradesByTaker(takerVal.value, limitVal.value),
    queryFn: async () => {
      const pagination = limitVal.value ? { limit: BigInt(limitVal.value) } : undefined
      return await client.tradesByTaker({ taker: takerVal.value, pagination })
    },
    enabled: computed(() => !!takerVal.value),
    staleTime: 5000, // Fresh for 5s, then refetch in background
    gcTime: 10 * 60 * 1000,
    ...opts?.options,
  })

  // STEP 2: Sync server → DB (watchEffect tracks serverQuery.data)
  watchEffect(() => {
    if (serverQuery.data.value?.trades) {
      console.log(
        '[Sync] Syncing',
        serverQuery.data.value.trades.length,
        'trades for taker:',
        takerVal.value
      )
      console.log('[Sync] First trade trader:', serverQuery.data.value.trades[0]?.trader)
      for (const trade of serverQuery.data.value.trades) {
        // Insert into TanStack DB collection
        // Collection auto-deduplicates by key (trade_id)
        tradesCollection.insert(trade)
      }
    }
  })

  // STEP 3: Live query from TanStack DB (reactive, instant!)
  const localQuery = useLiveQuery(
    (q) => {
      const t = takerVal.value
      console.log('[LiveQuery] Querying for trader:', t)
      return q
        .from({ trades: tradesCollection })
        .where(({ trades }) => eq(trades.trader, t)) // Changed: taker → trader
        .select(({ trades }) => trades)
    },
    [takerVal]
  ) // Re-run query when taker changes

  // STEP 4: Return local-first data
  return {
    data: computed(() => {
      const local = localQuery.data.value
      const server = serverQuery.data.value?.trades
      // Fix: Empty array [] is truthy, so check length explicitly
      const combined = local && local.length > 0 ? local : server || []
      console.log(
        '[useWhaleswapTradesByTaker] local:',
        local?.length,
        'server:',
        server?.length,
        'combined:',
        combined.length
      )
      return {
        trades: combined,
        pagination: serverQuery.data.value?.pagination,
      }
    }),
    isLoading: computed(() => serverQuery.isLoading.value && !localQuery.isReady.value),
    isLocalReady: localQuery.isReady,
    error: serverQuery.error,
    refetch: serverQuery.refetch,
  }
}

export function useWhaleswapTradesByOffer(
  offerId: MaybeRefOrGetter<string | bigint>,
  opts?: {
    limit?: MaybeRefOrGetter<string>
    offset?: MaybeRefOrGetter<string>
    options?: Partial<UseQueryOptions<TradesResponse>>
  }
) {
  const client = useWhaleswapClient()
  const limitVal = computed(() => toValue(opts?.limit))
  const offsetVal = computed(() => toValue(opts?.offset))
  const offerIdVal = computed(() => String(toValue(offerId)))

  const serverQuery = useQuery({
    queryKey: whaleswapKeys.tradesByOffer(offerIdVal.value, limitVal.value),
    queryFn: async () => {
      const pagination = {
        limit: BigInt(limitVal.value || '50'),
        offset: BigInt(offsetVal.value || '0'),
        reverse: true,
      }
      return await client.tradesByOffer({ offerId: offerIdVal.value, pagination })
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...opts?.options,
  })

  watchEffect(() => {
    if (serverQuery.data.value?.trades) {
      for (const trade of serverQuery.data.value.trades) {
        tradesCollection.insert(trade)
      }
    }
  })

  // Note: Can't filter by offer_id in local query (it's in operations array)
  // Server query already filters, so use all local trades
  const localQuery = useLiveQuery((q) =>
    q.from({ trades: tradesCollection }).select(({ trades }) => trades)
  )

  return {
    data: computed(() => {
      const local = localQuery.data.value
      const server = serverQuery.data.value?.trades
      const combined = local && local.length > 0 ? local : server || []
      return {
        trades: combined,
        pagination: serverQuery.data.value?.pagination,
      }
    }),
    isLoading: computed(() => serverQuery.isLoading.value && !localQuery.isReady.value),
    isLocalReady: localQuery.isReady,
    error: serverQuery.error,
    refetch: serverQuery.refetch,
  }
}

export function useWhaleswapTradesByPool(
  poolId: MaybeRefOrGetter<string | bigint>,
  opts?: {
    limit?: MaybeRefOrGetter<string>
    offset?: MaybeRefOrGetter<string>
    options?: Partial<UseQueryOptions<TradesResponse>>
  }
) {
  const client = useWhaleswapClient()
  const limitVal = computed(() => toValue(opts?.limit))
  const offsetVal = computed(() => toValue(opts?.offset))
  const poolIdVal = computed(() => String(toValue(poolId)))

  const serverQuery = useQuery({
    queryKey: whaleswapKeys.tradesByPool(poolIdVal.value, limitVal.value),
    queryFn: async () => {
      const pagination = {
        limit: BigInt(limitVal.value || '50'),
        offset: BigInt(offsetVal.value || '0'),
        reverse: true,
      }
      return await client.tradesByPool({ poolId: poolIdVal.value, pagination })
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...opts?.options,
  })

  watchEffect(() => {
    if (serverQuery.data.value?.trades) {
      for (const trade of serverQuery.data.value.trades) {
        tradesCollection.insert(trade)
      }
    }
  })

  // Note: Can't filter by pool_id in local query (it's in operations array)
  // Server query already filters, so use all local trades
  const localQuery = useLiveQuery((q) =>
    q.from({ trades: tradesCollection }).select(({ trades }) => trades)
  )

  return {
    data: computed(() => {
      const local = localQuery.data.value
      const server = serverQuery.data.value?.trades
      const combined = local && local.length > 0 ? local : server || []
      return {
        trades: combined,
        pagination: serverQuery.data.value?.pagination,
      }
    }),
    isLoading: computed(() => serverQuery.isLoading.value && !localQuery.isReady.value),
    isLocalReady: localQuery.isReady,
    error: serverQuery.error,
    refetch: serverQuery.refetch,
  }
}
