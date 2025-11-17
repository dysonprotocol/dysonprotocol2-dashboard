// REST API client for Cosmos SDK endpoints (not gRPC-Web)
// Uses the google.api.http annotations from query.proto

import type {
  Trade,
  Pool,
  LeveragePosition,
  OfferData,
  PaginationParams,
  PaginationInfo,
  OffersResponse as OffersListResponse,
  AuctionsResponse,
  MetricsResponse,
} from '../utils/types'
import { appendPagination } from '../utils/http'

const BASE_URL = '/dysonprotocol/whaleswap/v1'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

export type TradeResponse = {
  trade: Trade
}

export type TradesResponse = {
  trades: Trade[]
  pagination?: {
    next_key?: string
    total?: string
  }
}

export type PoolResponse = {
  pool: Pool
}

export type PoolsResponse = {
  pools: Pool[]
  pagination?: PaginationInfo
}

export type PositionsResponse = {
  positions: LeveragePosition[]
  pagination?: PaginationInfo
}

export type OfferResponse = {
  offer: OfferData
}

export type OffersResponse = OffersListResponse

export type OffersBestResponse = {
  offers: OfferData[]
}

export type AuctionsByPairResponse = AuctionsResponse

export function useWhaleswapClient() {
  return {
    async pool(req: { poolId: bigint | string }): Promise<PoolResponse> {
      return fetchJson<PoolResponse>(`/pools/${req.poolId}`)
    },
    async pools(req?: { pagination?: PaginationParams }): Promise<PoolsResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req?.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<PoolsResponse>(`/pools${query}`)
    },
    async poolsByDenom(req: {
      denom: string
      pagination?: PaginationParams
    }): Promise<PoolsResponse> {
      const params = new URLSearchParams()
      params.set('denom', req.denom)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<PoolsResponse>(`/pools/by_denom${query}`)
    },
    async poolsByPair(req: {
      baseDenom: string
      quoteDenom: string
      pagination?: PaginationParams
    }): Promise<PoolsResponse> {
      const params = new URLSearchParams()
      params.set('base_denom', req.baseDenom)
      params.set('quote_denom', req.quoteDenom)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<PoolsResponse>(`/pools/by_pair${query}`)
    },
    async trade(req: { tradeId: bigint | string }): Promise<TradeResponse> {
      return fetchJson<TradeResponse>(`/trades/${req.tradeId}`)
    },
    async tradesByTaker(req: {
      taker: string
      pagination?: PaginationParams
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/taker/${req.taker}${query}`)
    },
    async tradesByOffer(req: {
      offerId: bigint | string
      pagination?: PaginationParams
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/offer/${req.offerId}${query}`)
    },
    async tradesByPool(req: {
      poolId: bigint | string
      pagination?: PaginationParams
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/pool/${req.poolId}${query}`)
    },
    async positionsByPool(req: {
      poolId: bigint | string
      pagination?: PaginationParams
      status?: string
    }): Promise<PositionsResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req.pagination)
      if (req.status) params.set('status', req.status)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<PositionsResponse>(`/positions/pool/${req.poolId}${query}`)
    },
    async positionsByAddress(req: {
      address: string
      poolId?: string | number | bigint
      borrowedDenom?: string
      collateralDenom?: string
      pagination?: PaginationParams
      status?: string
    }): Promise<PositionsResponse> {
      const params = new URLSearchParams()
      if (req.poolId !== undefined) params.set('pool_id', String(req.poolId))
      if (req.borrowedDenom) params.set('borrowed_denom', req.borrowedDenom)
      if (req.collateralDenom) params.set('collateral_denom', req.collateralDenom)
      appendPagination(params, req.pagination)
      if (req.status) params.set('status', req.status)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<PositionsResponse>(`/positions/address/${req.address}${query}`)
    },
    async offers(req?: {
      haveDenom?: string
      wantDenom?: string
      pagination?: PaginationParams
    }): Promise<OffersResponse> {
      const params = new URLSearchParams()
      if (req?.haveDenom) params.set('have_denom', req.haveDenom)
      if (req?.wantDenom) params.set('want_denom', req.wantDenom)
      appendPagination(params, req?.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<OffersResponse>(`/offers${query}`)
    },
    async offer(req: { offerId: string | number | bigint }): Promise<OfferResponse> {
      return fetchJson<OfferResponse>(`/offers/${req.offerId}`)
    },
    async offersByDenom(req: {
      denom: string
      role?: 'have' | 'want'
      pagination?: PaginationParams
    }): Promise<OffersResponse> {
      const params = new URLSearchParams()
      params.set('denom', req.denom)
      if (req.role) params.set('role', req.role)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<OffersResponse>(`/offers/by_denom${query}`)
    },
    async offersByOwner(req: {
      owner: string
      status?: string
      pagination?: PaginationParams
    }): Promise<OffersResponse> {
      const params = new URLSearchParams()
      if (req.status) params.set('status', req.status)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<OffersResponse>(`/offers/owner/${req.owner}${query}`)
    },
    async offersBest(req: {
      haveDenom: string
      wantDenom: string
      limit?: number
    }): Promise<OffersBestResponse> {
      const params = new URLSearchParams()
      params.set('have_denom', req.haveDenom)
      params.set('want_denom', req.wantDenom)
      if (req.limit !== undefined) params.set('limit', String(req.limit))
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<OffersBestResponse>(`/offers/best${query}`)
    },
    async offersByPairPriceRange(req: {
      haveDenom: string
      wantDenom: string
      minPrice?: string
      maxPrice?: string
      pagination?: PaginationParams
    }): Promise<OffersResponse> {
      const params = new URLSearchParams()
      params.set('have_denom', req.haveDenom)
      params.set('want_denom', req.wantDenom)
      if (req.minPrice) params.set('min_price', req.minPrice)
      if (req.maxPrice) params.set('max_price', req.maxPrice)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<OffersResponse>(`/offers/by_pair_price${query}`)
    },
    async auctions(req?: {
      sellDenom?: string
      bidDenom?: string
      pagination?: PaginationParams
    }): Promise<AuctionsResponse> {
      const params = new URLSearchParams()
      if (req?.sellDenom) params.set('sell_denom', req.sellDenom)
      if (req?.bidDenom) params.set('bid_denom', req.bidDenom)
      appendPagination(params, req?.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<AuctionsResponse>(`/auctions${query}`)
    },
    async auctionsByPairPriceRange(req: {
      sellDenom: string
      bidDenom: string
      minPrice?: string
      maxPrice?: string
      pagination?: PaginationParams
    }): Promise<AuctionsResponse> {
      const params = new URLSearchParams()
      params.set('sell_denom', req.sellDenom)
      params.set('bid_denom', req.bidDenom)
      if (req.minPrice) params.set('min_price', req.minPrice)
      if (req.maxPrice) params.set('max_price', req.maxPrice)
      appendPagination(params, req.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<AuctionsResponse>(`/auctions/by_pair_price${query}`)
    },
    async metrics(): Promise<MetricsResponse> {
      return fetchJson<MetricsResponse>('/metrics')
    },
  }
}
