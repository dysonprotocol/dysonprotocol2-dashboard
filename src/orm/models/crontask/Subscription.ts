import { Model } from 'pinia-orm'
import { useRepo } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class CrontaskSubscription extends Model {
  static entity = 'crontask_subscriptions'
  static primaryKey = 'subscription_id'

  static fields() {
    return {
      subscription_id: this.string(''),
      creator: this.string(''),
      filter: this.string(''),
      script_address: this.string(''),
      function: this.string(''),
      args: this.string(''),
      kwargs: this.string(''),
      task_gas_limit: this.string('0'),
      task_gas_fee: this.attr({}),
      status: this.string(''),
      status_message: this.string(''),
      expiry_timestamp: this.string(''),
      triger_count: this.string('0'),
      task_scheduled_timestamp: this.string(''),
      task_expiry_timestamp: this.string(''),
      task_gas_price: this.attr({}),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchByID(this: Request, subscriptionId: string | number) {
          return this.get(`/dysonprotocol/crontask/v1/subscriptions/${subscriptionId}`, {
            dataTransformer: ({ data }: { data: { subscription?: unknown } }) =>
              data?.subscription ? [data.subscription] : [],
          })
        },
        async fetchByCreatorInit(
          this: Request,
          params: { creator: string; limit?: string; reverse?: boolean }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { creator, limit, reverse } = params
          const qs = new URLSearchParams()
          if (limit) qs.set('pagination.limit', limit)
          if (reverse) qs.set('pagination.reverse', 'true')
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/subscriptions/creator/${creator}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                subscriptions?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.subscriptions) ? data.subscriptions : []
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
          params: {
            creator: string
            limit?: string
            next_key?: string
            page?: number
            reverse?: boolean
          }
        ): Promise<{
          next_key?: string
          total?: string
          returned?: number
          page?: number
          limit?: string
        }> {
          const { creator, limit, reverse } = params
          const qs = new URLSearchParams()
          let page = params.page
          if (params.next_key) qs.set('pagination.key', params.next_key)
          else if (page) qs.set('page', String(page))
          if (limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', limit)
          if (reverse) qs.set('pagination.reverse', 'true')
          let nextKey: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/crontask/v1/subscriptions/creator/${creator}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                subscriptions?: unknown[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data.subscriptions) ? data.subscriptions : []
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
        async createSubscription(
          this: Request,
          params: {
            creator: string
            filter: string
            script_address: string
            function: string
            args: string
            kwargs: string
            task_gas_limit: string
            task_gas_fee: { denom?: string; amount?: string }
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
            filter,
            script_address,
            function: fn,
            args,
            kwargs,
            task_gas_limit,
            task_gas_fee,
            wallet,
            gasLimit,
            memo,
          } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgCreateSubscription',
            creator,
            filter,
            script_address,
            function: fn,
            args,
            kwargs,
            task_gas_limit: Number.isFinite(Number(task_gas_limit))
              ? Number(task_gas_limit)
              : task_gas_limit,
            task_gas_fee,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          if (!res?.success) throw new Error(res?.rawLog || 'Crontask subscription create failed')
          await this.get(
            `/dysonprotocol/crontask/v1/subscriptions/creator/${creator}?pagination.reverse=true`,
            {
              dataTransformer: ({ data }: { data: { subscriptions?: unknown[] } }) =>
                Array.isArray(data.subscriptions) ? data.subscriptions : [],
            }
          )
          return res
        },
        async renewSubscription(
          this: Request,
          params: {
            creator: string
            subscription_id: string | number
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
          const { creator, subscription_id, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgRenewSubscription',
            creator,
            subscription_id: String(subscription_id),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          if (!res?.success) throw new Error(res?.rawLog || 'Crontask subscription renew failed')
          await this.get(
            `/dysonprotocol/crontask/v1/subscriptions/creator/${creator}?pagination.reverse=true`,
            {
              dataTransformer: ({ data }: { data: { subscriptions?: unknown[] } }) =>
                Array.isArray(data.subscriptions) ? data.subscriptions : [],
            }
          )
          return res
        },
        async deleteSubscription(
          this: Request,
          params: {
            creator: string
            subscription_id: string | number
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
          const { creator, subscription_id, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.crontask.v1.MsgDeleteSubscription',
            creator,
            subscription_id: String(subscription_id),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          if (!res?.success) throw new Error(res?.rawLog || 'Crontask subscription delete failed')
          // Remove from local store immediately
          try {
            useRepo(CrontaskSubscription)
              .where('subscription_id', (v: string) => String(v) === String(subscription_id))
              .delete()
          } catch (e) {
            console.error(e)
          }
          await this.get(
            `/dysonprotocol/crontask/v1/subscriptions/creator/${creator}?pagination.reverse=true`,
            {
              dataTransformer: ({ data }: { data: { subscriptions?: unknown[] } }) =>
                Array.isArray(data.subscriptions) ? data.subscriptions : [],
            }
          )
          return res
        },
      },
    },
  }
}

export default CrontaskSubscription
