import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type GrantAuthorization = {
  granter?: string
  grantee?: string
  authorization?: { '@type'?: string; msg?: string } & Record<string, unknown>
  expiration?: string
}

type GrantsResponse = {
  grants?: GrantAuthorization[]
}

function transformGrants(
  fallbackGranter: string | undefined,
  fallbackGrantee: string | undefined,
  providedMsgTypeUrl?: string
) {
  return ({ data }: { data: GrantsResponse }) => {
    const list = Array.isArray(data?.grants) ? data.grants : []
    return list.map((g) => {
      const granter = g.granter || fallbackGranter || ''
      const grantee = g.grantee || fallbackGrantee || ''
      const typeUrl = g.authorization?.['@type'] || ''
      const msgTypeUrl =
        typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization'
          ? String(g.authorization?.msg || '')
          : String(providedMsgTypeUrl || '')
      return {
        granter,
        grantee,
        type_url: typeUrl,
        msg_type_url: msgTypeUrl,
        expiration: g.expiration || '',
        authorization: g.authorization || {},
      }
    })
  }
}

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

export class Grant extends Model {
  static entity = 'authz_grants'
  static primaryKey = ['granter', 'grantee', 'type_url', 'msg_type_url']

  static fields() {
    return {
      granter: this.string(''),
      grantee: this.string(''),
      type_url: this.string(''),
      msg_type_url: this.string(''),
      expiration: this.string(''),
      authorization: this.attr({}),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchGrants(
          this: Request,
          params: { granter: string; grantee: string; msgTypeUrl?: string }
        ) {
          const { granter, grantee, msgTypeUrl } = params
          const qs = new URLSearchParams({ granter, grantee })
          if (msgTypeUrl) qs.set('msg_type_url', msgTypeUrl)
          return this.get(`/cosmos/authz/v1beta1/grants?${qs}`, {
            dataTransformer: transformGrants(granter, grantee, msgTypeUrl),
          })
        },
        async fetchByGranter(this: Request, granter: string) {
          return this.get(`/cosmos/authz/v1beta1/grants/granter/${granter}`, {
            dataTransformer: transformGrants(granter, undefined, undefined),
          })
        },
        async fetchByGrantee(this: Request, grantee: string) {
          return this.get(`/cosmos/authz/v1beta1/grants/grantee/${grantee}`, {
            dataTransformer: transformGrants(undefined, grantee, undefined),
          })
        },
        async grantGeneric(
          this: Request,
          params: {
            granter: string
            grantee: string
            msgTypeUrl: string
            expiration: string
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
          const { granter, grantee, msgTypeUrl, expiration, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.authz.v1beta1.MsgGrant',
            granter,
            grantee,
            grant: (() => {
              const grant: Record<string, unknown> = {
                authorization: {
                  '@type': '/cosmos.authz.v1beta1.GenericAuthorization',
                  msg: msgTypeUrl,
                },
              }
              if (expiration && expiration.trim().length > 0) grant.expiration = expiration
              return grant
            })(),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: granter })
          ensureOk(res, 'Authz grant failed')
          const qs = new URLSearchParams({ granter, grantee, msg_type_url: msgTypeUrl })
          await this.get(`/cosmos/authz/v1beta1/grants?${qs}`, {
            dataTransformer: transformGrants(granter, grantee, msgTypeUrl),
          })
          return res
        },
        async revoke(
          this: Request,
          params: {
            granter: string
            grantee: string
            msgTypeUrl: string
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
          const { granter, grantee, msgTypeUrl, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.authz.v1beta1.MsgRevoke',
            granter,
            grantee,
            msg_type_url: msgTypeUrl,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: granter })
          ensureOk(res, 'Authz revoke failed')
          const qs = new URLSearchParams({ granter, grantee })
          await this.get(`/cosmos/authz/v1beta1/grants?${qs}`, {
            dataTransformer: transformGrants(granter, grantee, undefined),
          })
          return res
        },
        async exec(
          this: Request,
          params: {
            grantee: string
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
            granterForRefresh?: string
          }
        ) {
          const { grantee, msgs, wallet, gasLimit, memo, granterForRefresh } = params
          const msg = {
            '@type': '/cosmos.authz.v1beta1.MsgExec',
            grantee,
            msgs,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: grantee })
          ensureOk(res, 'Authz exec failed')

          if (granterForRefresh) {
            const msgTypes = msgs
              .map((m) => (m as { ['@type']?: string })?.['@type'])
              .filter((t): t is string => typeof t === 'string' && t.length > 0)
            await Promise.allSettled(
              msgTypes.map((t) =>
                this.get(
                  `/cosmos/authz/v1beta1/grants?${new URLSearchParams({
                    granter: granterForRefresh,
                    grantee,
                    msg_type_url: t,
                  })}`,
                  { dataTransformer: transformGrants(granterForRefresh, grantee, t) }
                )
              )
            )
          }
          return res
        },
        async grant(
          this: Request,
          params: {
            granter: string
            grantee: string
            authorization: Record<string, unknown> & { ['@type']: string }
            expiration: string
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
          const { granter, grantee, authorization, expiration, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/cosmos.authz.v1beta1.MsgGrant',
            granter,
            grantee,
            grant: (() => {
              const grant: Record<string, unknown> = { authorization }
              if (expiration && expiration.trim().length > 0) grant.expiration = expiration
              return grant
            })(),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: granter })
          ensureOk(res, 'Authz grant failed')
          const maybeGenericMsg =
            authorization?.['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization'
              ? String((authorization as { msg?: string }).msg || '')
              : ''
          const qs = new URLSearchParams({ granter, grantee })
          if (maybeGenericMsg) qs.set('msg_type_url', maybeGenericMsg)
          await this.get(`/cosmos/authz/v1beta1/grants?${qs}`, {
            dataTransformer: transformGrants(granter, grantee, maybeGenericMsg || undefined),
          })
          return res
        },
      },
    },
  }
}

export default Grant
