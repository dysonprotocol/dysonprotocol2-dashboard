import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IbcChannel extends Model {
  static entity = 'ibc_channels'
  static primaryKey = ['port_id', 'channel_id']

  static fields() {
    return {
      port_id: this.string(''),
      channel_id: this.string(''),
      state: this.string(''),
      ordering: this.string(''),
      connection_hops: this.attr([] as string[]),
      version: this.string(''),
      counterparty_port_id: this.string(''),
      counterparty_channel_id: this.string(''),
      next_sequence_send: this.string(''),
      next_sequence_receive: this.string(''),
      commitments: this.attr([] as string[]),
      ack_sequences: this.attr([] as string[]),
      unreceived_packets: this.attr([] as string[]),
      unreceived_acks: this.attr([] as string[]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchChannels(this: Request) {
          return this.get('/ibc/core/channel/v1/channels', {
            dataTransformer: ({
              data,
            }: {
              data?: { channels?: Array<Record<string, unknown>> }
            }) => {
              const rows = Array.isArray(data?.channels)
                ? (data!.channels as Array<Record<string, unknown>>)
                : []
              return rows.map((c) => {
                const cp =
                  (c?.counterparty as { port_id?: unknown; channel_id?: unknown } | undefined) || {}
                return {
                  port_id: String(c?.port_id || ''),
                  channel_id: String(c?.channel_id || ''),
                  state: String(c?.state || ''),
                  ordering: String(c?.ordering || ''),
                  connection_hops: Array.isArray(c?.connection_hops)
                    ? (c.connection_hops as string[])
                    : [],
                  version: String(c?.version || ''),
                  counterparty_port_id: String((cp.port_id as string | undefined) || ''),
                  counterparty_channel_id: String((cp.channel_id as string | undefined) || ''),
                }
              })
            },
          })
        },
        async fetchChannel(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}`,
            {
              dataTransformer: ({ data }: { data?: { channel?: Record<string, unknown> } }) => {
                const c = (data?.channel as Record<string, unknown>) || {}
                const cp =
                  (c?.counterparty as { port_id?: unknown; channel_id?: unknown } | undefined) || {}
                return [
                  {
                    port_id: String(portId),
                    channel_id: String(channelId),
                    state: String(c?.state || ''),
                    ordering: String(c?.ordering || ''),
                    connection_hops: Array.isArray(c?.connection_hops)
                      ? (c.connection_hops as string[])
                      : [],
                    version: String(c?.version || ''),
                    counterparty_port_id: String((cp.port_id as string | undefined) || ''),
                    counterparty_channel_id: String((cp.channel_id as string | undefined) || ''),
                  },
                ]
              },
            }
          )
        },
        async fetchNextSend(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/next_sequence_send`,
            {
              dataTransformer: ({ data }: { data?: { next_sequence_send?: string | number } }) => {
                const seq = String(data?.next_sequence_send ?? '')
                return [
                  {
                    port_id: portId,
                    channel_id: channelId,
                    next_sequence_send: seq,
                  },
                ]
              },
            }
          )
        },
        async fetchNextRecv(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/next_sequence`,
            {
              dataTransformer: ({
                data,
              }: {
                data?: { next_sequence_receive?: string | number }
              }) => {
                const seq = String(data?.next_sequence_receive ?? '')
                return [
                  {
                    port_id: portId,
                    channel_id: channelId,
                    next_sequence_receive: seq,
                  },
                ]
              },
            }
          )
        },
        async fetchPacketCommitments(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/packet_commitments`,
            {
              dataTransformer: ({
                data,
              }: {
                data?: { commitments?: Array<{ sequence?: string | number }> }
              }) => {
                const rows = Array.isArray(data?.commitments)
                  ? (data!.commitments as Array<{ sequence?: string | number }>)
                  : []
                const seqs = rows.map((r) => String(r?.sequence ?? '')).filter(Boolean)
                return [{ port_id: portId, channel_id: channelId, commitments: seqs }]
              },
            }
          )
        },
        async fetchPacketAcknowledgements(this: Request, channelId: string, portId: string) {
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/packet_acknowledgements`,
            {
              dataTransformer: ({
                data,
              }: {
                data?: { acknowledgements?: Array<{ sequence?: string | number }> }
              }) => {
                const rows = Array.isArray(data?.acknowledgements)
                  ? (data!.acknowledgements as Array<{ sequence?: string | number }>)
                  : []
                const seqs = rows.map((r) => String(r?.sequence ?? '')).filter(Boolean)
                return [{ port_id: portId, channel_id: channelId, ack_sequences: seqs }]
              },
            }
          )
        },
        async fetchUnreceivedPackets(
          this: Request,
          channelId: string,
          portId: string,
          sequences: string[]
        ) {
          const csv = sequences.filter(Boolean).join(',')
          if (!csv) return []
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/packet_commitments/${encodeURIComponent(csv)}/unreceived_packets`,
            {
              dataTransformer: ({ data }: { data?: { sequences?: string[] } }) => {
                const seqs = Array.isArray(data?.sequences) ? (data!.sequences as string[]) : []
                return [{ port_id: portId, channel_id: channelId, unreceived_packets: seqs }]
              },
            }
          )
        },
        async fetchUnreceivedAcks(
          this: Request,
          channelId: string,
          portId: string,
          sequences: string[]
        ) {
          const csv = sequences.filter(Boolean).join(',')
          if (!csv) return []
          return this.get(
            `/ibc/core/channel/v1/channels/${encodeURIComponent(channelId)}/ports/${encodeURIComponent(portId)}/packet_commitments/${encodeURIComponent(csv)}/unreceived_acks`,
            {
              dataTransformer: ({ data }: { data?: { sequences?: string[] } }) => {
                const seqs = Array.isArray(data?.sequences) ? (data!.sequences as string[]) : []
                return [{ port_id: portId, channel_id: channelId, unreceived_acks: seqs }]
              },
            }
          )
        },
      },
    },
  }
}

export default IbcChannel
