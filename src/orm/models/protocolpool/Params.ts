import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class ProtocolPoolParams extends Model {
  static entity = 'protocolpool_params'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
      enabled_distribution_denoms: this.attr<string[]>([]),
      distribution_frequency: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/protocolpool/v1/params`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                params?: {
                  enabled_distribution_denoms?: string[]
                  distribution_frequency?: string | number
                }
              }
            }) => {
              const p = data?.params || {}
              return [
                {
                  default: 'default',
                  enabled_distribution_denoms: Array.isArray(p.enabled_distribution_denoms)
                    ? p.enabled_distribution_denoms
                    : [],
                  distribution_frequency: String(p.distribution_frequency ?? '0'),
                },
              ]
            },
          })
        },
        async update(
          this: Request,
          params: {
            authority: string
            enabled_distribution_denoms: string[]
            distribution_frequency: string
            wallet: {
              sendMsg: (args: {
                msg: unknown
                gasLimit?: number | 'auto'
                memo?: string
                executorAddress?: string
              }) => Promise<{ success: boolean; rawLog?: string }>
            }
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const {
            authority,
            enabled_distribution_denoms,
            distribution_frequency,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/cosmos.protocolpool.v1.MsgUpdateParams',
            authority,
            params: {
              enabled_distribution_denoms,
              distribution_frequency,
            },
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'ProtocolPool update params failed')
          await this.get(`/cosmos/protocolpool/v1/params`)
          return res
        },
      },
    },
  }
}

export default ProtocolPoolParams
