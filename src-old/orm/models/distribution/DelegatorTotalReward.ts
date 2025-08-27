import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class DelegatorTotalReward extends Model {
  static entity = 'delegator_total_rewards'
  static primaryKey = ['delegator_address', 'denom']

  static fields() {
    return {
      delegator_address: this.string(''),
      denom: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, delegator: string) {
          return this.get(`/cosmos/distribution/v1beta1/delegators/${delegator}/rewards`, {
            dataTransformer: ({ data }: { data: { total?: Coin[] } }) =>
              (Array.isArray(data?.total) ? data.total : []).map((c) => ({
                delegator_address: delegator,
                denom: c.denom,
                amount: c.amount,
              })),
          })
        },
      },
    },
  }
}

export default DelegatorTotalReward
