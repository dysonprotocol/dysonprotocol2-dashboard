import type { Coin } from './types'

export function formatCoin(coin: Coin | undefined): string {
  if (!coin) return ''
  const amount = coin.amount || '0'
  const denom = coin.denom || ''
  return `${amount} ${denom}`
}

export function formatCoins(coins: Coin[] | undefined): string {
  if (!coins || coins.length === 0) return ''
  return coins.map(formatCoin).join(', ')
}

export function formatCoinsPrimary(coins: Coin[] | undefined): string {
  // Display primary coin (first non-zero)
  if (!coins || coins.length === 0) return ''
  const primary = coins.find((c) => c.amount && c.amount !== '0') || coins[0]
  return formatCoin(primary)
}

export function formatTimestamp(ts: string | undefined): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

export function truncateAddress(address: string, prefixLen = 10, suffixLen = 6): string {
  if (!address || address.length <= prefixLen + suffixLen) return address
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
}

export function formatTradeId(tradeId: string | undefined): string {
  return tradeId || '0'
}

export function formatPoolId(poolId: string | undefined): string {
  return poolId || '0'
}

export function formatOfferId(offerId: string | undefined): string {
  return offerId || '0'
}

export function formatAuctionId(auctionId: string | undefined): string {
  return auctionId || '0'
}
