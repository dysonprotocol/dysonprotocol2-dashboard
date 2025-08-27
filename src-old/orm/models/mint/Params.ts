import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type ParamsResponse = {
  params?: {
    mint_denom?: string
    inflation_rate_change?: string
    inflation_max?: string
    inflation_min?: string
    goal_bonded?: string
    blocks_per_year?: string | number
  }
}

export class MintParams extends Model {
  static entity = 'mint_params'
  static primaryKey = 'key'

  static fields() {
    return {
      key: this.string('default'),
      mint_denom: this.string(''),
      inflation_rate_change: this.string(''),
      inflation_max: this.string(''),
      inflation_min: this.string(''),
      goal_bonded: this.string(''),
      blocks_per_year: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/mint/v1beta1/params`, {
            dataTransformer: ({ data }: { data: ParamsResponse }) => {
              const p = data?.params || {}
              return [
                {
                  key: 'default',
                  mint_denom: String(p.mint_denom || ''),
                  inflation_rate_change: String(p.inflation_rate_change || ''),
                  inflation_max: String(p.inflation_max || ''),
                  inflation_min: String(p.inflation_min || ''),
                  goal_bonded: String(p.goal_bonded || ''),
                  blocks_per_year: String(p.blocks_per_year ?? ''),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default MintParams
