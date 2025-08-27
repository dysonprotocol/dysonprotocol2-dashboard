import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class NftSupply extends Model {
  static entity = 'nft_supply'
  static primaryKey = 'class_id'

  static fields() {
    return {
      class_id: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchSupply(this: Request, classId: string) {
          const qs = new URLSearchParams({ class_id: classId })
          return this.get(`/dysonprotocol/nft/v1beta1/supply?${qs}`, {
            dataTransformer: ({ data }: { data: { amount?: string | number } }) => [
              { class_id: classId, amount: String(data?.amount ?? '0') },
            ],
          })
        },
      },
    },
  }
}

export default NftSupply
