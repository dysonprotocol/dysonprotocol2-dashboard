import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class DelegatorWithdrawAddress extends Model {
  static entity = 'delegator_withdraw_address'
  static primaryKey = 'delegator_address'

  static fields() {
    return {
      delegator_address: this.string(''),
      withdraw_address: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, delegator: string) {
          return this.get(`/cosmos/distribution/v1beta1/delegators/${delegator}/withdraw_address`, {
            dataTransformer: ({ data }: { data: { withdraw_address?: string } }) => [
              {
                delegator_address: delegator,
                withdraw_address: String(data?.withdraw_address || ''),
              },
            ],
          })
        },
      },
    },
  }
}

export default DelegatorWithdrawAddress
