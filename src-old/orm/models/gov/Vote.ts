import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class GovVote extends Model {
  static entity = 'gov_votes'
  static primaryKey = ['proposal_id', 'voter']

  static fields() {
    return {
      proposal_id: this.string(''),
      voter: this.string(''),
      // store raw metadata or summarized option; for weighted votes, client can query separately if needed
      metadata: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByProposal(this: Request, proposalId: string | number) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/votes`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                votes?: Array<{ proposal_id?: string | number; voter?: string; metadata?: string }>
              }
            }) => {
              const list = Array.isArray(data?.votes) ? data.votes : []
              return list
                .filter((v) => v?.voter)
                .map((v) => ({
                  proposal_id: String(v.proposal_id ?? proposalId),
                  voter: String(v.voter || ''),
                  metadata: String(v.metadata || ''),
                }))
            },
          })
        },
        async fetchOne(this: Request, proposalId: string | number, voter: string) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/votes/${voter}`, {
            dataTransformer: ({
              data,
            }: {
              data: { vote?: { proposal_id?: string | number; voter?: string; metadata?: string } }
            }) => {
              const v = data?.vote
              if (!v?.voter) return []
              return [
                {
                  proposal_id: String(v.proposal_id ?? proposalId),
                  voter: String(v.voter || ''),
                  metadata: String(v.metadata || ''),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default GovVote
