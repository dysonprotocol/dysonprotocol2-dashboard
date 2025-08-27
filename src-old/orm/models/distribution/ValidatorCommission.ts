import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class ValidatorCommission extends Model {
  static entity = 'validator_commissions'
  static primaryKey = ['validator_address', 'denom']

  static fields() {
    return {
      validator_address: this.string(''),
      denom: this.string(''),
      amount: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, validator: string) {
          return this.get(`/cosmos/distribution/v1beta1/validators/${validator}/commission`, {
            dataTransformer: ({ data }: { data: { commission?: { commission?: Coin[] } } }) =>
              (Array.isArray(data?.commission?.commission) ? data.commission!.commission! : []).map(
                (c) => ({
                  validator_address: validator,
                  denom: c.denom,
                  amount: c.amount,
                })
              ),
          })
        },
        async withdrawCommission(
          this: Request,
          params: {
            validatorAddress: string
            signerAddress: string
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
          const { validatorAddress, signerAddress, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
            validator_address: validatorAddress,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: signerAddress,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Withdraw validator commission failed')
          // Refresh commission data
          await this.get(`/cosmos/distribution/v1beta1/validators/${validatorAddress}/commission`, {
            dataTransformer: ({ data }: { data: { commission?: { commission?: Coin[] } } }) =>
              (Array.isArray(data?.commission?.commission) ? data.commission!.commission! : []).map(
                (c) => ({
                  validator_address: validatorAddress,
                  denom: c.denom,
                  amount: c.amount,
                })
              ),
          })
          return res
        },
      },
    },
  }
}

export default ValidatorCommission
