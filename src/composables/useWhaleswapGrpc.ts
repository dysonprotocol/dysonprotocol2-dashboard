import { ref, readonly, type Ref } from 'vue'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { createPromiseClient } from '@connectrpc/connect'
import { Query } from '@ts-client/dysonprotocol/whaleswap/v1/query_connect'
import {
  QueryPoolsByPairRequest,
  QueryPoolsByPairPriceRangeRequest,
  QueryOffersBestRequest,
  QueryOffersByPairPriceRangeRequest,
  QueryAuctionsByPairPriceRangeRequest,
} from '@ts-client/dysonprotocol/whaleswap/v1/query_pb'

export interface UseWhaleswapGrpcResult {
  // Reactive state
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>

  // Query methods
  getPoolsByPair(baseDenom: string, quoteDenom: string): Promise<any[] | null>
  getPoolsByPairPriceRange(
    baseDenom: string,
    quoteDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null>
  getOffersByPairPriceRange(
    haveDenom: string,
    wantDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null>
  getAuctionsByPairPriceRange(
    sellDenom: string,
    bidDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null>
  getBestOffers(haveDenom: string, wantDenom: string, limit?: number): Promise<any[] | null>
}

export function useWhaleswapGrpc(endpoint: string): UseWhaleswapGrpcResult {
  const transport = createGrpcWebTransport({
    baseUrl: endpoint,
  })
  const client = createPromiseClient(Query, transport)

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const executeQuery = async <T>(queryFn: () => Promise<T>): Promise<T | null> => {
    isLoading.value = true
    error.value = null

    try {
      const result = await queryFn()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Query failed:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getPoolsByPair = async (baseDenom: string, quoteDenom: string): Promise<any[] | null> => {
    return executeQuery(async () => {
      const request = new QueryPoolsByPairRequest({
        baseDenom,
        quoteDenom,
      })
      const response = await client.poolsByPair(request)
      return response.pools
    })
  }

  const getPoolsByPairPriceRange = async (
    baseDenom: string,
    quoteDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null> => {
    return executeQuery(async () => {
      const request = new QueryPoolsByPairPriceRangeRequest({
        baseDenom,
        quoteDenom,
        minPrice,
        maxPrice,
      })
      const response = await client.poolsByPairPriceRange(request)
      return response.pools
    })
  }

  const getOffersByPairPriceRange = async (
    haveDenom: string,
    wantDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null> => {
    return executeQuery(async () => {
      const request = new QueryOffersByPairPriceRangeRequest({
        haveDenom,
        wantDenom,
        minPrice,
        maxPrice,
      })
      const response = await client.offersByPairPriceRange(request)
      return response.offers
    })
  }

  const getAuctionsByPairPriceRange = async (
    sellDenom: string,
    bidDenom: string,
    minPrice?: string,
    maxPrice?: string
  ): Promise<any[] | null> => {
    return executeQuery(async () => {
      const request = new QueryAuctionsByPairPriceRangeRequest({
        sellDenom,
        bidDenom,
        minPrice,
        maxPrice,
      })
      const response = await client.auctionsByPairPriceRange(request)
      return response.auctions
    })
  }

  const getBestOffers = async (
    haveDenom: string,
    wantDenom: string,
    limit = 10
  ): Promise<any[] | null> => {
    return executeQuery(async () => {
      const request = new QueryOffersBestRequest({
        haveDenom,
        wantDenom,
        limit,
      })
      const response = await client.offersBest(request)
      return response.offers
    })
  }

  return {
    // Reactive state
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Query methods
    getPoolsByPair,
    getPoolsByPairPriceRange,
    getOffersByPairPriceRange,
    getAuctionsByPairPriceRange,
    getBestOffers,
  }
}
