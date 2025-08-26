import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type AnyObj = Record<string, unknown>

export class NftClass extends Model {
  static entity = 'nft_classes'
  static primaryKey = 'id'

  static fields() {
    return {
      id: this.string(''),
      name: this.string(''),
      symbol: this.string(''),
      description: this.string(''),
      uri: this.string(''),
      uri_hash: this.string(''),
      data: this.attr({} as AnyObj),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchClass(this: Request, id: string) {
          const qs = new URLSearchParams({ class_id: id })
          return this.get(`/dysonprotocol/nft/v1beta1/class?${qs}`, {
            dataTransformer: ({ data }: { data: { class?: AnyObj | null } }) => {
              const c = data?.class || {}
              const cid = String((c as AnyObj)?.id || id || '')
              if (!cid) return []
              return [
                {
                  id: cid,
                  name: String((c as AnyObj)?.name || ''),
                  symbol: String((c as AnyObj)?.symbol || ''),
                  description: String((c as AnyObj)?.description || ''),
                  uri: String((c as AnyObj)?.uri || ''),
                  uri_hash: String((c as AnyObj)?.uri_hash || ''),
                  data: (c as AnyObj)?.data || {},
                },
              ]
            },
          })
        },
        async fetchClasses(
          this: Request,
          params: { next_key?: string; page?: number; limit?: string }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { limit } = params
          const qs = new URLSearchParams()
          let page = params.page
          if (params.next_key) qs.set('pagination.key', params.next_key)
          else if (page) qs.set('page', String(page))
          if (limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/nft/v1beta1/classes?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                classes?: AnyObj[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.classes) ? data.classes : []
              returned = list.length
              nextKey = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((c) => (c as AnyObj)?.id)
                .map((c) => ({
                  id: String((c as AnyObj).id),
                  name: String((c as AnyObj).name || ''),
                  symbol: String((c as AnyObj).symbol || ''),
                  description: String((c as AnyObj).description || ''),
                  uri: String((c as AnyObj).uri || ''),
                  uri_hash: String((c as AnyObj).uri_hash || ''),
                  data: (c as AnyObj).data || {},
                }))
            },
          })
          if (!params.next_key && page) page += 1
          return { next_key: nextKey || undefined, total, returned, page, limit }
        },
      },
    },
  }
}

export default NftClass
