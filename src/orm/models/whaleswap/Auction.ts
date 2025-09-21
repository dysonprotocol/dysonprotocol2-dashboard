import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type AuctionData = {
  auction_id?: string | number
  class_id?: string
  nft_id?: string
  sell?: Coin
  bid_denom?: string
  seller?: string
}

export class WhaleswapAuction extends Model {
  static entity = 'whaleswap_auctions'
  static primaryKey = 'auction_id'

  static fields() {
    return {
      auction_id: this.string(''),
      class_id: this.string(''),
      nft_id: this.string(''),
      sell: this.attr({} as Coin),
      bid_denom: this.string(''),
      seller: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAuction(this: Request, auctionId: string | number) {
          return this.get(`/dysonprotocol/whaleswap/v1/auctions/${auctionId}`, {
            dataTransformer: ({ data }: { data: { auction?: AuctionData } }) => {
              const a = data?.auction
              if (!a?.auction_id) return []
              return [WhaleswapAuction.transformOne(a)]
            },
          })
        },
        async fetchAuctions(
          this: Request,
          params?: {
            sell_denom?: string
            bid_denom?: string
            limit?: string
            next_key?: string
          }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { sell_denom, bid_denom, limit, next_key } = params || {}
          const qs = new URLSearchParams()
          if (sell_denom) qs.set('sell_denom', sell_denom)
          if (bid_denom) qs.set('bid_denom', bid_denom)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/auctions?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                auctions?: AuctionData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.auctions) ? data!.auctions! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((a) => a?.auction_id != null)
                .map((a) => WhaleswapAuction.transformOne(a))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchAuctionByNFT(this: Request, class_id: string, nft_id: string) {
          const qs = new URLSearchParams({ class_id, nft_id })
          return this.get(`/dysonprotocol/whaleswap/v1/auctions/by_nft?${qs}`, {
            dataTransformer: ({ data }: { data: { auction?: AuctionData } }) => {
              const a = data?.auction
              if (!a?.auction_id) return []
              return [WhaleswapAuction.transformOne(a)]
            },
          })
        },
        async fetchAuctionsBySeller(
          this: Request,
          seller: string,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/auctions/seller/${seller}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                auctions?: AuctionData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.auctions) ? data!.auctions! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((a) => a?.auction_id != null)
                .map((a) => WhaleswapAuction.transformOne(a))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
        async fetchAuctionsByPairPriceRange(
          this: Request,
          params: {
            sell_denom: string
            bid_denom: string
            min_price?: string
            max_price?: string
            limit?: string
            next_key?: string
          }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { sell_denom, bid_denom, min_price, max_price, limit, next_key } = params
          const qs = new URLSearchParams({ sell_denom, bid_denom })
          if (min_price) qs.set('min_price', min_price)
          if (max_price) qs.set('max_price', max_price)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/auctions/by_pair_price?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                auctions?: AuctionData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.auctions) ? data!.auctions! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((a) => a?.auction_id != null)
                .map((a) => WhaleswapAuction.transformOne(a))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
      },
    },
  }

  static transformOne(a: AuctionData) {
    return {
      auction_id: String(a.auction_id ?? ''),
      class_id: String(a.class_id || ''),
      nft_id: String(a.nft_id || ''),
      sell: (a.sell || { denom: '', amount: '0' }) as Coin,
      bid_denom: String(a.bid_denom || ''),
      seller: String(a.seller || ''),
    }
  }
}

export default WhaleswapAuction
