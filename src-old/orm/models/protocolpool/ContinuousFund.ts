import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class ProtocolContinuousFund extends Model {
  static entity = 'protocolpool_continuous_funds'
  static primaryKey = 'recipient'

  static fields() {
    return {
      recipient: this.string(''),
      percentage: this.string('0'),
      expiry: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchOne(this: Request, recipient: string) {
          return this.get(`/cosmos/protocolpool/v1/continuous_funds/${recipient}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                continuous_fund?: { recipient?: string; percentage?: string; expiry?: string }
              }
            }) => {
              const cf = data?.continuous_fund
              if (!cf?.recipient) return []
              return [
                {
                  recipient: cf.recipient,
                  percentage: cf.percentage ?? '0',
                  expiry: cf.expiry || '',
                },
              ]
            },
          })
        },
        async fetchAll(this: Request) {
          return this.get(`/cosmos/protocolpool/v1/continuous_funds`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                continuous_funds?: Array<{
                  recipient?: string
                  percentage?: string
                  expiry?: string
                }>
              }
            }) => {
              const list = Array.isArray(data?.continuous_funds) ? data.continuous_funds : []
              return list
                .filter((cf) => cf?.recipient)
                .map((cf) => ({
                  recipient: String(cf.recipient),
                  percentage: String(cf.percentage ?? '0'),
                  expiry: cf.expiry || '',
                }))
            },
          })
        },
        async create(
          this: Request,
          params: {
            authority: string
            recipient: string
            percentage: string
            expiry?: string
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
          const { authority, recipient, percentage, expiry, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.protocolpool.v1.MsgCreateContinuousFund',
            authority,
            recipient,
            percentage,
            ...(expiry && expiry.trim().length > 0 ? { expiry } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'ProtocolPool create continuous fund failed')
          await this.get(`/cosmos/protocolpool/v1/continuous_funds/${recipient}`)
          return res
        },
        async cancel(
          this: Request,
          params: {
            authority: string
            recipient: string
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
          const { authority, recipient, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.protocolpool.v1.MsgCancelContinuousFund',
            authority,
            recipient,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'ProtocolPool cancel continuous fund failed')
          // Refresh both list and this recipient
          await Promise.all([
            this.get(`/cosmos/protocolpool/v1/continuous_funds/${recipient}`),
            this.get(`/cosmos/protocolpool/v1/continuous_funds`),
          ])
          return res
        },
      },
    },
  }
}

export default ProtocolContinuousFund
