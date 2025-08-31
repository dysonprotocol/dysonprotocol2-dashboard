import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import { useAxiosRepo } from '@pinia-orm/axios'
import Delegation from '@/orm/models/staking/Delegation'

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
      // extra fields from swagger Validator
      consensus_pubkey: this.attr({}),
      jailed: this.boolean(false),
      tokens: this.string(''),
      delegator_shares: this.string(''),
      unbonding_height: this.string(''),
      unbonding_time: this.string(''),
      commission: this.attr({}),
      min_self_delegation: this.string(''),
      unbonding_on_hold_ref_count: this.string(''),
      unbonding_ids: this.attr([] as string[]),
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
                  consensus_pubkey?: unknown
                  jailed?: boolean
                  tokens?: string
                  delegator_shares?: string
                  unbonding_height?: string
                  unbonding_time?: string
                  commission?: unknown
                  min_self_delegation?: string
                  unbonding_on_hold_ref_count?: string
                  unbonding_ids?: string[]
                }>
              }
            }) => {
              const list = Array.isArray(data?.validators) ? data.validators : []
              return list.map((v) => ({
                operator_address: v.operator_address,
                moniker: v.description?.moniker ?? v.moniker ?? '',
                status: v.status ?? '',
                description: v.description ?? {},
                consensus_pubkey: v.consensus_pubkey ?? {},
                jailed: !!v.jailed,
                tokens: v.tokens ?? '',
                delegator_shares: v.delegator_shares ?? '',
                unbonding_height: v.unbonding_height ?? '',
                unbonding_time: v.unbonding_time ?? '',
                commission: v.commission ?? {},
                min_self_delegation: v.min_self_delegation ?? '',
                unbonding_on_hold_ref_count: v.unbonding_on_hold_ref_count ?? '',
                unbonding_ids: Array.isArray(v.unbonding_ids) ? v.unbonding_ids : [],
              }))
            },
          })
        },
        async fetchByDelegator(this: Request, delegator: string) {
          return this.get(`/cosmos/staking/v1beta1/delegators/${delegator}/validators`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                validators?: Array<{
                  operator_address: string
                  description?: { moniker?: string }
                  moniker?: string
                  status?: string
                  consensus_pubkey?: unknown
                  jailed?: boolean
                  tokens?: string
                  delegator_shares?: string
                  unbonding_height?: string
                  unbonding_time?: string
                  commission?: unknown
                  min_self_delegation?: string
                  unbonding_on_hold_ref_count?: string
                  unbonding_ids?: string[]
                }>
              }
            }) => {
              const list = Array.isArray(data?.validators) ? data.validators : []
              return list.map((v) => ({
                operator_address: v.operator_address,
                moniker: v.description?.moniker ?? v.moniker ?? '',
                status: v.status ?? '',
                description: v.description ?? {},
                consensus_pubkey: v.consensus_pubkey ?? {},
                jailed: !!v.jailed,
                tokens: v.tokens ?? '',
                delegator_shares: v.delegator_shares ?? '',
                unbonding_height: v.unbonding_height ?? '',
                unbonding_time: v.unbonding_time ?? '',
                commission: v.commission ?? {},
                min_self_delegation: v.min_self_delegation ?? '',
                unbonding_on_hold_ref_count: v.unbonding_on_hold_ref_count ?? '',
                unbonding_ids: Array.isArray(v.unbonding_ids) ? v.unbonding_ids : [],
              }))
            },
          })
        },
        async fetchByOperator(this: Request, operator: string) {
          return this.get(`/cosmos/staking/v1beta1/validators/${operator}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                validator?: {
                  operator_address: string
                  description?: { moniker?: string }
                  moniker?: string
                  status?: string
                  consensus_pubkey?: unknown
                  jailed?: boolean
                  tokens?: string
                  delegator_shares?: string
                  unbonding_height?: string
                  unbonding_time?: string
                  commission?: unknown
                  min_self_delegation?: string
                  unbonding_on_hold_ref_count?: string
                  unbonding_ids?: string[]
                } | null
              }
            }) => {
              const v = data?.validator
              if (!v) return []
              return {
                operator_address: v.operator_address,
                moniker: v.description?.moniker ?? v.moniker ?? '',
                status: v.status ?? '',
                description: v.description ?? {},
                consensus_pubkey: v.consensus_pubkey ?? {},
                jailed: !!v.jailed,
                tokens: v.tokens ?? '',
                delegator_shares: v.delegator_shares ?? '',
                unbonding_height: v.unbonding_height ?? '',
                unbonding_time: v.unbonding_time ?? '',
                commission: v.commission ?? {},
                min_self_delegation: v.min_self_delegation ?? '',
                unbonding_on_hold_ref_count: v.unbonding_on_hold_ref_count ?? '',
                unbonding_ids: Array.isArray(v.unbonding_ids) ? v.unbonding_ids : [],
              }
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
          // Refresh delegations list and validators to reflect changes
          try {
            await useAxiosRepo(Delegation).api().fetchByDelegator(delegatorAddress)
          } catch (e) {
            console.warn('[Validator.beginRedelegate] Failed to refresh delegations:', e)
          }
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(srcValidatorAddress)
          } catch (e) {
            console.warn('[Validator.beginRedelegate] Failed to refresh src validator:', e)
          }
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(dstValidatorAddress)
          } catch (e) {
            console.warn('[Validator.beginRedelegate] Failed to refresh dst validator:', e)
          }
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
          try {
            await useAxiosRepo(Validator).api().fetchByOperator(validatorAddress)
          } catch (e) {
            console.warn('[Validator.unjail] Failed to refresh validator:', e)
          }
          return result
        },
      },
    },
  }
}

export default Validator
