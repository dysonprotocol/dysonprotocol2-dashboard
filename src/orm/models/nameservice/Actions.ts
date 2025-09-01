import { Model } from 'pinia-orm'
import { useRepo } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import type { WalletLike } from '@/orm/types/WalletLike'
import { useAxiosRepo } from '@pinia-orm/axios'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import Supply from '@/orm/models/bank/Supply'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import NftItem from '@/orm/models/nft/NftItem'

export class NameserviceActions extends Model {
  static entity = 'nameservice_actions'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async setDestination(
          this: Request,
          params: {
            owner: string
            name: string
            destination: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { owner, name, destination, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetDestination',
            owner,
            name,
            destination,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set destination failed')
          return res
        },
        async setNameMetadata(
          this: Request,
          params: {
            owner: string
            name: string
            metadata: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { owner, name, metadata, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNameMetadata',
            owner,
            name,
            metadata,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set name metadata failed')
          return res
        },
        async setValuation(
          this: Request,
          params: {
            owner: string
            nft_class_id: string
            nft_id: string
            valuation: { amount: string; denom: string }
            max_valuation_fee_pct?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            owner,
            nft_class_id,
            nft_id,
            valuation,
            max_valuation_fee_pct,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg: {
            '@type': string
            owner: string
            nft_class_id: string
            nft_id: string
            valuation: { amount: string; denom: string }
            max_valuation_fee_pct?: string
          } = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetValuation',
            owner,
            nft_class_id,
            nft_id,
            valuation,
            ...(max_valuation_fee_pct ? { max_valuation_fee_pct } : {}),
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set valuation failed')
          return res
        },
        async renew(
          this: Request,
          params: {
            payer: string
            nft_class_id: string
            nft_id: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { payer, nft_class_id, nft_id, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgRenew',
            payer,
            nft_class_id,
            nft_id,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || payer,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Renew failed')
          return res
        },
        async placeBid(
          this: Request,
          params: {
            bidder: string
            nft_class_id: string
            nft_id: string
            bid_amount: { amount: string; denom: string }
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            bidder,
            nft_class_id,
            nft_id,
            bid_amount,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgPlaceBid',
            bidder,
            nft_class_id,
            nft_id,
            bid_amount,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || bidder,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Place bid failed')
          return res
        },
        async acceptBid(
          this: Request,
          params: {
            owner: string
            nft_class_id: string
            nft_id: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { owner, nft_class_id, nft_id, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgAcceptBid',
            owner,
            nft_class_id,
            nft_id,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Accept bid failed')
          return res
        },
        async rejectBid(
          this: Request,
          params: {
            owner: string
            nft_class_id: string
            nft_id: string
            new_valuation: { amount: string; denom: string }
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            owner,
            nft_class_id,
            nft_id,
            new_valuation,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgRejectBid',
            owner,
            nft_class_id,
            nft_id,
            new_valuation,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Reject bid failed')
          return res
        },
        async claimBid(
          this: Request,
          params: {
            bidder: string
            nft_class_id: string
            nft_id: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { bidder, nft_class_id, nft_id, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgClaimBid',
            bidder,
            nft_class_id,
            nft_id,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || bidder,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Claim bid failed')
          return res
        },
        async mintCoins(
          this: Request,
          params: {
            name_destination: string
            amount: Array<{ denom: string; amount: string }>
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, amount, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgMintCoins',
            name_destination,
            amount,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress })
          if (!res?.success) throw new Error(res?.rawLog || 'Mint coins failed')
          // Best-effort refresh of related bank data: supply and balances for affected denoms
          try {
            const denoms = Array.isArray(amount)
              ? amount.map((c) => String(c?.denom || '')).filter((d) => !!d)
              : []
            await Promise.all(
              denoms.flatMap((d) => [
                useAxiosRepo(Supply).api().fetchByDenom(d),
                useAxiosRepo(Balance).api().fetchByDenom(name_destination, d),
                useAxiosRepo(SpendableBalance).api().fetchByDenom(name_destination, d),
              ])
            )
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async saveClass(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            name?: string
            symbol?: string
            description?: string
            uri?: string
            uri_hash?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            name,
            symbol,
            description,
            uri,
            uri_hash,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSaveClass',
            name_destination,
            class_id,
            name: String(name || ''),
            symbol: String(symbol || ''),
            description: String(description || ''),
            uri: String(uri || ''),
            uri_hash: String(uri_hash || ''),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress })
          if (!res?.success) throw new Error(res?.rawLog || 'Save class failed')
          return res
        },
        async createExternalName(
          this: Request,
          params: {
            authority: string
            name: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { authority, name, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgCreateExternalName',
            authority,
            name,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || authority,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Create external name failed')
          return res
        },
        async setNFTMetadata(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            nft_id: string
            metadata?: string
            uri?: string
            uri_hash?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            nft_id,
            metadata,
            uri,
            uri_hash,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTMetadata',
            name_destination,
            class_id,
            nft_id,
            metadata: String(metadata || ''),
            uri: String(uri || ''),
            uri_hash: String(uri_hash || ''),
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set NFT metadata failed')
          return res
        },
        async setNFTClassExtraData(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            extra_data: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            extra_data,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassExtraData',
            name_destination,
            class_id,
            extra_data,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class extra_data failed')
          return res
        },
        async setNFTClassAlwaysListed(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            always_listed: boolean
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            always_listed,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassAlwaysListed',
            name_destination,
            class_id,
            always_listed,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class always_listed failed')
          return res
        },
        async setNFTClassValuationFeePct(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            valuation_fee_pct: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            valuation_fee_pct,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassValuationFeePct',
            name_destination,
            class_id,
            valuation_fee_pct,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_fee_pct failed')
          return res
        },
        async setNFTClassValuationPeriod(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            valuation_period: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            valuation_period,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassValuationPeriod',
            name_destination,
            class_id,
            valuation_period,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_period failed')
          return res
        },
        async setNFTClassBidTimeout(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            bid_timeout: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            bid_timeout,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassBidTimeout',
            name_destination,
            class_id,
            bid_timeout,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class bid_timeout failed')
          return res
        },
        async setNFTClassAllowedDenoms(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            allowed_denoms: string[]
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            allowed_denoms,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassAllowedDenoms',
            name_destination,
            class_id,
            allowed_denoms,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set class allowed_denoms failed')
          return res
        },
        async setNFTClassRejectBidValuationFeePercent(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            reject_bid_valuation_fee_percent: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            reject_bid_valuation_fee_percent,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassRejectBidValuationFeePercent',
            name_destination,
            class_id,
            reject_bid_valuation_fee_percent,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success)
            throw new Error(res?.rawLog || 'Set class reject_bid_valuation_fee_percent failed')
          return res
        },
        async setNFTClassMinimumBidPercentIncrease(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            minimum_bid_percent_increase: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            minimum_bid_percent_increase,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetNFTClassMinimumBidPercentIncrease',
            name_destination,
            class_id,
            minimum_bid_percent_increase,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success)
            throw new Error(res?.rawLog || 'Set class minimum_bid_percent_increase failed')
          return res
        },
        async setListed(
          this: Request,
          params: {
            nft_owner: string
            nft_class_id: string
            nft_id: string
            listed: boolean
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            nft_owner,
            nft_class_id,
            nft_id,
            listed,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetListed',
            nft_owner,
            nft_class_id,
            nft_id,
            listed,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || nft_owner,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set listed failed')
          return res
        },
        async updateParams(
          this: Request,
          params: {
            authority: string
            params: Record<string, unknown>
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { authority, params: p, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgUpdateParams',
            authority,
            params: p,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || authority,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Update params failed')
          return res
        },
        async burnCoins(
          this: Request,
          params: {
            name_destination: string
            amount: Array<{ denom: string; amount: string }>
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, amount, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgBurnCoins',
            name_destination,
            amount,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Burn coins failed')
          try {
            const denoms = Array.isArray(amount)
              ? amount.map((c) => String(c?.denom || '')).filter((d) => !!d)
              : []
            await Promise.all(
              denoms.flatMap((d) => [
                useAxiosRepo(Supply).api().fetchByDenom(d),
                useAxiosRepo(Balance).api().fetchByDenom(name_destination, d),
                useAxiosRepo(SpendableBalance).api().fetchByDenom(name_destination, d),
              ])
            )
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async setDenomMetadata(
          this: Request,
          params: {
            authority: string
            metadata: Record<string, unknown>
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { authority, metadata, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetDenomMetadata',
            authority,
            metadata,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || authority,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set denom metadata failed')
          // Best-effort refresh of the affected denom metadata
          try {
            const baseField =
              metadata && typeof metadata === 'object'
                ? (metadata as Record<string, unknown>)['base']
                : undefined
            if (typeof baseField === 'string' && baseField)
              await useAxiosRepo(DenomMetadata).api().fetchOne(baseField)
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async setDenomDescription(
          this: Request,
          params: {
            name_destination: string
            denom: string
            description: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, denom, description, wallet, gasLimit, memo, executorAddress } =
            params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetDenomDescription',
            name_destination,
            denom,
            description,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set denom description failed')
          try {
            if (denom) await useAxiosRepo(DenomMetadata).api().fetchOne(denom)
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async setDenomURI(
          this: Request,
          params: {
            name_destination: string
            denom: string
            uri?: string
            uri_hash?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            denom,
            uri,
            uri_hash,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgSetDenomURI',
            name_destination,
            denom,
            uri: String(uri || ''),
            uri_hash: String(uri_hash || ''),
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Set denom URI failed')
          try {
            if (denom) await useAxiosRepo(DenomMetadata).api().fetchOne(denom)
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async deleteClass(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, class_id, wallet, gasLimit, memo, executorAddress } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgDeleteClass',
            name_destination,
            class_id,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Delete class failed')
          return res
        },
        async mintNft(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            nft_id: string
            uri?: string
            uri_hash?: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            nft_id,
            uri,
            uri_hash,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgMintNFT',
            name_destination,
            class_id,
            nft_id,
            uri: String(uri || ''),
            uri_hash: String(uri_hash || ''),
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Mint NFT failed')
          // After successful mint, fetch the NFT so it's added to the store
          try {
            await useAxiosRepo(NftItem).api().fetchNftWithOwner(class_id, nft_id)
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async burnNft(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            nft_id: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, class_id, nft_id, wallet, gasLimit, memo, executorAddress } =
            params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgBurnNFT',
            name_destination,
            class_id,
            nft_id,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Burn NFT failed')
          // After successful burn, remove the NFT from the store
          try {
            useRepo(NftItem)
              .query()
              .where((r: any) => r.class_id === class_id && r.id === nft_id)
              .delete()
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async moveCoins(
          this: Request,
          params: {
            name_destination: string
            inputs: Array<{ address: string; coins: Array<{ denom: string; amount: string }> }>
            outputs: Array<{ address: string; coins: Array<{ denom: string; amount: string }> }>
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const { name_destination, inputs, outputs, wallet, gasLimit, memo, executorAddress } =
            params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgMoveCoins',
            name_destination,
            inputs,
            outputs,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Move coins failed')
          return res
        },
        async moveNft(
          this: Request,
          params: {
            name_destination: string
            class_id: string
            nft_id: string
            to_address: string
            wallet: WalletLike
            gasLimit?: number | 'auto'
            memo?: string
            executorAddress?: string
          }
        ) {
          const {
            name_destination,
            class_id,
            nft_id,
            to_address,
            wallet,
            gasLimit,
            memo,
            executorAddress,
          } = params
          const msg = {
            '@type': '/dysonprotocol.nameservice.v1.MsgMoveNft',
            name_destination,
            class_id,
            nft_id,
            to_address,
          }
          const res = await wallet.sendMsg({
            msg,
            gasLimit,
            memo,
            executorAddress: executorAddress || name_destination,
          })
          if (!res?.success) throw new Error(res?.rawLog || 'Move NFT failed')
          return res
        },
      },
    },
  }
}

export default NameserviceActions
