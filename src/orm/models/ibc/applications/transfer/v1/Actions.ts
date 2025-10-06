import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import type { WalletLike } from '@/orm/types/WalletLike'

type Coin = { denom: string; amount: string }

export class Ics20Actions extends Model {
  static entity = 'ibc_ics20_actions'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async transfer(
          this: Request,
          params: {
            source_port: string
            source_channel: string
            token: Coin
            sender: string
            receiver: string
            timeout_timestamp?: string
            memo?: string
            encoding?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
          }
        ) {
          const {
            source_port,
            source_channel,
            token,
            sender,
            receiver,
            timeout_timestamp,
            memo,
            encoding,
            wallet,
            gasLimit,
          } = params
          const msg: Record<string, unknown> = {
            '@type': '/ibc.applications.transfer.v1.MsgTransfer',
            source_port,
            source_channel,
            token,
            sender,
            receiver,
            ...(timeout_timestamp ? { timeout_timestamp } : {}),
            ...(memo ? { memo } : {}),
            ...(encoding ? { encoding } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, executorAddress: sender })
          if (!res?.success) throw new Error(res?.rawLog || 'ICS-20 transfer failed')
          return res
        },
      },
    },
  }
}

export default Ics20Actions
