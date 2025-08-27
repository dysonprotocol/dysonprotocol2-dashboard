import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Params = {
  signed_blocks_window?: string | number
  min_signed_per_window?: string
  downtime_jail_duration?: string
  slash_fraction_double_sign?: string
  slash_fraction_downtime?: string
}

export class SlashingParams extends Model {
  static entity = 'slashing_params'
  static primaryKey = 'key'

  static fields() {
    return {
      key: this.string('default'),
      signed_blocks_window: this.string('0'),
      min_signed_per_window: this.string('0'),
      downtime_jail_duration: this.string('0s'),
      slash_fraction_double_sign: this.string('0'),
      slash_fraction_downtime: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchParams(this: Request) {
          return this.get(`/cosmos/slashing/v1beta1/params`, {
            dataTransformer: ({ data }: { data: { params?: Params } }) => {
              const p = data?.params || {}
              return [
                {
                  key: 'default',
                  signed_blocks_window: String(p.signed_blocks_window ?? '0'),
                  min_signed_per_window: String(p.min_signed_per_window ?? '0'),
                  downtime_jail_duration: String(p.downtime_jail_duration ?? '0s'),
                  slash_fraction_double_sign: String(p.slash_fraction_double_sign ?? '0'),
                  slash_fraction_downtime: String(p.slash_fraction_downtime ?? '0'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default SlashingParams
