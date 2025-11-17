import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useWhaleswapClient, type AuctionsResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed } from 'vue'
import type { AuctionRecord } from '../utils/types'

export function useWhaleswapAuction(
  auctionId: MaybeRefOrGetter<string | bigint>,
  options?: Partial<UseQueryOptions<AuctionRecord>>
) {
  const client = useWhaleswapClient()
  const auctionIdVal = computed(() => String(toValue(auctionId)))

  return useQuery({
    queryKey: whaleswapKeys.auction(auctionIdVal.value),
    queryFn: async () => {
      const result = await client.auctions({
        // Note: This is a workaround - the API doesn't have a single auction endpoint
        // We fetch all auctions and filter by ID
        pagination: { limit: '1000' },
      })
      const auction = result.auctions.find(a => a.auction_id === auctionIdVal.value)
      if (!auction) {
        throw new Error(`Auction ${auctionIdVal.value} not found`)
      }
      return auction
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

export function useWhaleswapPairAuctions(
  baseDenom: MaybeRefOrGetter<string>,
  quoteDenom: MaybeRefOrGetter<string>,
  options?: Partial<UseQueryOptions<AuctionRecord[]>>
) {
  const client = useWhaleswapClient()
  const baseDenomVal = computed(() => toValue(baseDenom))
  const quoteDenomVal = computed(() => toValue(quoteDenom))

  // Forward auctions: base (sell) -> quote (bid denom)
  const forwardQuery = useQuery({
    queryKey: whaleswapKeys.auctionsByPair(baseDenomVal.value, quoteDenomVal.value),
    queryFn: async () => {
      const result = await client.auctions({
        sellDenom: baseDenomVal.value,
        bidDenom: quoteDenomVal.value,
      })
      return result.auctions
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    enabled: computed(() => Boolean(baseDenomVal.value && quoteDenomVal.value)),
    ...options,
  })

  // Reverse auctions: quote (sell) -> base (bid denom)
  const reverseQuery = useQuery({
    queryKey: whaleswapKeys.auctionsByPair(quoteDenomVal.value, baseDenomVal.value),
    queryFn: async () => {
      const result = await client.auctions({
        sellDenom: quoteDenomVal.value,
        bidDenom: baseDenomVal.value,
      })
      return result.auctions
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    enabled: computed(() => Boolean(baseDenomVal.value && quoteDenomVal.value)),
    ...options,
  })

  return {
    forward: forwardQuery,
    reverse: reverseQuery,
    isLoading: computed(() => forwardQuery.isLoading.value || reverseQuery.isLoading.value),
    error: computed(() => forwardQuery.error.value || reverseQuery.error.value),
  }
}
