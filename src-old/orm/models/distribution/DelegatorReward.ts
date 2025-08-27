import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class DelegatorReward extends Model {
  static entity = 'delegator_rewards'
  static primaryKey = ['delegator_address', 'validator_address', 'denom']

  static fields() {
    return {
      delegator_address: this.string(''),
      validator_address: this.string(''),
      denom: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAll(this: Request, delegator: string) {
          return this.get(`/cosmos/distribution/v1beta1/delegators/${delegator}/rewards`, {
            dataTransformer: ({
              data,
            }: {
              data: { rewards?: Array<{ validator_address?: string; reward?: Coin[] }> }
            }) => {
              const rewards = Array.isArray(data?.rewards) ? data.rewards : []
              const rows: any[] = []
              for (const r of rewards) {
                const va = r?.validator_address || ''
                const coins = Array.isArray(r?.reward) ? r!.reward! : []
                for (const c of coins)
                  rows.push({
                    delegator_address: delegator,
                    validator_address: va,
                    denom: c.denom,
                    amount: c.amount,
                  })
              }
              return rows
            },
          })
        },
        async fetchByValidator(this: Request, delegator: string, validator: string) {
          return this.get(
            `/cosmos/distribution/v1beta1/delegators/${delegator}/rewards/${validator}`,
            {
              dataTransformer: ({ data }: { data: { rewards?: Coin[] } }) =>
                (Array.isArray(data?.rewards) ? data.rewards : []).map((c) => ({
                  delegator_address: delegator,
                  validator_address: validator,
                  denom: c.denom,
                  amount: c.amount,
                })),
            }
          )
        },
        async withdrawRewards(
          this: Request,
          params: {
            delegatorAddress: string
            validatorAddress: string
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
          const { delegatorAddress, validatorAddress, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Withdraw rewards failed')
          return res
        },
        async setWithdrawAddress(
          this: Request,
          params: {
            delegatorAddress: string
            withdrawAddress: string
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
          const { delegatorAddress, withdrawAddress, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress',
            delegator_address: delegatorAddress,
            withdraw_address: withdrawAddress,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set withdraw address failed')
          return res
        },
      },
    },
  }
}

export default DelegatorReward
