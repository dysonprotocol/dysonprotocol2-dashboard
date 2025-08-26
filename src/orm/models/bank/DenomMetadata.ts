import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type DenomUnit = { denom: string; exponent: number; aliases?: string[] }
type Metadata = {
  description?: string
  denom_units?: DenomUnit[]
  base?: string
  display?: string
  name?: string
  symbol?: string
  uri?: string
  uri_hash?: string
}

export class DenomMetadata extends Model {
  static entity = 'denoms_metadata'
  static primaryKey = 'base'

  static fields() {
    return {
      base: this.string(''),
      description: this.string(''),
      display: this.string(''),
      name: this.string(''),
      symbol: this.string(''),
      uri: this.string(''),
      uri_hash: this.string(''),
      denom_units: this.attr<DenomUnit[]>([]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAll(this: Request) {
          return this.get(`/cosmos/bank/v1beta1/denoms_metadata`, {
            dataTransformer: ({ data }: { data: { metadatas?: Metadata[] } }) =>
              (Array.isArray(data?.metadatas) ? data.metadatas : []).map((m) => ({
                base: m.base || '',
                description: m.description || '',
                display: m.display || '',
                name: m.name || '',
                symbol: m.symbol || '',
                uri: m.uri || '',
                uri_hash: m.uri_hash || '',
                denom_units: Array.isArray(m.denom_units) ? m.denom_units : [],
              })),
          })
        },
        async fetchOne(this: Request, denom: string) {
          return this.get(`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(denom)}`, {
            dataTransformer: ({ data }: { data: { metadata?: Metadata } }) => {
              const m = data?.metadata
              return m
                ? [
                    {
                      base: m.base || '',
                      description: m.description || '',
                      display: m.display || '',
                      name: m.name || '',
                      symbol: m.symbol || '',
                      uri: m.uri || '',
                      uri_hash: m.uri_hash || '',
                      denom_units: Array.isArray(m.denom_units) ? m.denom_units : [],
                    },
                  ]
                : []
            },
          })
        },
      },
    },
  }
}

export default DenomMetadata
