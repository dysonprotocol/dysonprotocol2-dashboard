/**
 * Canonical TanStack DB schema for Whaleswap data.
 * Collections live in IndexedDB (via TanStack DB) and stay in sync through
 * our TanStack Query fetchers + watchEffect bridges.
 */

import { createCollection, type Collection } from '@tanstack/db'
import type {
  AuctionRecord,
  DenomMetadata,
  OfferData,
  Pool,
  Trade,
  TradeMetrics,
} from '../utils/types'

function startCollectionSync<T extends object>(
  collection: Collection<T, string>
): Collection<T, string> {
  try {
    collection.startSyncImmediate?.()
  } catch (error) {
    console.warn('[TanStack DB] failed to start collection sync', error)
  }
  return collection
}

function defineCollection<T extends object>(
  config: Omit<Parameters<typeof createCollection<T, string>>[0], 'sync'> & {
    id: string
    getKey: (item: T) => string
  }
): Collection<T, string> {
  const noop = async () => {}
  const collection = createCollection<T, string>({
    autoIndex: 'eager',
    startSync: true,
    sync: { sync: async () => {} },
    onInsert: noop,
    onUpdate: noop,
    onDelete: noop,
    ...config,
  })
  return startCollectionSync(collection)
}

export const tradesCollection = defineCollection<Trade>({
  id: 'whaleswap_trades',
  getKey: (trade) => trade.trade_id,
})

export const poolsCollection = defineCollection<Pool>({
  id: 'whaleswap_pools',
  getKey: (pool) => pool.pool_id,
})

export const offersCollection = defineCollection<OfferData>({
  id: 'whaleswap_offers',
  getKey: (offer) => offer.offer_id,
})

export const auctionsCollection = defineCollection<AuctionRecord>({
  id: 'whaleswap_auctions',
  getKey: (auction) => auction.auction_id,
})

export type DenomSupplyRow = {
  denom: string
  amount: string
  updated_height?: string
  updated_time?: string
}

export const denomSupplyCollection = defineCollection<DenomSupplyRow>({
  id: 'whaleswap_denom_supply',
  getKey: (row) => row.denom,
})

export type DenomMetadataRow = DenomMetadata & {
  primary_unit?: string
  updated_time?: string
}

export const denomMetadataCollection = defineCollection<DenomMetadataRow>({
  id: 'whaleswap_denom_metadata',
  getKey: (row) => row.base,
})

export type ModuleMetricsRow = TradeMetrics & {
  snapshot_height?: string
  snapshot_time?: string
}

export const moduleMetricsCollection = defineCollection<ModuleMetricsRow>({
  id: 'whaleswap_metrics',
  getKey: () => 'module',
})

export type DenomMarketcapRow = {
  denom: string
  price_udys: string
  marketcap_udys: string
  supply: string
  liquidity_udys: string
  contributing_pools: string[]
  contributing_pool_liquidity?: Record<string, string>
  config_hash: string
  height?: string
  computed_time?: string
  status?: 'ok' | 'illiquid' | 'no_price'
}

export const denomMarketcapsCollection = defineCollection<DenomMarketcapRow>({
  id: 'whaleswap_denom_marketcaps',
  getKey: (row) => `${row.config_hash}:${row.denom}`,
})

export type PairSnapshotRow = {
  pair_key: string
  base_denom: string
  quote_denom: string
  pools: string[]
  offers: string[]
  auctions: string[]
  updated_height?: string
  updated_time?: string
}

export const pairSnapshotsCollection = defineCollection<PairSnapshotRow>({
  id: 'whaleswap_pair_snapshots',
  getKey: (row) => row.pair_key,
})

export function canonicalPairKey(base: string, quote: string) {
  return `${base}__${quote}`
}
