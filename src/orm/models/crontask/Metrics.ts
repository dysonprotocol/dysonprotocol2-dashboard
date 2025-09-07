import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

export class CrontaskMetrics extends Model {
  static entity = 'crontask_metrics'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
      // executed totals (last block)
      executed_total_gas: this.string('0'),
      executed_total_fees: this.attr([] as Coin[]),
      executed_task_count: this.string('0'),
      // pending snapshot at BeginBlock
      pending_task_count: this.string('0'),
      pending_gas_requested: this.string('0'),
      pending_oldest_scheduled_ts: this.string('0'),
      pending_total_gas_fees: this.attr([] as Coin[]),
      // optional event-only field
      mode: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/dysonprotocol/crontask/v1/metrics`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                metrics?: {
                  executed_total_gas?: string | number
                  executed_total_fees?: Coin[]
                  executed_task_count?: string | number
                  pending_task_count?: string | number
                  pending_gas_requested?: string | number
                  pending_oldest_scheduled_ts?: string | number
                  pending_total_gas_fees?: Coin[]
                }
              }
            }) => {
              const m = data?.metrics || {}
              return [
                {
                  default: 'default',
                  executed_total_gas: String(m.executed_total_gas ?? '0'),
                  executed_total_fees: Array.isArray(m.executed_total_fees)
                    ? (m.executed_total_fees as Coin[])
                    : [],
                  executed_task_count: String(m.executed_task_count ?? '0'),
                  pending_task_count: String(m.pending_task_count ?? '0'),
                  pending_gas_requested: String(m.pending_gas_requested ?? '0'),
                  pending_oldest_scheduled_ts: String(m.pending_oldest_scheduled_ts ?? '0'),
                  pending_total_gas_fees: Array.isArray(m.pending_total_gas_fees)
                    ? (m.pending_total_gas_fees as Coin[])
                    : [],
                  mode: '',
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default CrontaskMetrics
