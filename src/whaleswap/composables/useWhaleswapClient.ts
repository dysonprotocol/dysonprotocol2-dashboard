// REST API client for Cosmos SDK endpoints (not gRPC-Web)
// Uses the google.api.http annotations from query.proto

import type { Trade, Pool, LeveragePosition } from '../utils/types'

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
  pagination?: {
    next_key?: string
    total?: string
  }
}

export type PositionsResponse = {
  positions: LeveragePosition[]
  pagination?: {
    next_key?: string
    total?: string
  }
}

type PaginationParams = {
  limit?: string | number | bigint
  offset?: string | number | bigint
  key?: string
  countTotal?: boolean
  reverse?: boolean
}

function appendPagination(params: URLSearchParams, pagination?: PaginationParams) {
  if (!pagination) return
  if (pagination.key) params.set('pagination.key', pagination.key)
  if (pagination.limit !== undefined) params.set('pagination.limit', String(pagination.limit))
  if (pagination.offset !== undefined) params.set('pagination.offset', String(pagination.offset))
  if (pagination.countTotal) params.set('pagination.count_total', 'true')
  if (pagination.reverse) params.set('pagination.reverse', 'true')
}

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
  }
}
