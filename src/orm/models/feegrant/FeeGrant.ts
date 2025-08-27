import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

type GrantAny = {
  '@type'?: string
} & Record<string, unknown>

type GrantRecord = {
  granter: string
  grantee: string
  allowance_type_url: string
  allowance: GrantAny
}

function transformSingle(granter: string, grantee: string) {
  return ({
    data,
  }: {
    data: { allowance?: { granter?: string; grantee?: string; allowance?: GrantAny } }
  }) => {
    const g = data?.allowance
    const any = g?.allowance as GrantAny | undefined
    if (!g?.granter || !g?.grantee || !any?.['@type']) return []
    return [
      {
        granter: String(g.granter),
        grantee: String(g.grantee),
        allowance_type_url: String(any['@type'] || ''),
        allowance: any,
      } as GrantRecord,
    ]
  }
}

function transformList() {
  return ({
    data,
  }: {
    data: { allowances?: Array<{ granter?: string; grantee?: string; allowance?: GrantAny }> }
  }) => {
    const list = Array.isArray(data?.allowances) ? data.allowances : []
    return list
      .filter((g) => g?.granter && g?.grantee && g?.allowance?.['@type'])
      .map((g) => ({
        granter: String(g.granter),
        grantee: String(g.grantee),
        allowance_type_url: String((g.allowance as GrantAny)['@type'] || ''),
        allowance: (g.allowance || {}) as GrantAny,
      }))
  }
}

export class FeeGrant extends Model {
  static entity = 'feegrants'
  static primaryKey = ['granter', 'grantee']

  static fields() {
    return {
      granter: this.string(''),
      grantee: this.string(''),
      allowance_type_url: this.string(''),
      allowance: this.attr({}),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAllowance(this: Request, granter: string, grantee: string) {
          return this.get(`/cosmos/feegrant/v1beta1/allowance/${granter}/${grantee}`, {
            dataTransformer: transformSingle(granter, grantee),
          })
        },
        async fetchAllowancesForGrantee(this: Request, grantee: string) {
          return this.get(`/cosmos/feegrant/v1beta1/allowances/${grantee}`, {
            dataTransformer: transformList(),
          })
        },
        async fetchAllowancesByGranter(this: Request, granter: string) {
          return this.get(`/cosmos/feegrant/v1beta1/issued/${granter}`, {
            dataTransformer: transformList(),
          })
        },
        async grantAllowance(
          this: Request,
          params: {
            granter: string
            grantee: string
            allowance: GrantAny
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
          const { granter, grantee, allowance, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
            granter,
            grantee,
            allowance,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: granter })
          ensureOk(res, 'Feegrant grant failed')
          await Promise.all([
            this.get(`/cosmos/feegrant/v1beta1/allowance/${granter}/${grantee}`, {
              dataTransformer: transformSingle(granter, grantee),
            }),
            this.get(`/cosmos/feegrant/v1beta1/allowances/${grantee}`, {
              dataTransformer: transformList(),
            }),
            this.get(`/cosmos/feegrant/v1beta1/issued/${granter}`, {
              dataTransformer: transformList(),
            }),
          ])
          return res
        },
        async revokeAllowance(
          this: Request,
          params: {
            granter: string
            grantee: string
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
          const { granter, grantee, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.feegrant.v1beta1.MsgRevokeAllowance',
            granter,
            grantee,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: granter })
          ensureOk(res, 'Feegrant revoke failed')
          await Promise.all([
            this.get(`/cosmos/feegrant/v1beta1/allowances/${grantee}`, {
              dataTransformer: transformList(),
            }),
            this.get(`/cosmos/feegrant/v1beta1/issued/${granter}`, {
              dataTransformer: transformList(),
            }),
          ])
          return res
        },
        async pruneAllowances(
          this: Request,
          params: {
            pruner: string
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
            refreshGrantee?: string
            refreshGranter?: string
          }
        ) {
          const { pruner, wallet, gasLimit, memo, refreshGrantee, refreshGranter } = params
          const msg = {
            '@type': '/cosmos.feegrant.v1beta1.MsgPruneAllowances',
            pruner,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: pruner })
          ensureOk(res, 'Feegrant prune failed')
          const refresh: Array<Promise<unknown>> = []
          if (refreshGrantee) {
            refresh.push(
              this.get(`/cosmos/feegrant/v1beta1/allowances/${refreshGrantee}`, {
                dataTransformer: transformList(),
              })
            )
          }
          if (refreshGranter) {
            refresh.push(
              this.get(`/cosmos/feegrant/v1beta1/issued/${refreshGranter}`, {
                dataTransformer: transformList(),
              })
            )
          }
          if (refresh.length) await Promise.all(refresh)
          return res
        },
      },
    },
  }
}

export default FeeGrant
