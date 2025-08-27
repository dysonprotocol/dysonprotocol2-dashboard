import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom?: string; amount?: string }

function toCoin(c?: Coin | null): Coin {
  return {
    denom: String(c?.denom || ''),
    amount: String(c?.amount || '0'),
  }
}

export class CrontaskTask extends Model {
  static entity = 'crontask_tasks'
  static primaryKey = 'task_id'

  static fields() {
    return {
      task_id: this.string(''),
      creator: this.string(''),
      scheduled_timestamp: this.string(''),
      expiry_timestamp: this.string(''),
      task_gas_limit: this.string('0'),
      task_gas_price: this.attr<Coin>({}),
      task_gas_fee: this.attr<Coin>({}),
      msgs: this.attr<unknown[]>([]),
      msg_results: this.attr<unknown[]>([]),
      status: this.string(''),
      creation_time: this.string(''),
      error_log: this.string(''),
      task_gas_consumed: this.string('0'),
      execution_timestamp: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByID(this: Request, taskId: string | number) {
          return this.get(`/dysonprotocol/crontask/v1/tasks/${taskId}`, {
            dataTransformer: ({ data }: { data: { task?: Record<string, unknown> } }) => {
              const t = data?.task as any
              if (!t?.task_id && t?.task_id !== 0) return []
              return [
                {
                  task_id: String(t.task_id ?? ''),
                  creator: String(t.creator || ''),
                  scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                  expiry_timestamp: String(t.expiry_timestamp ?? ''),
                  task_gas_limit: String(t.task_gas_limit ?? '0'),
                  task_gas_price: toCoin(t.task_gas_price as Coin),
                  task_gas_fee: toCoin(t.task_gas_fee as Coin),
                  msgs: Array.isArray(t.msgs) ? t.msgs : [],
                  msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                  status: String(t.status || ''),
                  creation_time: String(t.creation_time ?? ''),
                  error_log: String(t.error_log || ''),
                  task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                  execution_timestamp: String(t.execution_timestamp ?? ''),
                },
              ]
            },
          })
        },
        async fetchByCreatorInit(
          this: Request,
          params: { creator: string; limit?: string }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { creator, limit } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/tasks/creator/${creator}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: any[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              returned = list.length
              nextKey = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          return { next_key: nextKey || undefined, total, returned, page: 1, limit }
        },
        async fetchByCreatorLoadMore(
          this: Request,
          params: { creator: string; limit?: string; next_key?: string; page?: number }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { creator, limit } = params
          const qs = new URLSearchParams()
          let page = params.page
          if (params.next_key) qs.set('pagination.key', params.next_key)
          else if (page) qs.set('page', String(page))
          if (limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/tasks/creator/${creator}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: any[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              returned = list.length
              nextKey = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          if (!params.next_key && page) page += 1
          return { next_key: nextKey || undefined, total, returned, page, limit }
        },
        async fetchByStatusTimestampInit(
          this: Request,
          params: { status: string; limit?: string }
        ) {
          const { status, limit } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          return this.get(`/dysonprotocol/crontask/v1/tasks/status/${status}?${qs}`, {
            dataTransformer: ({ data }: { data: { tasks?: any[] } }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
        },
        async fetchByStatusGasPriceInit(this: Request, params: { status: string; limit?: string }) {
          const { status, limit } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          return this.get(`/dysonprotocol/crontask/v1/tasks/status/${status}/by_gas?${qs}`, {
            dataTransformer: ({ data }: { data: { tasks?: any[] } }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
        },
        async fetchAllInit(
          this: Request,
          params: { limit?: string }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { limit } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/tasks?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: any[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              returned = list.length
              nextKey = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          return { next_key: nextKey || undefined, total, returned, page: 1, limit }
        },
        async fetchAllLoadMore(
          this: Request,
          params: { next_key?: string; page?: number; limit?: string }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { limit } = params
          const qs = new URLSearchParams()
          let page = params.page
          if (params.next_key) qs.set('pagination.key', params.next_key)
          else if (page) qs.set('page', String(page))
          if (limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', limit)
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/tasks?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: any[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              returned = list.length
              nextKey = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          if (!params.next_key && page) page += 1
          return { next_key: nextKey || undefined, total, returned, page, limit }
        },
        async createTask(
          this: Request,
          params: {
            creator: string
            scheduled_timestamp: string
            expiry_timestamp: string
            task_gas_limit: string
            task_gas_fee: Coin
            msgs: unknown[]
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
            creator,
            scheduled_timestamp,
            expiry_timestamp,
            task_gas_limit,
            task_gas_fee,
            msgs,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgCreateTask',
            creator,
            scheduled_timestamp,
            expiry_timestamp,
            task_gas_limit: Number.isFinite(Number(task_gas_limit))
              ? Number(task_gas_limit)
              : task_gas_limit,
            task_gas_fee,
            msgs,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          if (!res?.success) throw new Error(res?.rawLog || 'Crontask create failed')
          await this.get(`/dysonprotocol/crontask/v1/tasks/creator/${creator}`, {
            dataTransformer: ({ data }: { data: { tasks?: any[] } }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          return res
        },
        async deleteTask(
          this: Request,
          params: {
            creator: string
            task_id: string | number
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
          const { creator, task_id, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgDeleteTask',
            creator,
            task_id: String(task_id),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          if (!res?.success) throw new Error(res?.rawLog || 'Crontask delete failed')
          await this.get(`/dysonprotocol/crontask/v1/tasks/creator/${creator}`, {
            dataTransformer: ({ data }: { data: { tasks?: any[] } }) => {
              const list = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
                (t) => t?.task_id != null
              )
              return list.map((t) => ({
                task_id: String(t.task_id ?? ''),
                creator: String(t.creator || ''),
                scheduled_timestamp: String(t.scheduled_timestamp ?? ''),
                expiry_timestamp: String(t.expiry_timestamp ?? ''),
                task_gas_limit: String(t.task_gas_limit ?? '0'),
                task_gas_price: toCoin(t.task_gas_price as Coin),
                task_gas_fee: toCoin(t.task_gas_fee as Coin),
                msgs: Array.isArray(t.msgs) ? t.msgs : [],
                msg_results: Array.isArray(t.msg_results) ? t.msg_results : [],
                status: String(t.status || ''),
                creation_time: String(t.creation_time ?? ''),
                error_log: String(t.error_log || ''),
                task_gas_consumed: String(t.task_gas_consumed ?? '0'),
                execution_timestamp: String(t.execution_timestamp ?? ''),
              }))
            },
          })
          return res
        },
      },
    },
  }
}

export default CrontaskTask
