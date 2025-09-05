import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

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
      task_gas_price: this.attr({}),
      task_gas_fee: this.attr({}),
      msgs: this.attr([]),
      msg_results: this.attr([]),
      status: this.string(''),
      creation_time: this.string(''),
      error_log: this.string(''),
      task_gas_consumed: this.string('0'),
      execution_timestamp: this.string(''),
      creation_block_height: this.string(''),
      execution_block_height: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByID(this: Request, taskId: string | number) {
          return this.get(`/dysonprotocol/crontask/v1/tasks/${taskId}`, {
            ttl: 0,
            dataTransformer: ({ data }: { data: { task?: unknown } }) =>
              data?.task ? [data.task] : [],
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
            ttl: 0,
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.tasks) ? data.tasks : []
              returned = list.length
              nextKey = data.pagination?.next_key || ''
              const tot = data.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
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
                tasks?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.tasks) ? data.tasks : []
              returned = list.length
              nextKey = data.pagination?.next_key || ''
              const tot = data.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
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
            ttl: 0,
            dataTransformer: ({ data }: { data: { tasks?: unknown[] } }) =>
              Array.isArray(data.tasks) ? data.tasks : [],
          })
        },
        async fetchByStatusGasPriceInit(this: Request, params: { status: string; limit?: string }) {
          const { status, limit } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          return this.get(`/dysonprotocol/crontask/v1/tasks/status/${status}/by_gas?${qs}`, {
            ttl: 0,
            cache: false,
            dataTransformer: ({ data }: { data: { tasks?: unknown[] } }) =>
              Array.isArray(data.tasks) ? data.tasks : [],
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
            ttl: 0,
            dataTransformer: ({
              data,
            }: {
              data: {
                tasks?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.tasks) ? data.tasks : []
              returned = list.length
              nextKey = data.pagination?.next_key || ''
              const tot = data.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
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
                tasks?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.tasks) ? data.tasks : []
              returned = list.length
              nextKey = data.pagination?.next_key || ''
              const tot = data.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
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
            task_gas_fee: { denom?: string; amount?: string }
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
            dataTransformer: ({ data }: { data: { tasks?: unknown[] } }) =>
              Array.isArray(data.tasks) ? data.tasks : [],
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
            dataTransformer: ({ data }: { data: { tasks?: unknown[] } }) =>
              Array.isArray(data.tasks) ? data.tasks : [],
          })
          return res
        },
      },
    },
  }
}

export default CrontaskTask
