import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type ParamsResponse = {
  params?: {
    min_deposit?: Coin[]
    max_deposit_period?: string
    voting_period?: string
    quorum?: string
    threshold?: string
    veto_threshold?: string
    min_initial_deposit_ratio?: string
    proposal_cancel_ratio?: string
    proposal_cancel_dest?: string
    expedited_voting_period?: string
    expedited_threshold?: string
    expedited_min_deposit?: Coin[]
    burn_vote_quorum?: boolean
    burn_proposal_deposit_prevote?: boolean
    burn_vote_veto?: boolean
    min_deposit_ratio?: string
  }
}

export class GovParams extends Model {
  static entity = 'gov_params'
  static primaryKey = 'key'

  static fields() {
    return {
      key: this.string('default'),
      min_deposit: this.attr([] as Coin[]),
      max_deposit_period: this.string(''),
      voting_period: this.string(''),
      quorum: this.string(''),
      threshold: this.string(''),
      veto_threshold: this.string(''),
      min_initial_deposit_ratio: this.string(''),
      proposal_cancel_ratio: this.string(''),
      proposal_cancel_dest: this.string(''),
      expedited_voting_period: this.string(''),
      expedited_threshold: this.string(''),
      expedited_min_deposit: this.attr([] as Coin[]),
      burn_vote_quorum: this.boolean(false),
      burn_proposal_deposit_prevote: this.boolean(false),
      burn_vote_veto: this.boolean(false),
      min_deposit_ratio: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          // Query endpoint requires a params_type path segment, but the full
          // Params object is returned in the `params` field regardless.
          return this.get(`/cosmos/gov/v1/params/voting`, {
            dataTransformer: ({ data }: { data: ParamsResponse }) => {
              const p = data?.params || {}
              return [
                {
                  key: 'default',
                  min_deposit: Array.isArray(p.min_deposit) ? p.min_deposit : [],
                  max_deposit_period: String(p.max_deposit_period || ''),
                  voting_period: String(p.voting_period || ''),
                  quorum: String(p.quorum || ''),
                  threshold: String(p.threshold || ''),
                  veto_threshold: String(p.veto_threshold || ''),
                  min_initial_deposit_ratio: String(p.min_initial_deposit_ratio || ''),
                  proposal_cancel_ratio: String(p.proposal_cancel_ratio || ''),
                  proposal_cancel_dest: String(p.proposal_cancel_dest || ''),
                  expedited_voting_period: String(p.expedited_voting_period || ''),
                  expedited_threshold: String(p.expedited_threshold || ''),
                  expedited_min_deposit: Array.isArray(p.expedited_min_deposit)
                    ? p.expedited_min_deposit
                    : [],
                  burn_vote_quorum: Boolean(p.burn_vote_quorum),
                  burn_proposal_deposit_prevote: Boolean(p.burn_proposal_deposit_prevote),
                  burn_vote_veto: Boolean(p.burn_vote_veto),
                  min_deposit_ratio: String(p.min_deposit_ratio || ''),
                },
              ]
            },
          })
        },
        async fetchByType(this: Request, paramsType: 'voting' | 'tallying' | 'deposit') {
          return this.get(`/cosmos/gov/v1/params/${paramsType}`, {
            dataTransformer: ({ data }: { data: ParamsResponse }) => {
              const p = data?.params || {}
              return [
                {
                  key: 'default',
                  min_deposit: Array.isArray(p.min_deposit) ? p.min_deposit : [],
                  max_deposit_period: String(p.max_deposit_period || ''),
                  voting_period: String(p.voting_period || ''),
                  quorum: String(p.quorum || ''),
                  threshold: String(p.threshold || ''),
                  veto_threshold: String(p.veto_threshold || ''),
                  min_initial_deposit_ratio: String(p.min_initial_deposit_ratio || ''),
                  proposal_cancel_ratio: String(p.proposal_cancel_ratio || ''),
                  proposal_cancel_dest: String(p.proposal_cancel_dest || ''),
                  expedited_voting_period: String(p.expedited_voting_period || ''),
                  expedited_threshold: String(p.expedited_threshold || ''),
                  expedited_min_deposit: Array.isArray(p.expedited_min_deposit)
                    ? p.expedited_min_deposit
                    : [],
                  burn_vote_quorum: Boolean(p.burn_vote_quorum),
                  burn_proposal_deposit_prevote: Boolean(p.burn_proposal_deposit_prevote),
                  burn_vote_veto: Boolean(p.burn_vote_veto),
                  min_deposit_ratio: String(p.min_deposit_ratio || ''),
                },
              ]
            },
          })
        },
        async updateParams(
          this: Request,
          params: {
            authority: string
            params: NonNullable<ParamsResponse['params']>
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
          const { authority, params: newParams, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.gov.v1.MsgUpdateParams',
            authority,
            params: newParams,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          if (!res?.success) throw new Error(res?.rawLog || 'Gov update params failed')
          await this.get(`/cosmos/gov/v1/params/voting`)
          return res
        },
      },
    },
  }
}

export default GovParams
