import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class CrontaskParams extends Model {
  static entity = 'crontask_params'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
      block_gas_limit: this.string('0'),
      expiry_limit: this.string('0'),
      max_scheduled_time: this.string('0'),
      clean_up_time: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/dysonprotocol/crontask/v1/params`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                params?: {
                  block_gas_limit?: string | number
                  expiry_limit?: string | number
                  max_scheduled_time?: string | number
                  clean_up_time?: string | number
                }
              }
            }) => {
              const p = data?.params || {}
              return [
                {
                  default: 'default',
                  block_gas_limit: String(p.block_gas_limit ?? '0'),
                  expiry_limit: String(p.expiry_limit ?? '0'),
                  max_scheduled_time: String(p.max_scheduled_time ?? '0'),
                  clean_up_time: String(p.clean_up_time ?? '0'),
                },
              ]
            },
          })
        },
        async update(
          this: Request,
          params: {
            authority: string
            block_gas_limit: string
            expiry_limit: string
            max_scheduled_time: string
            clean_up_time: string
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
            block_gas_limit,
            expiry_limit,
            max_scheduled_time,
            clean_up_time,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgUpdateParams',
            authority,
            params: {
              block_gas_limit,
              expiry_limit,
              max_scheduled_time,
              clean_up_time,
            },
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'Crontask update params failed')
          await this.get(`/dysonprotocol/crontask/v1/params`)
          return res
        },
      },
    },
  }
}

export default CrontaskParams
