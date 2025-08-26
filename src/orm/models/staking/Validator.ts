import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class Validator extends Model {
  static entity = 'validators'
  static primaryKey = 'operator_address'

  static fields() {
    return {
      operator_address: this.string(''),
      moniker: this.string(''),
      status: this.string(''),
      description: this.attr({}),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAll(this: Request) {
          return this.get(`/cosmos/staking/v1beta1/validators`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                validators?: Array<{
                  operator_address: string
                  description?: { moniker?: string }
                  moniker?: string
                  status?: string
                }>
              }
            }) => {
              const list = Array.isArray(data?.validators) ? data.validators : []
              return list.map((v) => ({
                operator_address: v.operator_address,
                moniker: v.description?.moniker ?? v.moniker ?? '',
                status: v.status ?? '',
                description: v.description ?? {},
              }))
            },
          })
        },
        async beginRedelegate(
          this: Request,
          params: {
            delegatorAddress: string
            srcValidatorAddress: string
            dstValidatorAddress: string
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
          const {
            delegatorAddress,
            srcValidatorAddress,
            dstValidatorAddress,
            amount,
            denom,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/cosmos.staking.v1beta1.MsgBeginRedelegate',
            delegator_address: delegatorAddress,
            validator_src_address: srcValidatorAddress,
            validator_dst_address: dstValidatorAddress,
            amount: { denom, amount },
          }

          const result = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          ensureOk(result, 'Begin redelegate failed')
          // Caller can refresh delegations list using Delegation.fetchByDelegator
          return result
        },
        async unjail(
          this: Request,
          params: {
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
          const { validatorAddress, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.slashing.v1beta1.MsgUnjail',
            validator_addr: validatorAddress,
          }
          const result = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: validatorAddress,
          })
          ensureOk(result, 'Unjail failed')
          return result
        },
      },
    },
  }
}

export default Validator
