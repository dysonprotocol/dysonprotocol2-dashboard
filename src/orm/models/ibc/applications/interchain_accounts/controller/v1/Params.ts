import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IcaControllerParams extends Model {
  static entity = 'ibc_ica_controller_params'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      controller_enabled: this.boolean(false),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get('/ibc/apps/interchain_accounts/controller/v1/params', {
            dataTransformer: ({
              data,
            }: {
              data?: { params?: { controller_enabled?: boolean } }
            }) => {
              const p = (data?.params as { controller_enabled?: boolean }) || {}
              return [{ singleton: 'default', controller_enabled: !!p.controller_enabled }]
            },
          })
        },
        async fetchIcaAddress(this: Request, owner: string, connectionId: string) {
          return this.get(
            `/ibc/apps/interchain_accounts/controller/v1/owners/${encodeURIComponent(owner)}/connections/${encodeURIComponent(connectionId)}`,
            {
              dataTransformer: ({ data }: { data?: { address?: string } }) => {
                return [
                  { singleton: 'default', ica_address: String(data?.address || '') } as Record<
                    string,
                    unknown
                  >,
                ]
              },
            }
          )
        },
      },
    },
  }
}

export default IcaControllerParams
