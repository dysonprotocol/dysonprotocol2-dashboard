import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type TradeData = {
  trade_id?: string | number
  offer_id?: string | number
  taker?: string
  height?: string | number
  timestamp?: string
  sent?: Coin
  received?: Coin
  pool_id?: string | number
  auction_id?: string | number
}

export class WhaleswapTrade extends Model {
  static entity = 'whaleswap_trades'
  static primaryKey = 'trade_id'

  static fields() {
    return {
      trade_id: this.string(''),
      offer_id: this.string(''),
      pool_id: this.string('0'),
      auction_id: this.string('0'),
      taker: this.string(''),
      height: this.string('0'),
      timestamp: this.string(''),
      sent: this.attr({} as Coin),
      received: this.attr({} as Coin),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchTrade(this: Request, tradeId: string | number) {
          return this.get(`/dysonprotocol/whaleswap/v1/trades/${tradeId}`, {
            dataTransformer: ({ data }: { data: { trade?: TradeData } }) => {
              const t = data?.trade
              if (!t?.trade_id) return []
              return [WhaleswapTrade.transformOne(t)]
            },
          })
        },
        async fetchTradesByOffer(
          this: Request,
          offerId: string | number,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/trades/offer/${offerId}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                trades?: TradeData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.trades) ? data!.trades! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((t) => t?.trade_id != null)
                .map((t) => WhaleswapTrade.transformOne(t))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
        async fetchTradesByPool(
          this: Request,
          poolId: string | number,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/trades/pool/${poolId}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                trades?: TradeData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.trades) ? data!.trades! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((t) => t?.trade_id != null)
                .map((t) => WhaleswapTrade.transformOne(t))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
        async fetchTradesByTaker(
          this: Request,
          taker: string,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/trades/taker/${taker}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                trades?: TradeData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.trades) ? data!.trades! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((t) => t?.trade_id != null)
                .map((t) => WhaleswapTrade.transformOne(t))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
      },
    },
  }

  static transformOne(t: TradeData) {
    return {
      trade_id: String(t.trade_id ?? ''),
      offer_id: String(t.offer_id ?? ''),
      taker: String(t.taker || ''),
      height: String(t.height ?? '0'),
      timestamp: String(t.timestamp || ''),
      sent: (t.sent || { denom: '', amount: '0' }) as Coin,
      received: (t.received || { denom: '', amount: '0' }) as Coin,
      pool_id: String(t.pool_id ?? '0'),
      auction_id: String(t.auction_id ?? '0'),
    }
  }
}

export default WhaleswapTrade
