import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import { useAxiosRepo } from '@pinia-orm/axios'
import Validator from '@/orm/models/staking/Validator'
import DelegatorUnbonding from '@/orm/models/staking/Unbonding'

type DelegationsResp = {
  delegation_responses?: Array<{
    delegation?: {
      delegator_address?: string
      validator_address?: string
      shares?: string | number
    }
  }>
}

function refreshDelegations(this: Request, delegator: string) {
  return this.get(`/cosmos/staking/v1beta1/delegations/${delegator}`, {
    dataTransformer: ({ data }: { data: DelegationsResp }) =>
      (Array.isArray(data?.delegation_responses) ? data.delegation_responses : []).map((d) => ({
        delegator_address: d?.delegation?.delegator_address,
        validator_address: d?.delegation?.validator_address,
        shares: String(d?.delegation?.shares ?? '0'),
      })),
  })
}

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class Delegation extends Model {
  static entity = 'delegations'
  static primaryKey = ['delegator_address', 'validator_address']

  static fields() {
    return {
      delegator_address: this.string(''),
      validator_address: this.string(''),
      shares: this.string('0'),
      // avoid circular import; eager-load by delegator_address if needed
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByDelegator(this: Request, delegator: string) {
          return refreshDelegations.call(this, delegator)
        },
        async delegate(
          this: Request,
          params: {
            delegatorAddress: string
            validatorAddress: string
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
          const { delegatorAddress, validatorAddress, amount, denom, wallet, gasLimit, memo } =
            params
          const msg = {
            '@type': '/cosmos.staking.v1beta1.MsgDelegate',
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
            amount: { denom, amount },
          }

          const result = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          ensureOk(result, 'Delegate failed')
          await refreshDelegations.call(this, delegatorAddress)
          // Also refresh validators list to keep UI in sync with any state changes
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(validatorAddress)
          } catch (e) {
            // Non-fatal: UI can still function with stale validator
            console.warn('[Delegation.delegate] Failed to refresh validator:', e)
          }

          return result
        },
        async undelegate(
          this: Request,
          params: {
            delegatorAddress: string
            validatorAddress: string
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
          const { delegatorAddress, validatorAddress, amount, denom, wallet, gasLimit, memo } =
            params
          const msg = {
            '@type': '/cosmos.staking.v1beta1.MsgUndelegate',
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
            amount: { denom, amount },
          }
          const result = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          ensureOk(result, 'Undelegate failed')
          await refreshDelegations.call(this, delegatorAddress)
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(validatorAddress)
          } catch (e) {
            console.warn('[Delegation.undelegate] Failed to refresh validator:', e)
          }
          try {
            await useAxiosRepo(DelegatorUnbonding).api().fetchAll(delegatorAddress)
          } catch (e) {
            console.warn('[Delegation.undelegate] Failed to refresh unbondings:', e)
          }
          return result
        },
        async cancelUnbondingDelegation(
          this: Request,
          params: {
            delegatorAddress: string
            validatorAddress: string
            amount: string
            denom: string
            creationHeight: string | number
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
            validatorAddress,
            amount,
            denom,
            creationHeight,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
            amount: { denom, amount },
            creation_height:
              typeof creationHeight === 'number' ? creationHeight : Number(creationHeight),
          }
          const result = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: delegatorAddress,
          })
          ensureOk(result, 'Cancel unbonding delegation failed')
          try {
            await useAxiosRepo(DelegatorUnbonding).api().fetchAll(delegatorAddress)
          } catch (e) {
            console.warn('[Delegation.cancelUnbondingDelegation] Failed to refresh unbondings:', e)
          }
          await refreshDelegations.call(this, delegatorAddress)
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(validatorAddress)
          } catch (e) {
            console.warn('[Delegation.cancelUnbondingDelegation] Failed to refresh validator:', e)
          }
          return result
        },
      },
    },
  }
}

export default Delegation
