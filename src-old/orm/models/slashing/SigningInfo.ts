import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type SigningInfo = {
  address?: string
  start_height?: string | number
  index_offset?: string | number
  jailed_until?: string
  tombstoned?: boolean
  missed_blocks_counter?: string | number
}

export class SlashingSigningInfo extends Model {
  static entity = 'slashing_signing_infos'
  static primaryKey = 'cons_address'

  static fields() {
    return {
      cons_address: this.string(''),
      start_height: this.string('0'),
      index_offset: this.string('0'),
      jailed_until: this.string(''),
      tombstoned: this.attr(false),
      missed_blocks_counter: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, consAddress: string) {
          return this.get(`/cosmos/slashing/v1beta1/signing_infos/${consAddress}`, {
            dataTransformer: ({ data }: { data: { val_signing_info?: SigningInfo } }) => {
              const s = data?.val_signing_info
              if (!s?.address) return []
              return [
                {
                  cons_address: s.address || consAddress,
                  start_height: String(s.start_height ?? '0'),
                  index_offset: String(s.index_offset ?? '0'),
                  jailed_until: String(s.jailed_until ?? ''),
                  tombstoned: Boolean(s.tombstoned),
                  missed_blocks_counter: String(s.missed_blocks_counter ?? '0'),
                },
              ]
            },
          })
        },
        async fetchAll(this: Request) {
          let nextKey: string | undefined = undefined
          do {
            const qs = new URLSearchParams()
            if (nextKey) qs.set('pagination.key', nextKey)
            const suffix = qs.toString() ? `?${qs}` : ''
            let pageNextKey: string | undefined = undefined
            await this.get(`/cosmos/slashing/v1beta1/signing_infos${suffix}`, {
              dataTransformer: ({
                data,
              }: {
                data: { info?: SigningInfo[]; pagination?: { next_key?: string } }
              }) => {
                pageNextKey = data?.pagination?.next_key || ''
                return (Array.isArray(data?.info) ? data.info : []).map((s) => ({
                  cons_address: s.address || '',
                  start_height: String(s.start_height ?? '0'),
                  index_offset: String(s.index_offset ?? '0'),
                  jailed_until: String(s.jailed_until ?? ''),
                  tombstoned: Boolean(s.tombstoned),
                  missed_blocks_counter: String(s.missed_blocks_counter ?? '0'),
                }))
              },
            })
            nextKey = pageNextKey && pageNextKey.length > 0 ? pageNextKey : undefined
          } while (nextKey)
        },
      },
    },
  }
}

export default SlashingSigningInfo
