import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import { useAxiosRepo } from '@pinia-orm/axios'
import NftItem from '../nft/NftItem'

type WalletLike = {
  sendMsg: (args: {
    msg: unknown
    gasLimit?: number | 'auto'
    memo?: string
    executorAddress?: string
  }) => Promise<{ success: boolean; rawLog?: string }>
}

export class NameserviceRegistration extends Model {
  static entity = 'nameservice_registration'
  static primaryKey = ['committer', 'name', 'salt']

  static fields() {
    return {
      committer: this.string(''),
      name: this.string(''),
      salt: this.string(''),
      hexhash: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async computeHash(
          this: Request,
          params: { name: string; salt: string; committer: string }
        ): Promise<string> {
          const { name, salt, committer } = params
          const qs = new URLSearchParams({ name, salt, committer })
          let hexhash = ''
          await this.get(`/dysonprotocol/nameservice/v1/compute_hash?${qs}`, {
            dataTransformer: ({ data }: { data: { hex_hash?: string } }) => {
              hexhash = String(data?.hex_hash || '')
              if (!hexhash) return []
              return [
                {
                  committer,
                  name,
                  salt,
                  hexhash,
                },
              ]
            },
          })
          return hexhash
        },
        async commit(
          this: Request,
          params: {
            committer: string
            hexhash: string
            valuation: { amount: string; denom: string }
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { committer, hexhash, valuation, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgCommit',
            committer,
            hexhash,
            valuation,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: committer })
          if (!res?.success) throw new Error(res?.rawLog || 'Commit failed')
          return res
        },
        async reveal(
          this: Request,
          params: {
            committer: string
            name: string
            salt: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            refreshNft?: boolean
          }
        ) {
          const { committer, name, salt, wallet, gasLimit, memo, refreshNft } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgReveal',
            committer,
            name,
            salt,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: committer })
          if (!res?.success) throw new Error(res?.rawLog || 'Reveal failed')
          if (refreshNft) {
            await Promise.allSettled([
              useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', name),
              useAxiosRepo(NftItem).api().fetchOwner('nameservice.dys', name),
            ])
          }
          return res
        },
      },
    },
  }
}

export default NameserviceRegistration
