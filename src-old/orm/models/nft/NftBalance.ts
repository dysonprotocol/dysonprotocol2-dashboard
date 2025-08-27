import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class NftBalance extends Model {
  static entity = 'nft_balances'
  static primaryKey = ['class_id', 'owner']

  static fields() {
    return {
      class_id: this.string(''),
      owner: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchBalance(this: Request, classId: string, owner: string) {
          const qs = new URLSearchParams({ class_id: classId, owner })
          let amount = '0'
          await this.get(`/dysonprotocol/nft/v1beta1/balance?${qs}`, {
            dataTransformer: ({ data }: { data: { amount?: string | number } }) => {
              amount = String(data?.amount ?? '0')
              return [{ class_id: classId, owner, amount }]
            },
          })
          return amount
        },
      },
    },
  }
}

export default NftBalance
