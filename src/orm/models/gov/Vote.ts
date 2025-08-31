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
      options: this.attr([] as Array<{ option: string | number; weight: string }>),
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
                votes?: Array<{
                  proposal_id?: string | number
                  voter?: string
                  metadata?: string
                  options?: Array<{ option?: number; weight?: string }>
                }>
              }
            }) => {
              const list = Array.isArray(data?.votes) ? data.votes : []
              type ApiVote = {
                proposal_id?: string | number
                voter?: string
                metadata?: string
                options?: Array<{ option?: number; weight?: string }>
              }
              const rows: Array<{
                proposal_id: string
                voter: string
                metadata: string
                options: Array<{ option: string | number; weight: string }>
              }> = []
              for (const v of list as ApiVote[]) {
                const pid = String(v?.proposal_id ?? proposalId)
                const voterAddr = String(v?.voter || '')
                if (!pid || !voterAddr) continue
                rows.push({
                  proposal_id: pid,
                  voter: voterAddr,
                  metadata: String(v?.metadata || ''),
                  options: Array.isArray(v?.options)
                    ? (v.options || []).map((o: { option?: number | string; weight?: string }) => ({
                        option: o?.option as unknown as string | number,
                        weight: String(o?.weight || '0'),
                      }))
                    : [],
                })
              }
              return rows
            },
          })
        },
        async fetchOne(this: Request, proposalId: string | number, voter: string) {
          return this.get(`/cosmos/gov/v1/proposals/${proposalId}/votes/${voter}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                vote?: {
                  proposal_id?: string | number
                  voter?: string
                  metadata?: string
                  options?: Array<{ option?: number; weight?: string }>
                }
              }
            }) => {
              type ApiVoteOne = {
                proposal_id?: string | number
                voter?: string
                metadata?: string
                options?: Array<{ option?: number; weight?: string }>
              }
              const v = (data?.vote || {}) as ApiVoteOne
              const pid = String(v?.proposal_id ?? proposalId)
              const voterAddr = String(v?.voter || voter || '')
              if (!pid || !voterAddr) return []
              return [
                {
                  proposal_id: pid,
                  voter: voterAddr,
                  metadata: String(v?.metadata || ''),
                  options: Array.isArray(v?.options)
                    ? (v.options || []).map((o: { option?: number | string; weight?: string }) => ({
                        option: o?.option as unknown as string | number,
                        weight: String(o?.weight || '0'),
                      }))
                    : [],
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
