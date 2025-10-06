import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IbcConnection extends Model {
  static entity = 'ibc_connections'
  static primaryKey = 'id'

  static fields() {
    return {
      id: this.string(''),
      client_id: this.string(''),
      state: this.string(''),
      delay_period: this.string('0'),
      versions: this.attr([] as string[]),
      counterparty_client_id: this.string(''),
      counterparty_connection_id: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchConnections(this: Request) {
          return this.get('/ibc/core/connection/v1/connections', {
            dataTransformer: ({
              data,
            }: {
              data?: { connections?: Array<Record<string, unknown>> }
            }) => {
              const rows = Array.isArray(data?.connections)
                ? (data!.connections as Array<Record<string, unknown>>)
                : []
              return rows.map((c) => ({
                id: String(c?.id || ''),
                client_id: String(c?.client_id || ''),
                state: String(c?.state || ''),
                delay_period: String(c?.delay_period ?? '0'),
                versions: Array.isArray(c?.versions)
                  ? (c.versions as Array<Record<string, unknown>>)
                      .map((v) => String((v as { identifier?: unknown })?.identifier || ''))
                      .filter(Boolean)
                  : [],
                counterparty_client_id: String(
                  ((c?.counterparty as { client_id?: unknown } | undefined)?.client_id as
                    | string
                    | undefined) || ''
                ),
                counterparty_connection_id: String(
                  ((c?.counterparty as { connection_id?: unknown } | undefined)?.connection_id as
                    | string
                    | undefined) || ''
                ),
              }))
            },
          })
        },
        async fetchConnection(this: Request, connectionId: string) {
          return this.get(
            `/ibc/core/connection/v1/connections/${encodeURIComponent(connectionId)}`,
            {
              dataTransformer: ({ data }: { data?: { connection?: Record<string, unknown> } }) => {
                const c = (data?.connection as Record<string, unknown>) || {}
                return [
                  {
                    id: String(connectionId),
                    client_id: String(c?.client_id || ''),
                    state: String(c?.state || ''),
                    delay_period: String(c?.delay_period ?? '0'),
                    versions: Array.isArray(c?.versions)
                      ? (c.versions as Array<Record<string, unknown>>)
                          .map((v) => String((v as { identifier?: unknown })?.identifier || ''))
                          .filter(Boolean)
                      : [],
                    counterparty_client_id: String(
                      ((c?.counterparty as { client_id?: unknown } | undefined)?.client_id as
                        | string
                        | undefined) || ''
                    ),
                    counterparty_connection_id: String(
                      ((c?.counterparty as { connection_id?: unknown } | undefined)
                        ?.connection_id as string | undefined) || ''
                    ),
                  },
                ]
              },
            }
          )
        },
        async fetchClientConnections(this: Request, clientId: string) {
          return this.get(
            `/ibc/core/connection/v1/client_connections/${encodeURIComponent(clientId)}`,
            {
              dataTransformer: ({ data }: { data?: { connection_paths?: string[] } }) => {
                const ids = Array.isArray(data?.connection_paths)
                  ? (data!.connection_paths as string[])
                  : []
                return ids.map((id) => ({ id, client_id: clientId }))
              },
            }
          )
        },
      },
    },
  }
}

export default IbcConnection
