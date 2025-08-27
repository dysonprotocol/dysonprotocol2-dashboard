import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class MintInflation extends Model {
  static entity = 'mint_inflation'
  static primaryKey = 'key'

  static fields() {
    return {
      key: this.string('default'),
      inflation: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/mint/v1beta1/inflation`, {
            dataTransformer: ({ data }: { data: { inflation?: string | number | Uint8Array } }) => {
              // The API returns a cosmos Dec encoded; treat as string for UI
              return [
                {
                  key: 'default',
                  inflation: String((data as any)?.inflation ?? '0'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default MintInflation
