import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IbcClientParams extends Model {
  static entity = 'ibc_client_params'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      allowed_clients: this.attr([] as string[]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get('/ibc/core/client/v1/params', {
            dataTransformer: ({ data }: { data?: { params?: { allowed_clients?: string[] } } }) => {
              const p = (data?.params as { allowed_clients?: string[] }) || {}
              return [
                {
                  singleton: 'default',
                  allowed_clients: Array.isArray(p.allowed_clients)
                    ? (p.allowed_clients as string[])
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

export default IbcClientParams
