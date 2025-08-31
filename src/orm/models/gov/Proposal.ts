import { Model } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import type { Request } from '@pinia-orm/axios'
import GovTally from '@/orm/models/gov/Tally'
import GovVote from '@/orm/models/gov/Vote'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

type AnyMsg = Record<string, unknown>

export class GovProposal extends Model {
  static entity = 'gov_proposals'
  static primaryKey = 'id'

  static fields() {
    return {
      id: this.string(''),
      title: this.string(''),
      summary: this.string(''),
      status: this.string(''),
      proposer: this.string(''),
      metadata: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchProposals(this: Request) {
          return this.get(`/cosmos/gov/v1/proposals`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                proposals?: Array<{
                  id?: string | number
                  title?: string
                  summary?: string
                  status?: string
                  proposer?: string
                  metadata?: string
                }>
              }
            }) => {
              const list = Array.isArray(data?.proposals) ? data.proposals : []
              return list
                .filter((p) => p?.id != null)
                .map((p) => ({
                  id: String(p.id),
                  title: String(p.title || ''),
                  summary: String(p.summary || ''),
                  status: String(p.status || ''),
                  proposer: String(p.proposer || ''),
                  metadata: String(p.metadata || ''),
                }))
            },
          })
        },
        async fetchProposal(this: Request, id: string | number) {
          return this.get(`/cosmos/gov/v1/proposals/${id}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                proposal?: {
                  id?: string | number
                  title?: string
                  summary?: string
                  status?: string
                  proposer?: string
                  metadata?: string
                }
              }
            }) => {
              const p = data?.proposal
              if (!p?.id) return []
              return [
                {
                  id: String(p.id),
                  title: String(p.title || ''),
                  summary: String(p.summary || ''),
                  status: String(p.status || ''),
                  proposer: String(p.proposer || ''),
                  metadata: String(p.metadata || ''),
                },
              ]
            },
          })
        },
        async submitProposal(
          this: Request,
          params: {
            proposer: string
            messages: AnyMsg[]
            initialDeposit: Array<{ denom: string; amount: string }>
            metadata?: string
            title?: string
            summary?: string
            expedited?: boolean
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
            proposer,
            messages,
            initialDeposit,
            metadata,
            title,
            summary,
            expedited,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/cosmos.gov.v1.MsgSubmitProposal',
            proposer,
            messages,
            initial_deposit: initialDeposit,
            ...(metadata ? { metadata } : {}),
            ...(title ? { title } : {}),
            ...(summary ? { summary } : {}),
            ...(typeof expedited === 'boolean' ? { expedited } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: proposer })
          ensureOk(res, 'Gov submit proposal failed')
          // We can't know proposal_id from simplified wallet result; refresh proposals list
          await this.get(`/cosmos/gov/v1/proposals`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                proposals?: Array<{
                  id?: string | number
                  title?: string
                  summary?: string
                  status?: string
                  proposer?: string
                  metadata?: string
                }>
              }
            }) => {
              const list = Array.isArray(data?.proposals) ? data.proposals : []
              return list
                .filter((p) => p?.id != null)
                .map((p) => ({
                  id: String(p.id),
                  title: String(p.title || ''),
                  summary: String(p.summary || ''),
                  status: String(p.status || ''),
                  proposer: String(p.proposer || ''),
                  metadata: String(p.metadata || ''),
                }))
            },
          })
          return res
        },
        async vote(
          this: Request,
          params: {
            proposalId: string | number
            voter: string
            option: number
            metadata?: string
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
          const { proposalId, voter, option, metadata, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.gov.v1.MsgVote',
            proposal_id: String(proposalId),
            voter,
            option,
            ...(metadata ? { metadata } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: voter })
          ensureOk(res, 'Gov vote failed')
          const refreshProposal = this.get(`/cosmos/gov/v1/proposals/${proposalId}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                proposal?: {
                  id?: string | number
                  title?: string
                  summary?: string
                  status?: string
                  proposer?: string
                  metadata?: string
                }
              }
            }) => {
              const p = data?.proposal
              if (!p?.id) return []
              return [
                {
                  id: String(p.id),
                  title: String(p.title || ''),
                  summary: String(p.summary || ''),
                  status: String(p.status || ''),
                  proposer: String(p.proposer || ''),
                  metadata: String(p.metadata || ''),
                },
              ]
            },
          })
          const refreshVote = useAxiosRepo(GovVote).api().fetchOne(proposalId, voter)
          const refreshTally = useAxiosRepo(GovTally).api().fetch(proposalId)
          await Promise.allSettled([refreshProposal, refreshVote, refreshTally])
          return res
        },
        async deposit(
          this: Request,
          params: {
            proposalId: string | number
            depositor: string
            amount: Array<{ denom: string; amount: string }>
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
          const { proposalId, depositor, amount, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.gov.v1.MsgDeposit',
            proposal_id: String(proposalId),
            depositor,
            amount,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: depositor })
          ensureOk(res, 'Gov deposit failed')
          await this.get(`/cosmos/gov/v1/proposals/${proposalId}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                proposal?: {
                  id?: string | number
                  title?: string
                  summary?: string
                  status?: string
                  proposer?: string
                  metadata?: string
                }
              }
            }) => {
              const p = data?.proposal
              if (!p?.id) return []
              return [
                {
                  id: String(p.id),
                  title: String(p.title || ''),
                  summary: String(p.summary || ''),
                  status: String(p.status || ''),
                  proposer: String(p.proposer || ''),
                  metadata: String(p.metadata || ''),
                },
              ]
            },
          })
          return res
        },
      },
    },
  }
}

export default GovProposal
