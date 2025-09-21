import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type ParamsData = {
  pfand_per_offer?: Coin
  valuation_fee_pct?: string
  valuation_period?: string
  bid_timeout?: string
  minimum_bid_percent_increase?: string
}

export class WhaleswapParams extends Model {
  static entity = 'whaleswap_params'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
      pfand_per_offer: this.attr({} as Coin),
      valuation_fee_pct: this.string(''),
      valuation_period: this.string(''),
      bid_timeout: this.string(''),
      minimum_bid_percent_increase: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/dysonprotocol/whaleswap/v1/params`, {
            dataTransformer: ({ data }: { data: { params?: ParamsData } }) => {
              const p = data?.params || {}
              return [
                {
                  default: 'default',
                  pfand_per_offer: (p.pfand_per_offer || { denom: '', amount: '0' }) as Coin,
                  valuation_fee_pct: String(p.valuation_fee_pct || ''),
                  valuation_period: String(p.valuation_period || ''),
                  bid_timeout: String(p.bid_timeout || ''),
                  minimum_bid_percent_increase: String(p.minimum_bid_percent_increase || ''),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default WhaleswapParams
