import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import { useAxiosRepo } from '@pinia-orm/axios'
import NftItem from '../nft/NftItem'
import type { WalletLike } from '@/orm/types/WalletLike'

function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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

        /**
         * Register a name in a single transaction (commit + reveal combined).
         * This is the simplified flow for users who don't need front-running protection.
         */
        async registerName(
          this: Request,
          params: {
            committer: string
            name: string
            valuation: { amount: string; denom: string }
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { committer, name, valuation, wallet, gasLimit, memo } = params
          const salt = generateSalt()

          // Compute hash first
          const qs = new URLSearchParams({ name, salt, committer })
          let hexhash = ''
          await this.get(`/dysonprotocol/nameservice/v1/compute_hash?${qs}`, {
            dataTransformer: ({ data }: { data: { hex_hash?: string } }) => {
              hexhash = String(data?.hex_hash || '')
              return []
            },
          })
          if (!hexhash) throw new Error('Failed to compute name hash')

          // Build both messages
          const commitMsg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgCommit',
            committer,
            hexhash,
            valuation,
          }
          const revealMsg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgReveal',
            committer,
            name,
            salt,
          }

          // Send both in one transaction
          const res = await wallet.sendMsg({
            msgs: [commitMsg, revealMsg],
            gasLimit,
            memo,
            executorAddress: committer,
          })

          if (!res?.success) throw new Error(res?.rawLog || 'Registration failed')

          // Refresh NFT data
          await Promise.allSettled([
            useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', name),
            useAxiosRepo(NftItem).api().fetchOwner('nameservice.dys', name),
          ])

          return res
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
