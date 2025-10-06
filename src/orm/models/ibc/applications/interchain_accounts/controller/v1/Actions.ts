import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import type { WalletLike } from '@/orm/types/WalletLike'

export class IcaControllerActions extends Model {
  static entity = 'ibc_ica_controller_actions'
  static primaryKey = 'default'

  static fields() {
    return { default: this.string('default') }
  }

  static config = {
    axiosApi: {
      actions: {
        async registerInterchainAccount(
          this: Request,
          params: {
            owner: string
            connection_id: string
            version?: string
            ordering?: 'ORDER_NONE_UNSPECIFIED' | 'ORDER_UNORDERED' | 'ORDER_ORDERED'
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { owner, connection_id, version, ordering, wallet, gasLimit, memo } = params
          const msg: Record<string, unknown> = {
            '@type': '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
            owner,
            connection_id,
            ...(version ? { version } : {}),
            ...(ordering ? { ordering } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: owner })
          if (!res?.success) throw new Error(res?.rawLog || 'ICA register failed')
          return res
        },
        async sendTx(
          this: Request,
          params: {
            owner: string
            connection_id: string
            packet_data: { type: 'TYPE_EXECUTE_TX' | 'TYPE_UNSPECIFIED'; data: string; memo?: string }
            relative_timeout: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { owner, connection_id, packet_data, relative_timeout, wallet, gasLimit, memo } = params
          const msg: Record<string, unknown> = {
            '@type': '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
            owner,
            connection_id,
            packet_data,
            relative_timeout,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: owner })
          if (!res?.success) throw new Error(res?.rawLog || 'ICA send tx failed')
          return res
        },
      },
    },
  }
}

export default IcaControllerActions


