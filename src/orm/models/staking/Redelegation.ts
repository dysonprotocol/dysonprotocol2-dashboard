import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

// note: shapes are validated at runtime by defensive access below

export class Redelegation extends Model {
  static entity = 'redelegations'
  static primaryKey = ['delegator_address', 'src_validator_address', 'dst_validator_address']

  static fields() {
    return {
      delegator_address: this.string(''),
      src_validator_address: this.string(''),
      dst_validator_address: this.string(''),
      entries: this.attr([] as Array<Record<string, unknown>>),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByDelegator(this: Request, delegator: string) {
          return this.get(`/cosmos/staking/v1beta1/delegators/${delegator}/redelegations`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                redelegation_responses?: Array<{
                  redelegation?: {
                    delegator_address?: string
                    validator_src_address?: string
                    validator_dst_address?: string
                  }
                  entries?: Array<Record<string, unknown>>
                }>
              }
            }) => {
              const list = Array.isArray(data?.redelegation_responses)
                ? data!.redelegation_responses!
                : []
              const rows: Array<{
                delegator_address: string
                src_validator_address: string
                dst_validator_address: string
                entries: Array<Record<string, unknown>>
              }> = []
              for (const r of list) {
                const red = (r && (r as Record<string, unknown>).redelegation) || {}
                const src = String((red as Record<string, unknown>)?.validator_src_address || '')
                const dst = String((red as Record<string, unknown>)?.validator_dst_address || '')
                const ents = Array.isArray((r as Record<string, unknown>)?.entries)
                  ? ((r as Record<string, unknown>).entries as Array<Record<string, unknown>>)
                  : []
                rows.push({
                  delegator_address: delegator,
                  src_validator_address: src,
                  dst_validator_address: dst,
                  entries: ents,
                })
              }
              return rows
            },
          })
        },
      },
    },
  }
}

export default Redelegation
