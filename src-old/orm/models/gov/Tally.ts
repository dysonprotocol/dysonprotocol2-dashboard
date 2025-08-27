import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class GovTally extends Model {
  static entity = 'gov_tallies'
  static primaryKey = 'proposal_id'

  static fields() {
    return {
      proposal_id: this.string(''),
      yes_count: this.string('0'),
      abstain_count: this.string('0'),
      no_count: this.string('0'),
      no_with_veto_count: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, proposalId: string | number) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/tally`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                tally?: {
                  yes_count?: string
                  abstain_count?: string
                  no_count?: string
                  no_with_veto_count?: string
                }
              }
            }) => {
              const t =
                (data as any)?.tally ||
                (data as any)?.tally_result ||
                (data as any)?.tallyResult ||
                {}
              return [
                {
                  proposal_id: String(proposalId),
                  yes_count: String(t.yes_count || '0'),
                  abstain_count: String(t.abstain_count || '0'),
                  no_count: String(t.no_count || '0'),
                  no_with_veto_count: String(t.no_with_veto_count || '0'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default GovTally
