import { useAxiosRepo } from '@pinia-orm/axios'
import { unwrap } from './crontaskEvents'
import IbcClient from '@/orm/models/ibc/core/client/Client'
import IbcConnection from '@/orm/models/ibc/core/connection/Connection'
import IbcChannel from '@/orm/models/ibc/core/channel/Channel'

// Tendermint event types vary by chain; we'll listen for generic keys and refresh affected rows.
const EVENTS = [
  // Common IBC events
  'ibc_client',
  'ibc_connection',
  'ibc_channel',
  // Potential fully-qualified event types (best-effort)
  'ibc.core.client.v1.EventUpdateClient',
  'ibc.core.connection.v1.EventConnectionOpenInit',
  'ibc.core.connection.v1.EventConnectionOpenTry',
  'ibc.core.connection.v1.EventConnectionOpenAck',
  'ibc.core.connection.v1.EventConnectionOpenConfirm',
  'ibc.core.channel.v1.EventChannelOpenInit',
  'ibc.core.channel.v1.EventChannelOpenTry',
  'ibc.core.channel.v1.EventChannelOpenAck',
  'ibc.core.channel.v1.EventChannelOpenConfirm',
] as const

type IbcEventName = (typeof EVENTS)[number]

let globalInitialized = false

export function ensureGlobalIbcEventSync(): void {
  if (globalInitialized) return
  globalInitialized = true

  const handler = (ev: CustomEvent<Record<string, unknown>>) => {
    try {
      const detail = ev.detail
      if (!detail) return

      const clientId = unwrap(detail.client_id)
      const connectionId = unwrap(detail.connection_id)
      const channelId = unwrap(detail.channel_id)
      const portId = unwrap(detail.port_id)

      const apis = {
        client: useAxiosRepo(IbcClient).api(),
        conn: useAxiosRepo(IbcConnection).api(),
        chan: useAxiosRepo(IbcChannel).api(),
      }

      const refresh: Array<Promise<unknown>> = []
      if (clientId) {
        refresh.push(apis.client.fetchClient(clientId))
        refresh.push(apis.client.fetchStatus(clientId))
      }
      if (connectionId) refresh.push(apis.conn.fetchConnection(connectionId))
      if (channelId && portId) refresh.push(apis.chan.fetchChannel(channelId, portId))
      if (refresh.length) {
        Promise.allSettled(refresh).catch((e) => console.error('[ibc.sync] refresh error', e))
      }
    } catch (e) {
      console.error('[ibc.sync] handler error', e)
    }
  }

  for (const name of EVENTS) {
    globalThis.addEventListener(name, handler as EventListener)
  }
}
