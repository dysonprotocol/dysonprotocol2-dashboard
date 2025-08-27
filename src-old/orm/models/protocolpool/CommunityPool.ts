import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class ProtocolCommunityPool extends Model {
  static entity = 'protocolpool_pool'
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
          return this.get(`/cosmos/protocolpool/v1/community_pool`, {
            dataTransformer: ({
              data,
            }: {
              data: { pool?: Array<{ denom: string; amount: string }> }
            }) => {
              const coins = Array.isArray(data?.pool) ? data.pool : []
              return coins.map((c) => ({ denom: c.denom, amount: c.amount }))
            },
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
            '@type': '/cosmos.protocolpool.v1.MsgFundCommunityPool',
            depositor: fromAddress,
            amount: [{ denom, amount }],
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: fromAddress })
          ensureOk(res, 'ProtocolPool fund failed')
          await this.get(`/cosmos/protocolpool/v1/community_pool`, {
            dataTransformer: ({
              data,
            }: {
              data: { pool?: Array<{ denom: string; amount: string }> }
            }) => {
              const coins = Array.isArray(data?.pool) ? data.pool : []
              return coins.map((c) => ({ denom: c.denom, amount: c.amount }))
            },
          })
          return res
        },
        async spend(
          this: Request,
          params: {
            authority: string
            recipient: string
            coins: Array<{ denom: string; amount: string }>
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
          const { authority, recipient, coins, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.protocolpool.v1.MsgCommunityPoolSpend',
            authority,
            recipient,
            amount: coins,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'ProtocolPool spend failed')
          await this.get(`/cosmos/protocolpool/v1/community_pool`, {
            dataTransformer: ({
              data,
            }: {
              data: { pool?: Array<{ denom: string; amount: string }> }
            }) => {
              const coins = Array.isArray(data?.pool) ? data.pool : []
              return coins.map((c) => ({ denom: c.denom, amount: c.amount }))
            },
          })
          return res
        },
      },
    },
  }
}

export default ProtocolCommunityPool
