import { useAxiosRepo } from '@pinia-orm/axios'
import { unwrap } from './crontaskEvents'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'

const EVENTS = [
  'dysonprotocol.whaleswap.v1.EventOfferCreated',
  'dysonprotocol.whaleswap.v1.EventOfferUpdated',
  'dysonprotocol.whaleswap.v1.EventOfferCancelled',
  'dysonprotocol.whaleswap.v1.EventTradeExecuted',
  'dysonprotocol.whaleswap.v1.EventPoolCreated',
  'dysonprotocol.whaleswap.v1.EventLiquidityAdded',
  'dysonprotocol.whaleswap.v1.EventLiquidityRemoved',
  'dysonprotocol.whaleswap.v1.EventPoolSwap',
  'dysonprotocol.whaleswap.v1.EventAuctionOpened',
  'dysonprotocol.whaleswap.v1.EventAuctionBidPlaced',
  'dysonprotocol.whaleswap.v1.EventAuctionRedeemed',
  // Optional alternative naming patterns (best-effort)
  'whaleswap.offer.created',
  'whaleswap.offer.updated',
  'whaleswap.offer.cancelled',
  'whaleswap.trade.executed',
  'whaleswap.pool.created',
  'whaleswap.liquidity.added',
  'whaleswap.liquidity.removed',
  'whaleswap.pool.swap',
  'whaleswap.auction.opened',
  'whaleswap.auction.bid_placed',
  'whaleswap.auction.redeemed',
] as const

type WhaleswapEventName = (typeof EVENTS)[number]

interface WhaleswapEventLike {
  type: WhaleswapEventName
  detail?: Record<string, unknown>
}

interface GlobalWithEventListeners {
  addEventListener: (name: WhaleswapEventName, handler: (ev: WhaleswapEventLike) => void) => void
  removeEventListener: (name: WhaleswapEventName, handler: (ev: WhaleswapEventLike) => void) => void
}

let globalInitialized = false

export function ensureGlobalWhaleswapEventSync(args: {
  isKnownAddress: (address: string) => boolean
}): void {
  if (globalInitialized) return
  globalInitialized = true
  const { isKnownAddress } = args

  const handler = (ev: WhaleswapEventLike) => {
    try {
      const detail = ev.detail || undefined
      if (!detail) return

      const offerId = unwrap(detail.offer_id)
      const tradeId = unwrap((detail as Record<string, unknown>).trade_id)
      const poolId = unwrap(detail.pool_id)
      const auctionId = unwrap(detail.auction_id)
      const maker = unwrap((detail as Record<string, unknown>).maker || detail.owner)
      const taker = unwrap((detail as Record<string, unknown>).taker)
      const seller = unwrap((detail as Record<string, unknown>).seller)

      const apis = {
        offer: useAxiosRepo(WhaleswapOffer).api(),
        trade: useAxiosRepo(WhaleswapTrade).api(),
        pool: useAxiosRepo(WhaleswapPool).api(),
        auction: useAxiosRepo(WhaleswapAuction).api(),
      }

      const refresh: Array<Promise<unknown>> = []

      if (offerId) {
        refresh.push(apis.offer.fetchOffer(offerId))
        refresh.push(apis.trade.fetchTradesByOffer(offerId))
      }

      if (tradeId) refresh.push(apis.trade.fetchTrade(tradeId))

      if (poolId) refresh.push(apis.pool.fetchPool(poolId))

      if (auctionId) refresh.push(apis.auction.fetchAuction(auctionId))

      if (maker && isKnownAddress(maker))
        refresh.push(apis.offer.fetchOffersByOwner({ owner: maker }))
      if (taker && isKnownAddress(taker)) refresh.push(apis.trade.fetchTradesByTaker(taker))
      if (seller && isKnownAddress(seller)) refresh.push(apis.auction.fetchAuctionsBySeller(seller))

      if (refresh.length > 0) {
        Promise.allSettled(refresh).catch((e) => console.error('[whaleswap.sync] refresh error', e))
      }
    } catch (e) {
      console.error('[whaleswap.sync] handler error', e)
    }
  }

  const g = globalThis as unknown as GlobalWithEventListeners
  for (const name of EVENTS) g.addEventListener(name, handler)
}

export function subscribeAllWhaleswapEvents(
  onEvent: (name: WhaleswapEventName, detail: Record<string, unknown>) => void
): () => void {
  const handler = (ev: WhaleswapEventLike) => {
    try {
      if (!ev.detail) return
      onEvent(ev.type, ev.detail)
    } catch (e) {
      console.error('[whaleswap.view] handler error', e)
    }
  }
  const g = globalThis as unknown as GlobalWithEventListeners
  for (const name of EVENTS) g.addEventListener(name, handler)
  return () => {
    for (const name of EVENTS) g.removeEventListener(name, handler)
  }
}
