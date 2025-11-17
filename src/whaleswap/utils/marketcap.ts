import Decimal from 'decimal.js-light'
import type { Pool, Coin } from './types'
import type {
  DenomSupplyRow,
  ModuleMetricsRow,
  DenomMarketcapRow,
} from '../composables/useWhaleswapDB'

const log = (...args: unknown[]) => {
  console.debug('[marketcap]', ...args)
}

Decimal.set({ precision: 48, rounding: Decimal.ROUND_HALF_UP })

export type MarketcapConfig = {
  udysDenom: string
  maxFeeRate: string // decimal string, eg "0.01" (1%)
  minUdysLiquidity: string // udys amount as decimal string
  supplyMode: 'total' | 'circulating'
}

export const defaultMarketcapConfig: MarketcapConfig = {
  udysDenom: 'udys',
  maxFeeRate: '0.01',
  minUdysLiquidity: '1000',
  supplyMode: 'total',
}

export type MarketcapComputationInput = {
  pools: Pool[]
  supplies: DenomSupplyRow[]
  metrics?: ModuleMetricsRow
  config?: Partial<MarketcapConfig>
}

export function computeDenomMarketcaps({
  pools,
  supplies,
  metrics,
  config,
}: MarketcapComputationInput): DenomMarketcapRow[] {
  log('compute:start', {
    pools: pools.length,
    supplies: supplies.length,
    metrics: Boolean(metrics),
    config,
  })
  const cfg = { ...defaultMarketcapConfig, ...config }
  const cfgHash = `${cfg.udysDenom}:${cfg.maxFeeRate}:${cfg.minUdysLiquidity}:${cfg.supplyMode}`

  const supplyMap = buildAmountMap(supplies)
  const escrowedMap = buildCoinAmountMap(metrics?.escrowed_pool_coins ?? [])
  log('maps', { supplyDenoms: supplyMap.size, escrowedDenoms: escrowedMap.size })
  const minLiquidity = toDecimal(cfg.minUdysLiquidity)
  const maxFee = toDecimal(cfg.maxFeeRate)

  const perDenom = new Map<
    string,
    {
      totalUdys: Decimal
      totalOther: Decimal
      entries: Array<{ poolId: string; udys: Decimal }>
    }
  >()

  for (const pool of pools) {
    log('pool:inspect', { poolId: pool.pool_id, coins: pool.coins })
    const udysIndex = pool.coins.findIndex((coin) => coin.denom === cfg.udysDenom)
    if (udysIndex === -1) {
      log('pool:skip:noUdys', pool.pool_id)
      continue
    }

    const otherIndex = udysIndex === 0 ? 1 : 0
    const udysCoin = pool.coins[udysIndex]
    const otherCoin = pool.coins[otherIndex]

    const udysReserve = toDecimal(udysCoin.amount)
    const otherReserve = toDecimal(otherCoin.amount)
    if (udysReserve.lte(0) || otherReserve.lte(0)) {
      log('pool:skip:zeroReserve', { poolId: pool.pool_id, udysReserve, otherReserve })
      continue
    }
    if (udysReserve.lt(minLiquidity)) {
      log('pool:skip:illiquid', { poolId: pool.pool_id, udysReserve: udysReserve.toString() })
      continue
    }

    const fee = getFeeForDenom(pool, otherCoin.denom)
    if (fee && fee.gt(maxFee)) {
      log('pool:skip:highFee', {
        poolId: pool.pool_id,
        fee: fee.toString(),
        maxFee: maxFee.toString(),
      })
      continue
    }

    let bucket = perDenom.get(otherCoin.denom)
    if (!bucket) {
      bucket = { totalUdys: new Decimal(0), totalOther: new Decimal(0), entries: [] }
      perDenom.set(otherCoin.denom, bucket)
    }
    bucket.totalUdys = bucket.totalUdys.plus(udysReserve)
    bucket.totalOther = bucket.totalOther.plus(otherReserve)
    bucket.entries.push({ poolId: pool.pool_id, udys: udysReserve })
  }

  const rows: DenomMarketcapRow[] = []
  const denomList = [...perDenom.keys()]
  for (const denom of denomList) {
    const bucket = perDenom.get(denom)
    const supply = resolveSupply(denom, supplyMap, escrowedMap, cfg.supplyMode)
    if (!bucket) {
      const row: DenomMarketcapRow = {
        denom,
        price_udys: '0',
        marketcap_udys: '0',
        supply: formatInteger(supply),
        liquidity_udys: '0',
        contributing_pools: [],
        contributing_pool_liquidity: {},
        config_hash: cfgHash,
        status: 'no_price',
      }
      rows.push(row)
      log('row:noPool', row)
      continue
    }

    const liquidity = bucket.totalUdys
    const price = liquidity.div(bucket.totalOther)
    const marketcap = price.mul(supply)
    const status = liquidity.lt(minLiquidity) ? 'illiquid' : 'ok'

    const row: DenomMarketcapRow = {
      denom,
      price_udys: formatDecimal(price),
      marketcap_udys: formatDecimal(marketcap),
      supply: formatInteger(supply),
      liquidity_udys: formatDecimal(liquidity),
      contributing_pools: bucket.entries.map((entry) => entry.poolId),
      contributing_pool_liquidity: Object.fromEntries(
        bucket.entries.map((entry) => [entry.poolId, formatDecimal(entry.udys)])
      ),
      config_hash: cfgHash,
      status,
    }
    rows.push(row)
    log('row:computed', row)
  }

  log('compute:complete', rows.length)
  return rows.sort((a, b) => {
    const left = toDecimal(a.marketcap_udys)
    const right = toDecimal(b.marketcap_udys)
    if (left.eq(right)) return a.denom.localeCompare(b.denom)
    return right.comparedTo(left)
  })
}

function resolveSupply(
  denom: string,
  supplyMap: Map<string, Decimal>,
  escrowedMap: Map<string, Decimal>,
  mode: MarketcapConfig['supplyMode']
) {
  const total = supplyMap.get(denom) ?? new Decimal(0)
  if (mode === 'circulating') {
    const escrowed = escrowedMap.get(denom) ?? new Decimal(0)
    const adjusted = total.minus(escrowed)
    return adjusted.greaterThan(0) ? adjusted : new Decimal(0)
  }
  return total
}

function buildAmountMap(rows: DenomSupplyRow[]) {
  const map = new Map<string, Decimal>()
  for (const row of rows) {
    if (!row?.denom) continue
    map.set(row.denom, toDecimal(row.amount))
  }
  return map
}

function buildCoinAmountMap(coins: Coin[]) {
  const map = new Map<string, Decimal>()
  for (const coin of coins) {
    if (!coin?.denom) continue
    map.set(coin.denom, toDecimal(coin.amount))
  }
  return map
}

function getFeeForDenom(pool: Pool, denom: string) {
  const rate = pool.fee_rate?.find((entry) => entry.denom === denom)?.amount
  if (!rate) return null
  return toDecimal(rate)
}

function toDecimal(value?: string | number | Decimal | null) {
  if (value === undefined || value === null) return new Decimal(0)
  return new Decimal(value)
}

function formatDecimal(value: Decimal) {
  return value.toDecimalPlaces(18).toString()
}

function formatInteger(value: Decimal) {
  return value.toDecimalPlaces(0, Decimal.ROUND_FLOOR).toString()
}
