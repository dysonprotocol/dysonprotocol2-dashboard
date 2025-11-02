// REST API client for Cosmos SDK endpoints (not gRPC-Web)
// Uses the google.api.http annotations from query.proto

import type { Trade } from '../utils/types'

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

export function useWhaleswapClient() {
  return {
    async trade(req: { tradeId: bigint | string }): Promise<TradeResponse> {
      return fetchJson<TradeResponse>(`/trades/${req.tradeId}`)
    },
    async tradesByTaker(req: {
      taker: string
      pagination?: { limit?: bigint; offset?: bigint; reverse?: boolean }
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      if (req.pagination?.limit) params.set('pagination.limit', String(req.pagination.limit))
      if (req.pagination?.offset) params.set('pagination.offset', String(req.pagination.offset))
      if (req.pagination?.reverse) params.set('pagination.reverse', 'true')
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/taker/${req.taker}${query}`)
    },
    async tradesByOffer(req: {
      offerId: bigint | string
      pagination?: { limit?: bigint; offset?: bigint; reverse?: boolean }
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      if (req.pagination?.limit) params.set('pagination.limit', String(req.pagination.limit))
      if (req.pagination?.offset) params.set('pagination.offset', String(req.pagination.offset))
      if (req.pagination?.reverse) params.set('pagination.reverse', 'true')
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/offer/${req.offerId}${query}`)
    },
    async tradesByPool(req: {
      poolId: bigint | string
      pagination?: { limit?: bigint; offset?: bigint; reverse?: boolean }
    }): Promise<TradesResponse> {
      const params = new URLSearchParams()
      if (req.pagination?.limit) params.set('pagination.limit', String(req.pagination.limit))
      if (req.pagination?.offset) params.set('pagination.offset', String(req.pagination.offset))
      if (req.pagination?.reverse) params.set('pagination.reverse', 'true')
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TradesResponse>(`/trades/pool/${req.poolId}${query}`)
    },
  }
}
