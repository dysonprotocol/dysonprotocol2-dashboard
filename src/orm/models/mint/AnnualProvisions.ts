import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class MintAnnualProvisions extends Model {
  static entity = 'mint_annual_provisions'
  static primaryKey = 'key'

  static fields() {
    return {
      key: this.string('default'),
      annual_provisions: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/mint/v1beta1/annual_provisions`, {
            dataTransformer: ({
              data,
            }: {
              data: { annual_provisions?: string | number | Uint8Array }
            }) => {
              return [
                {
                  key: 'default',
                  annual_provisions: String((data as any)?.annual_provisions ?? '0'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default MintAnnualProvisions
