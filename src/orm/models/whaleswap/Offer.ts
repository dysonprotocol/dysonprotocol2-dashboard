import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type OfferData = {
  offer_id?: string | number
  status?: string
  maker?: string
  updated_height?: string | number
  updated_timestamp?: string
  initial_have?: Coin
  initial_want?: Coin
  remaining_have?: Coin
  remaining_want?: Coin
  unit_have_int?: string | number
  unit_want_int?: string | number
  remaining_units?: string | number
  pfand_locked?: Coin
}

export class WhaleswapOffer extends Model {
  static entity = 'whaleswap_offers'
  static primaryKey = 'offer_id'

  static fields() {
    return {
      offer_id: this.string(''),
      status: this.string(''),
      maker: this.string(''),
      updated_height: this.string('0'),
      updated_timestamp: this.string(''),
      initial_have: this.attr({} as Coin),
      initial_want: this.attr({} as Coin),
      remaining_have: this.attr({} as Coin),
      remaining_want: this.attr({} as Coin),
      unit_have_int: this.string('0'),
      unit_want_int: this.string('0'),
      remaining_units: this.string('0'),
      pfand_locked: this.attr({} as Coin),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchOffer(this: Request, offerId: string | number) {
          return this.get(`/dysonprotocol/whaleswap/v1/offers/${offerId}`, {
            dataTransformer: ({ data }: { data: { offer?: OfferData } }) => {
              const o = data?.offer
              if (!o?.offer_id) return []
              return [WhaleswapOffer.transformOne(o)]
            },
          })
        },
        async fetchOffers(
          this: Request,
          params: {
            have_denom?: string
            want_denom?: string
            limit?: string
            next_key?: string
          }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { have_denom, want_denom, limit, next_key } = params || {}
          const qs = new URLSearchParams()
          if (have_denom) qs.set('have_denom', have_denom)
          if (want_denom) qs.set('want_denom', want_denom)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/offers?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                offers?: OfferData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.offers) ? data!.offers! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((o) => o?.offer_id != null)
                .map((o) => WhaleswapOffer.transformOne(o))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchOffersBest(
          this: Request,
          params: { have_denom: string; want_denom: string; limit?: string }
        ) {
          const { have_denom, want_denom, limit } = params
          const qs = new URLSearchParams({ have_denom, want_denom })
          if (limit) qs.set('limit', limit)
          return this.get(`/dysonprotocol/whaleswap/v1/offers/best?${qs}`, {
            dataTransformer: ({ data }: { data: { offers?: OfferData[] } }) => {
              const list = Array.isArray(data?.offers) ? data!.offers! : []
              return list
                .filter((o) => o?.offer_id != null)
                .map((o) => WhaleswapOffer.transformOne(o))
            },
          })
        },
        async fetchOffersByDenom(
          this: Request,
          params: { denom: string; role?: string; limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { denom, role, limit, next_key } = params
          const qs = new URLSearchParams({ denom })
          if (role) qs.set('role', role)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/offers/by_denom?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                offers?: OfferData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.offers) ? data!.offers! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((o) => o?.offer_id != null)
                .map((o) => WhaleswapOffer.transformOne(o))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchOffersByPairPriceRange(
          this: Request,
          params: {
            have_denom: string
            want_denom: string
            min_price?: string
            max_price?: string
            limit?: string
            next_key?: string
          }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { have_denom, want_denom, min_price, max_price, limit, next_key } = params
          const qs = new URLSearchParams({ have_denom, want_denom })
          if (min_price) qs.set('min_price', min_price)
          if (max_price) qs.set('max_price', max_price)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/offers/by_pair_price?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                offers?: OfferData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.offers) ? data!.offers! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((o) => o?.offer_id != null)
                .map((o) => WhaleswapOffer.transformOne(o))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchOffersByOwner(
          this: Request,
          params: { owner: string; status?: string; limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { owner, status, limit, next_key } = params
          const qs = new URLSearchParams()
          if (status) qs.set('status', status)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/offers/owner/${owner}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                offers?: OfferData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.offers) ? data!.offers! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((o) => o?.offer_id != null)
                .map((o) => WhaleswapOffer.transformOne(o))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
      },
    },
  }

  static transformOne(o: OfferData) {
    return {
      offer_id: String(o.offer_id ?? ''),
      status: String(o.status || ''),
      maker: String(o.maker || ''),
      updated_height: String(o.updated_height ?? '0'),
      updated_timestamp: String(o.updated_timestamp || ''),
      initial_have: (o.initial_have || { denom: '', amount: '0' }) as Coin,
      initial_want: (o.initial_want || { denom: '', amount: '0' }) as Coin,
      remaining_have: (o.remaining_have || { denom: '', amount: '0' }) as Coin,
      remaining_want: (o.remaining_want || { denom: '', amount: '0' }) as Coin,
      unit_have_int: String(o.unit_have_int ?? '0'),
      unit_want_int: String(o.unit_want_int ?? '0'),
      remaining_units: String(o.remaining_units ?? '0'),
      pfand_locked: (o.pfand_locked || { denom: '', amount: '0' }) as Coin,
    }
  }
}

export default WhaleswapOffer
