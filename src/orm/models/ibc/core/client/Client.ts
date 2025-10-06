import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IbcClient extends Model {
  static entity = 'ibc_clients'
  static primaryKey = 'client_id'

  static fields() {
    return {
      client_id: this.string(''),
      status: this.string(''),
      client_state: this.attr({} as Record<string, unknown>),
      client_type_url: this.string(''),
      creator: this.string(''),
      v2_allowed_relayers: this.attr([] as string[]),
      v2_counterparty_client_id: this.string(''),
      v2_merkle_prefix: this.attr([] as string[]),
      remote_chain_id: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchClients(this: Request) {
          return this.get('/ibc/core/client/v1/client_states', {
            dataTransformer: ({
              data,
            }: {
              data?: { client_states?: Array<{ client_id?: string; client_state?: unknown }> }
            }) => {
              const list = Array.isArray(data?.client_states)
                ? (data!.client_states as Array<{ client_id?: string; client_state?: unknown }>)
                : []
              return list.map((r) => {
                const cs = (r?.client_state as Record<string, unknown>) || {}
                const typeUrl = String((cs as { type_url?: unknown })?.type_url || '')
                return {
                  client_id: String(r?.client_id || ''),
                  client_state: cs,
                  client_type_url: typeUrl,
                  remote_chain_id: String((cs as { chain_id?: unknown })?.chain_id || ''),
                }
              })
            },
          })
        },
        async fetchClient(this: Request, clientId: string) {
          return this.get(`/ibc/core/client/v1/client_states/${encodeURIComponent(clientId)}`, {
            dataTransformer: ({ data }: { data?: { client_state?: unknown } }) => {
              return [
                {
                  client_id: clientId,
                  client_state: (data?.client_state as Record<string, unknown>) || {},
                  client_type_url: String(
                    ((data?.client_state as { type_url?: unknown } | undefined)?.type_url as
                      | string
                      | undefined) || ''
                  ),
                  remote_chain_id: String(
                    ((data?.client_state as { chain_id?: unknown } | undefined)?.chain_id as
                      | string
                      | undefined) || ''
                  ),
                },
              ]
            },
          })
        },
        async fetchStatus(this: Request, clientId: string) {
          return this.get(`/ibc/core/client/v1/client_status/${encodeURIComponent(clientId)}`, {
            dataTransformer: ({ data }: { data?: { status?: string } }) => {
              return [
                {
                  client_id: clientId,
                  status: String(data?.status || ''),
                },
              ]
            },
          })
        },
        async fetchCreator(this: Request, clientId: string) {
          return this.get(`/ibc/core/client/v1/client_creator/${encodeURIComponent(clientId)}`, {
            dataTransformer: ({ data }: { data?: { creator?: string } }) => {
              return [{ client_id: clientId, creator: String(data?.creator || '') }]
            },
          })
        },
        async fetchV2Config(this: Request, clientId: string) {
          return this.get(`/ibc/core/client/v2/config/${encodeURIComponent(clientId)}`, {
            dataTransformer: ({
              data,
            }: {
              data?: { config?: { allowed_relayers?: string[] } }
            }) => {
              const list = (data?.config as { allowed_relayers?: string[] } | undefined)
                ?.allowed_relayers
              return [
                {
                  client_id: clientId,
                  v2_allowed_relayers: Array.isArray(list) ? (list as string[]) : [],
                },
              ]
            },
          })
        },
        async fetchV2CounterpartyInfo(this: Request, clientId: string) {
          return this.get(`/ibc/core/client/v2/counterparty_info/${encodeURIComponent(clientId)}`, {
            dataTransformer: ({
              data,
            }: {
              data?: { counterparty_info?: { client_id?: string; merkle_prefix?: string[] } }
            }) => {
              const info =
                (data?.counterparty_info as
                  | { client_id?: string; merkle_prefix?: string[] }
                  | undefined) || {}
              return [
                {
                  client_id: clientId,
                  v2_counterparty_client_id: String(info.client_id || ''),
                  v2_merkle_prefix: Array.isArray(info.merkle_prefix)
                    ? (info.merkle_prefix as string[])
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

export default IbcClient
