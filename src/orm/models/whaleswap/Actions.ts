import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'
import WhaleswapParams from '@/orm/models/whaleswap/Params'

function ensureOk(res: { success: boolean; rawLog?: string }, msg: string) {
  if (!res?.success) throw new Error(res?.rawLog || msg)
}

type Coin = { denom: string; amount: string }

export class WhaleswapActions extends Model {
  static entity = 'whaleswap_actions'
  static primaryKey = 'default'

  static fields() {
    return {
      default: this.string('default'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async makeOffer(
          this: Request,
          params: {
            maker: string
            have: Coin
            want: Coin
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
          const { maker, have, want, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgMakeOffer',
            maker,
            have,
            want,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: maker })
          ensureOk(res, 'Whaleswap make offer failed')
          await useAxiosRepo(WhaleswapOffer).api().fetchOffersByOwner({ owner: maker })
          return res
        },
        async takeOffer(
          this: Request,
          params: {
            taker: string
            trades: Array<{ offer_id: string | number; take_units?: string }>
            wallet: {
              sendMsg: (args: {
                msg?: unknown
                msgs?: unknown[]
                gasLimit?: number | 'auto'
                memo?: string
                executorAddress?: string
              }) => Promise<{ success: boolean; rawLog?: string }>
            }
            gasLimit?: number | 'auto'
            memo?: string
          }
        ) {
          const { taker, trades, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgTakeOffer',
            taker,
            trades: trades.map((t) => ({
              offer_id: String(t.offer_id),
              ...(t.take_units ? { take_units: t.take_units } : {}),
            })),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: taker })
          ensureOk(res, 'Whaleswap take offer failed')
          try {
            await Promise.allSettled([
              useAxiosRepo(WhaleswapTrade).api().fetchTradesByTaker(taker),
              ...trades.map((t) =>
                useAxiosRepo(WhaleswapOffer).api().fetchOffer(String(t.offer_id))
              ),
              ...trades.map((t) =>
                useAxiosRepo(WhaleswapTrade).api().fetchTradesByOffer(String(t.offer_id))
              ),
            ])
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async cancelOffer(
          this: Request,
          params: {
            closer: string
            offer_id: string | number
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
          const { closer, offer_id, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgCancelOffer',
            closer,
            offer_id: String(offer_id),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: closer })
          ensureOk(res, 'Whaleswap cancel offer failed')
          try {
            await Promise.allSettled([
              useAxiosRepo(WhaleswapOffer).api().fetchOffer(String(offer_id)),
              useAxiosRepo(WhaleswapOffer).api().fetchOffersByOwner({ owner: closer }),
            ])
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async createPool(
          this: Request,
          params: {
            creator: string
            coins: Coin[]
            fee_pct?: string
            min_price?: Coin[]
            max_price?: Coin[]
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
          const { creator, coins, fee_pct, min_price, max_price, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgCreatePool',
            creator,
            coins,
            ...(Array.isArray(min_price) ? { min_price } : {}),
            ...(Array.isArray(max_price) ? { max_price } : {}),
            ...(fee_pct ? { fee_pct } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: creator })
          ensureOk(res, 'Whaleswap create pool failed')
          await useAxiosRepo(WhaleswapPool).api().fetchPools()
          return res
        },
        async addLiquidity(
          this: Request,
          params: {
            signer: string
            pool_id: string | number
            amount1: Coin
            amount2: Coin
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
          const { signer, pool_id, amount1, amount2, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgAddLiquidity',
            signer,
            pool_id: String(pool_id),
            amount1,
            amount2,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: signer })
          ensureOk(res, 'Whaleswap add liquidity failed')
          await useAxiosRepo(WhaleswapPool).api().fetchPool(String(pool_id))
          return res
        },
        async removeLiquidity(
          this: Request,
          params: {
            signer: string
            pool_id: string | number
            shares: string
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
          const { signer, pool_id, shares, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgRemoveLiquidity',
            signer,
            pool_id: String(pool_id),
            shares,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: signer })
          ensureOk(res, 'Whaleswap remove liquidity failed')
          await useAxiosRepo(WhaleswapPool).api().fetchPool(String(pool_id))
          return res
        },
        async poolSwap(
          this: Request,
          params: {
            trader: string
            pool_id: string | number
            input: Coin
            out_denom: string
            minimum_out_amount?: string
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
          const { trader, pool_id, input, out_denom, minimum_out_amount, wallet, gasLimit, memo } =
            params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgPoolSwap',
            trader,
            pool_id: String(pool_id),
            input,
            out_denom,
            ...(minimum_out_amount ? { minimum_out_amount } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: trader })
          ensureOk(res, 'Whaleswap pool swap failed')
          try {
            await Promise.allSettled([
              useAxiosRepo(WhaleswapPool).api().fetchPool(String(pool_id)),
              useAxiosRepo(WhaleswapTrade).api().fetchTradesByPool(String(pool_id)),
            ])
          } catch (e) {
            console.error(e)
          }
          return res
        },
        async updatePoolConfig(
          this: Request,
          params: {
            signer: string
            pool_id: string | number
            fee_pct?: string
            min_price?: Coin[]
            max_price?: Coin[]
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
          const { signer, pool_id, fee_pct, min_price, max_price, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgUpdatePoolConfig',
            signer,
            pool_id: String(pool_id),
            ...(fee_pct ? { fee_pct } : {}),
            ...(Array.isArray(min_price) ? { min_price } : {}),
            ...(Array.isArray(max_price) ? { max_price } : {}),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: signer })
          ensureOk(res, 'Whaleswap update pool config failed')
          await useAxiosRepo(WhaleswapPool).api().fetchPool(String(pool_id))
          return res
        },
        async convertToLiquid(
          this: Request,
          params: {
            caller: string
            denom: string
            amount: string
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
          const { caller, denom, amount, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgConvertToLiquid',
            caller,
            denom,
            amount,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: caller })
          ensureOk(res, 'Whaleswap convert to liquid failed')
          return res
        },
        async convertToSolid(
          this: Request,
          params: {
            caller: string
            liquid_denom: string
            amount: string
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
          const { caller, liquid_denom, amount, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgConvertToSolid',
            caller,
            liquid_denom,
            amount,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: caller })
          ensureOk(res, 'Whaleswap convert to solid failed')
          return res
        },
        async openAuction(
          this: Request,
          params: {
            seller: string
            sell: Coin
            bid_denom: string
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
          const { seller, sell, bid_denom, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgOpenAuction',
            seller,
            sell,
            bid_denom,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: seller })
          ensureOk(res, 'Whaleswap open auction failed')
          await useAxiosRepo(WhaleswapAuction).api().fetchAuctionsBySeller(seller)
          return res
        },
        async redeemAuction(
          this: Request,
          params: {
            caller: string
            auction_id: string | number
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
          const { caller, auction_id, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgRedeemAuction',
            caller,
            auction_id: String(auction_id),
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: caller })
          ensureOk(res, 'Whaleswap redeem auction failed')
          await useAxiosRepo(WhaleswapAuction).api().fetchAuction(String(auction_id))
          return res
        },
        async updateParams(
          this: Request,
          params: {
            authority: string
            params: {
              pfand_per_offer?: Coin
              valuation_fee_pct?: string
              valuation_period?: string
              bid_timeout?: string
              minimum_bid_percent_increase?: string
            }
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
          const { authority, params: p, wallet, gasLimit, memo } = params
          const msg = {
            '@type': '/dysonprotocol.whaleswap.v1.MsgUpdateParams',
            authority,
            params: p,
          }
          const res = await wallet.sendMsg({ msg, gasLimit, memo, executorAddress: authority })
          ensureOk(res, 'Whaleswap update params failed')
          await useAxiosRepo(WhaleswapParams).api().fetch()
          return res
        },
      },
    },
  }
}

export default WhaleswapActions
