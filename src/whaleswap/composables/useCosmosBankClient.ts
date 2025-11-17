import type {
  DenomMetadataResponse,
  DenomsMetadataResponse,
  PaginationParams,
  SupplyOfResponse,
  TotalSupplyResponse,
} from '../utils/types'
import { appendPagination } from '../utils/http'

const BASE_URL = '/cosmos/bank/v1beta1'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

export function useCosmosBankClient() {
  return {
    async totalSupply(req?: { pagination?: PaginationParams }): Promise<TotalSupplyResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req?.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<TotalSupplyResponse>(`/supply${query}`)
    },
    async supplyOf(req: { denom: string }): Promise<SupplyOfResponse> {
      return fetchJson<SupplyOfResponse>(`/supply/by_denom?denom=${encodeURIComponent(req.denom)}`)
    },
    async denomsMetadata(req?: {
      pagination?: PaginationParams
    }): Promise<DenomsMetadataResponse> {
      const params = new URLSearchParams()
      appendPagination(params, req?.pagination)
      const query = params.toString() ? `?${params}` : ''
      return fetchJson<DenomsMetadataResponse>(`/denoms_metadata${query}`)
    },
    async denomMetadata(req: { denom: string }): Promise<DenomMetadataResponse> {
      return fetchJson<DenomMetadataResponse>(`/denoms_metadata/${encodeURIComponent(req.denom)}`)
    },
  }
}

