import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class Ics20Params extends Model {
  static entity = 'ibc_ics20_params'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      send_enabled: this.boolean(false),
      receive_enabled: this.boolean(false),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get('/ibc/apps/transfer/v1/params', {
            dataTransformer: ({
              data,
            }: {
              data?: { params?: { send_enabled?: boolean; receive_enabled?: boolean } }
            }) => {
              const p =
                (data?.params as { send_enabled?: boolean; receive_enabled?: boolean }) || {}
              return [
                {
                  singleton: 'default',
                  send_enabled: !!p.send_enabled,
                  receive_enabled: !!p.receive_enabled,
                },
              ]
            },
          })
        },
        async fetchEscrowAddress(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/apps/transfer/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/escrow_address`,
            {
              dataTransformer: ({ data }: { data?: { escrow_address?: string } }) => {
                return [
                  {
                    singleton: 'default',
                    escrow_address: String(data?.escrow_address || ''),
                  } as Record<string, unknown>,
                ]
              },
            }
          )
        },
        async fetchTotalEscrowForDenom(this: Request, denom: string) {
          return this.get(`/ibc/apps/transfer/v1/total_escrow/${encodeURIComponent(denom)}`, {
            // Return raw response so caller can display coin without mutating store shape
            returnRawResponse: true,
          })
        },
      },
    },
  }
}

export default Ics20Params
