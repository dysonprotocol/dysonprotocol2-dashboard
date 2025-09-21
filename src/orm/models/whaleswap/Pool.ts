import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Coin = { denom: string; amount: string }

type PoolData = {
  pool_id?: string | number
  coins?: Coin[]
  shares_denom?: string
  fee_pct?: string
  min_price?: Coin[]
  max_price?: Coin[]
  block_height?: string | number
  created?: string
  updated?: string
  num_trades?: string | number
  fees_earned?: Coin[]
}

export class WhaleswapPool extends Model {
  static entity = 'whaleswap_pools'
  static primaryKey = 'pool_id'

  static fields() {
    return {
      pool_id: this.string(''),
      coins: this.attr([] as Coin[]),
      shares_denom: this.string(''),
      fee_pct: this.string('0'),
      min_price: this.attr([] as Coin[]),
      max_price: this.attr([] as Coin[]),
      block_height: this.string('0'),
      created: this.string(''),
      updated: this.string(''),
      num_trades: this.string('0'),
      fees_earned: this.attr([] as Coin[]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchPool(this: Request, poolId: string | number) {
          return this.get(`/dysonprotocol/whaleswap/v1/pools/${poolId}`, {
            dataTransformer: ({ data }: { data: { pool?: PoolData } }) => {
              const p = data?.pool
              if (!p?.pool_id) return []
              return [WhaleswapPool.transformOne(p)]
            },
          })
        },
        async fetchPools(
          this: Request,
          params?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (params?.next_key) qs.set('pagination.key', params.next_key)
          if (params?.limit) qs.set(params.next_key ? 'pagination.limit' : 'limit', params.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/pools?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                pools?: PoolData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.pools) ? data!.pools! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((p) => p?.pool_id != null)
                .map((p) => WhaleswapPool.transformOne(p))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: params?.limit }
        },
        async fetchPoolsByDenom(
          this: Request,
          denom: string,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams({ denom })
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/pools/by_denom?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                pools?: PoolData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.pools) ? data!.pools! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((p) => p?.pool_id != null)
                .map((p) => WhaleswapPool.transformOne(p))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
        async fetchPoolsByPair(
          this: Request,
          params: { base_denom: string; quote_denom: string; limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { base_denom, quote_denom, limit, next_key } = params
          const qs = new URLSearchParams({ base_denom, quote_denom })
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/pools/by_pair?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                pools?: PoolData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.pools) ? data!.pools! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((p) => p?.pool_id != null)
                .map((p) => WhaleswapPool.transformOne(p))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchPoolsByPairPriceRange(
          this: Request,
          params: {
            base_denom: string
            quote_denom: string
            min_price?: string
            max_price?: string
            limit?: string
            next_key?: string
          }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const { base_denom, quote_denom, min_price, max_price, limit, next_key } = params
          const qs = new URLSearchParams({ base_denom, quote_denom })
          if (min_price) qs.set('min_price', min_price)
          if (max_price) qs.set('max_price', max_price)
          if (next_key) qs.set('pagination.key', next_key)
          if (limit) qs.set(next_key ? 'pagination.limit' : 'limit', limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/pools/by_pair_price?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                pools?: PoolData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.pools) ? data!.pools! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((p) => p?.pool_id != null)
                .map((p) => WhaleswapPool.transformOne(p))
            },
          })
          return { next_key: nk || undefined, total, returned, limit }
        },
        async fetchPoolBySharesDenom(this: Request, shares_denom: string) {
          const qs = new URLSearchParams({ shares_denom })
          return this.get(`/dysonprotocol/whaleswap/v1/pools/by_shares?${qs}`, {
            dataTransformer: ({ data }: { data: { pool?: PoolData } }) => {
              const p = data?.pool
              if (!p?.pool_id) return []
              return [WhaleswapPool.transformOne(p)]
            },
          })
        },
        async fetchPoolsByOwner(
          this: Request,
          owner: string,
          opts?: { limit?: string; next_key?: string }
        ): Promise<{ next_key?: string; total?: string; returned?: number; limit?: string }> {
          const qs = new URLSearchParams()
          if (opts?.next_key) qs.set('pagination.key', opts.next_key)
          if (opts?.limit) qs.set(opts.next_key ? 'pagination.limit' : 'limit', opts.limit)
          let nk: string | undefined
          let total: string | undefined
          let returned = 0
          await this.get(`/dysonprotocol/whaleswap/v1/pools/owner/${owner}?${qs}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                pools?: PoolData[]
                pagination?: { next_key?: string; total?: string | number }
              }
            }) => {
              const list = Array.isArray(data?.pools) ? data!.pools! : []
              returned = list.length
              nk = data?.pagination?.next_key || ''
              const tot = data?.pagination?.total
              total = typeof tot === 'number' ? String(tot) : (tot as string | undefined)
              return list
                .filter((p) => p?.pool_id != null)
                .map((p) => WhaleswapPool.transformOne(p))
            },
          })
          return { next_key: nk || undefined, total, returned, limit: opts?.limit }
        },
      },
    },
  }

  static transformOne(p: PoolData) {
    return {
      pool_id: String(p.pool_id ?? ''),
      coins: Array.isArray(p.coins) ? p.coins : [],
      shares_denom: String(p.shares_denom || ''),
      fee_pct: String(p.fee_pct || '0'),
      min_price: Array.isArray(p.min_price) ? p.min_price : [],
      max_price: Array.isArray(p.max_price) ? p.max_price : [],
      block_height: String(p.block_height ?? '0'),
      created: String(p.created || ''),
      updated: String(p.updated || ''),
      num_trades: String(p.num_trades ?? '0'),
      fees_earned: Array.isArray(p.fees_earned) ? p.fees_earned : [],
    }
  }
}

export default WhaleswapPool
