import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IcaHostParams extends Model {
  static entity = 'ibc_ica_host_params'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      host_enabled: this.boolean(false),
      allow_messages: this.attr([] as string[]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get('/ibc/apps/interchain_accounts/host/v1/params', {
            dataTransformer: ({
              data,
            }: {
              data?: { params?: { host_enabled?: boolean; allow_messages?: string[] } }
            }) => {
              const p =
                (data?.params as { host_enabled?: boolean; allow_messages?: string[] }) || {}
              return [
                {
                  singleton: 'default',
                  host_enabled: !!p.host_enabled,
                  allow_messages: Array.isArray(p.allow_messages)
                    ? (p.allow_messages as string[])
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

export default IcaHostParams
