import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class GovDeposit extends Model {
  static entity = 'gov_deposits'
  static primaryKey = ['proposal_id', 'depositor']

  static fields() {
    return {
      proposal_id: this.string(''),
      depositor: this.string(''),
      amount: this.attr<Coin[]>([]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByProposal(this: Request, proposalId: string | number) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/deposits`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                deposits?: Array<{
                  proposal_id?: string | number
                  depositor?: string
                  amount?: Coin[]
                }>
              }
            }) => {
              const list = Array.isArray(data?.deposits) ? data.deposits : []
              return list
                .filter((d) => d?.depositor)
                .map((d) => ({
                  proposal_id: String(d.proposal_id ?? proposalId),
                  depositor: String(d.depositor || ''),
                  amount: Array.isArray(d.amount) ? d.amount : [],
                }))
            },
          })
        },
        async fetchOne(this: Request, proposalId: string | number, depositor: string) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/deposits/${depositor}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                deposit?: { proposal_id?: string | number; depositor?: string; amount?: Coin[] }
              }
            }) => {
              const d = data?.deposit
              if (!d?.depositor) return []
              return [
                {
                  proposal_id: String(d.proposal_id ?? proposalId),
                  depositor: String(d.depositor || ''),
                  amount: Array.isArray(d.amount) ? d.amount : [],
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default GovDeposit
