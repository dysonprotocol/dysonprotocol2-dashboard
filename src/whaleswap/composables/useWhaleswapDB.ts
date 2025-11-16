/**
 * TanStack DB Learning Implementation for Whaleswap
 *
 * TanStack DB provides:
 * - ⚡ Sub-millisecond live queries (IndexedDB)
 * - 🎯 Fine-grained reactivity (only re-render what changed)
 * - 💪 Optimistic mutations with rollback
 * - 🌟 Normalized data storage
 */

import { createCollection } from '@tanstack/db'
import type { Trade, Pool, OfferData, AuctionRecord } from '../utils/types'

/**
 * Trades Collection - Local store for all trades
 */
export const tradesCollection = createCollection<Trade, string>({
  id: 'whaleswap_trades',
  getKey: (trade) => trade.trade_id,
  startSync: true,
  sync: {
    sync: async () => {
      // Sync logic is handled externally via TanStack Query + watchEffect
    },
  },
  // Handle inserts from server sync (non-user actions)
  onInsert: async ({ transaction }) => {
    // Server data is already persisted, just update local DB
    // No server call needed since this is a sync operation
    const trade = transaction.mutations[0].modified
    console.log('[TanStack DB] Synced trade to local DB:', trade.trade_id)
  },
  onUpdate: async ({ transaction }) => {
    const trade = transaction.mutations[0].modified
    console.log('[TanStack DB] Updated trade in local DB:', trade.trade_id)
  },
  onDelete: async ({ transaction }) => {
    const key = transaction.mutations[0].key
    console.log('[TanStack DB] Deleted trade from local DB:', key)
  },
})
startCollectionSync(tradesCollection)

/**
 * Pools Collection
 */
export const poolsCollection = createCollection<Pool, string>({
  id: 'whaleswap_pools',
  getKey: (pool) => pool.pool_id,
  startSync: true,
  sync: { sync: async () => {} },
  onInsert: async () => {},
  onUpdate: async () => {},
  onDelete: async () => {},
})
startCollectionSync(poolsCollection)

/**
 * Offers Collection
 */
export const offersCollection = createCollection<OfferData, string>({
  id: 'whaleswap_offers',
  getKey: (offer) => offer.offer_id,
  startSync: true,
  sync: { sync: async () => {} },
  onInsert: async () => {},
  onUpdate: async () => {},
  onDelete: async () => {},
})
startCollectionSync(offersCollection)

/**
 * Auctions Collection
 */
export const auctionsCollection = createCollection<AuctionRecord, string>({
  id: 'whaleswap_auctions',
  getKey: (auction) => auction.auction_id,
  startSync: true,
  sync: { sync: async () => {} },
  onInsert: async () => {},
  onUpdate: async () => {},
  onDelete: async () => {},
})
startCollectionSync(auctionsCollection)

function startCollectionSync(collection: { startSyncImmediate?: () => void }) {
  try {
    collection.startSyncImmediate?.()
  } catch (error) {
    console.warn('[TanStack DB] failed to start collection sync', error)
  }
}
