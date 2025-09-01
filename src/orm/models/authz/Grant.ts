import { Model } from 'pinia-orm'
import { useRepo } from 'pinia-orm'
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

function deriveMsgTypeUrlFromAuthorization(auth?: GrantAuthorization['authorization']): string {
  const typeUrl = auth?.['@type'] || ''
  if (typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization') {
    return String(auth?.msg || '')
  }
  switch (typeUrl) {
    case '/cosmos.bank.v1beta1.SendAuthorization':
      return '/cosmos.bank.v1beta1.MsgSend'
    case '/cosmos.staking.v1beta1.StakeAuthorization': {
      const raw = (auth as Record<string, unknown>)?.['authorization_type']
      const value = typeof raw === 'string' ? raw : typeof raw === 'number' ? raw : 0
      if (value === 1 || value === 'AUTHORIZATION_TYPE_DELEGATE')
        return '/cosmos.staking.v1beta1.MsgDelegate'
      if (value === 2 || value === 'AUTHORIZATION_TYPE_UNDELEGATE')
        return '/cosmos.staking.v1beta1.MsgUndelegate'
      if (value === 3 || value === 'AUTHORIZATION_TYPE_REDELEGATE')
        return '/cosmos.staking.v1beta1.MsgBeginRedelegate'
      if (value === 4 || value === 'AUTHORIZATION_TYPE_CANCEL_UNBONDING_DELEGATION')
        return '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation'
      return ''
    }
    case '/ibc.applications.transfer.v1.TransferAuthorization':
      return '/ibc.applications.transfer.v1.MsgTransfer'
    case '/dysonprotocol.script.v1.ScriptExecAuthorization':
      return '/dysonprotocol.script.v1.MsgExec'
    default:
      return ''
  }
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
      const derived = deriveMsgTypeUrlFromAuthorization(g.authorization)
      const msgTypeUrl = derived || String(providedMsgTypeUrl || '')
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
          await this.fetchGrants({ granter, grantee, msgTypeUrl })
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
          // Remove any existing grants between granter and grantee before refresh
          try {
            await useRepo(Grant).delete((r: { granter?: string; grantee?: string }) => {
              console.log(r)
              return r.granter === granter && r.grantee === grantee
            })
          } catch (e) {
            // Best-effort cache clear; proceed to refresh regardless
            console.error(e)
          }
          await this.fetchByGranter(granter)
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
                this.fetchGrants({ granter: granterForRefresh, grantee, msgTypeUrl: t })
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
          await this.fetchGrants({ granter, grantee, msgTypeUrl: maybeGenericMsg || undefined })
          return res
        },
      },
    },
  }
}

export default Grant
