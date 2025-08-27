import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class CommunityPool extends Model {
  static entity = 'community_pool'
  static primaryKey = 'denom'

  static fields() {
    return {
      denom: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/distribution/v1beta1/community_pool`, {
            dataTransformer: ({ data }: { data: { pool?: Coin[] } }) =>
              (Array.isArray(data?.pool) ? data.pool : []).map((c) => ({
                denom: c.denom,
                amount: c.amount,
              })),
          })
        },
        async fund(
          this: Request,
          params: {
            fromAddress: string
            amount: string
            denom: string
            wallet: {
              sendMsg: (args: {
                msg: unknown
                gasLimit?: number | 'auto'
                memo?: string
                executorAddress?: string
              }) => Promise<{ success: boolean; rawLog?: string }>
            }
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { fromAddress, amount, denom, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.distribution.v1beta1.MsgFundCommunityPool',
            depositor: fromAddress,
            amount: [{ denom, amount }],
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: fromAddress,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Fund community pool failed')
          await this.get(`/cosmos/distribution/v1beta1/community_pool`, {
            dataTransformer: ({ data }: { data: { pool?: Coin[] } }) =>
              (Array.isArray(data?.pool) ? data.pool : []).map((c) => ({
                denom: c.denom,
                amount: c.amount,
              })),
          })
          return res
        },
      },
    },
  }
}

export default CommunityPool
