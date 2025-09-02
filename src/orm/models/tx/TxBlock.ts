import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Tx = Record<string, unknown>
type TxResponse = {
  txhash?: string
  height?: string | number
  timestamp?: string
}

export class TxBlock extends Model {
  static entity = 'tx_blocks'
  static primaryKey = 'height'

  static fields() {
    return {
      height: this.string('0'),
      timestamp: this.string(''),
      tx_count: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchSummary(this: Request, height: string | number) {
          return this.get(`/cosmos/tx/v1beta1/txs/block/${height}`, {
            cache: {
              ttl: 30000 + Math.floor(Math.random() * 1000),
            },
            dataTransformer: ({ data }: { data: { txs?: Tx[]; tx_responses?: TxResponse[] } }) => {
              const txs = Array.isArray(data?.txs) ? data.txs : []
              const resps = Array.isArray(data?.tx_responses) ? data.tx_responses : []
              const anyResp = resps[0] || {}
              return [
                {
                  height: String((anyResp?.height as string | number | undefined) ?? height ?? '0'),
                  timestamp: String(anyResp?.timestamp || ''),
                  tx_count: String(txs.length),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default TxBlock
