import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type ParamsResponse = {
  params?: {
    mint_fee_per_coin?: string
    min_bid_timeout_class?: string
    max_bid_timeout_class?: string
    min_reject_bid_valuation_fee_percent?: string
    max_reject_bid_valuation_fee_percent?: string
    min_minimum_bid_percent_increase?: string
    max_minimum_bid_percent_increase?: string
    min_valuation_fee_pct?: string
    max_valuation_fee_pct?: string
    min_valuation_period?: string
    max_valuation_period?: string
  }
}

export class NameserviceParams extends Model {
  static entity = 'nameservice_params'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
      mint_fee_per_coin: this.string('0'),
      min_bid_timeout_class: this.string('0s'),
      max_bid_timeout_class: this.string('0s'),
      min_reject_bid_valuation_fee_percent: this.string('0'),
      max_reject_bid_valuation_fee_percent: this.string('0'),
      min_minimum_bid_percent_increase: this.string('0'),
      max_minimum_bid_percent_increase: this.string('0'),
      min_valuation_fee_pct: this.string('0'),
      max_valuation_fee_pct: this.string('0'),
      min_valuation_period: this.string('0s'),
      max_valuation_period: this.string('0s'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/dysonprotocol/nameservice/v1/params`, {
            dataTransformer: ({ data }: { data: ParamsResponse }) => {
              const p = data?.params || {}
              return [
                {
                  default: 'default',
                  mint_fee_per_coin: String(p.mint_fee_per_coin ?? '0'),
                  min_bid_timeout_class: String(p.min_bid_timeout_class ?? '0s'),
                  max_bid_timeout_class: String(p.max_bid_timeout_class ?? '0s'),
                  min_reject_bid_valuation_fee_percent: String(
                    p.min_reject_bid_valuation_fee_percent ?? '0'
                  ),
                  max_reject_bid_valuation_fee_percent: String(
                    p.max_reject_bid_valuation_fee_percent ?? '0'
                  ),
                  min_minimum_bid_percent_increase: String(
                    p.min_minimum_bid_percent_increase ?? '0'
                  ),
                  max_minimum_bid_percent_increase: String(
                    p.max_minimum_bid_percent_increase ?? '0'
                  ),
                  min_valuation_fee_pct: String(p.min_valuation_fee_pct ?? '0'),
                  max_valuation_fee_pct: String(p.max_valuation_fee_pct ?? '0'),
                  min_valuation_period: String(p.min_valuation_period ?? '0s'),
                  max_valuation_period: String(p.max_valuation_period ?? '0s'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default NameserviceParams
