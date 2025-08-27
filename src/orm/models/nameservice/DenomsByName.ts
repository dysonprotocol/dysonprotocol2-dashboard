import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class DenomsByName extends Model {
  static entity = 'nameservice_denoms_by_name'
  static primaryKey = ['name', 'denom']

  static fields() {
    return {
      name: this.string(''),
      denom: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchInit(
          this: Request,
          params: { name: string; subdenom_prefix?: string; limit?: string }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { name, subdenom_prefix, limit } = params
          const qs = new URLSearchParams()
          if (subdenom_prefix) qs.set('subdenom_prefix', subdenom_prefix)
          if (limit) qs.set('pagination.limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(
            `/dysonprotocol/nameservice/v1/denoms_by_name/${encodeURIComponent(name)}?${qs}`,
            {
              dataTransformer: ({
                data,
              }: {
                data: {
                  denoms?: Array<{ denom?: string }>
                  pagination?: { next_key?: string; total?: string | number }
                }
              }) => {
                const list = Array.isArray(data?.denoms) ? data.denoms : []
                returned = list.length
                nextKey = data?.pagination?.next_key || ''
                const tot = data?.pagination?.total
                total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
                return list.filter((d) => d?.denom).map((d) => ({ name, denom: String(d.denom) }))
              },
            }
          )
          return { next_key: nextKey || undefined, total, returned, page: 1, limit }
        },
        async fetchLoadMore(
          this: Request,
          params: {
            name: string
            subdenom_prefix?: string
            next_key?: string
            page?: number
            limit?: string
          }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { name, subdenom_prefix, limit } = params
          const qs = new URLSearchParams()
          if (subdenom_prefix) qs.set('subdenom_prefix', subdenom_prefix)
          let page = params.page
          if (params.next_key) qs.set('pagination.key', params.next_key)
          else if (page) qs.set('page', String(page))
          if (limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(
            `/dysonprotocol/nameservice/v1/denoms_by_name/${encodeURIComponent(name)}?${qs}`,
            {
              dataTransformer: ({
                data,
              }: {
                data: {
                  denoms?: Array<{ denom?: string }>
                  pagination?: { next_key?: string; total?: string | number }
                }
              }) => {
                const list = Array.isArray(data?.denoms) ? data.denoms : []
                returned = list.length
                nextKey = data?.pagination?.next_key || ''
                const tot = data?.pagination?.total
                total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
                return list.filter((d) => d?.denom).map((d) => ({ name, denom: String(d.denom) }))
              },
            }
          )
          if (!params.next_key && page) page += 1
          return { next_key: nextKey || undefined, total, returned, page, limit }
        },
      },
    },
  }
}

export default DenomsByName
