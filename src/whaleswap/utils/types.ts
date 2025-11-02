// Plain JSON types matching Cosmos SDK REST API responses
export type Coin = {
  denom: string
  amount: string
}

// TradeOperation oneof types
export type SwapLeg = {
  pool_id: string
  swap_in?: Coin
  swap_out?: Coin
}

export type TakeItem = {
  offer_id: string
  take_units?: string
}

export type AuctionRedeem = {
  auction_id: string
}

export type TradeOperation = {
  swap?: SwapLeg
  take?: TakeItem
  auction?: AuctionRedeem
  sent: Coin
  received: Coin
}

// NEW Trade structure (consolidated operations)
export type Trade = {
  trade_id: string
  trader: string // Renamed from 'taker'
  height: string
  timestamp: string
  operations: TradeOperation[] // NEW: Array of operations
  total_sent: Coin[] // NEW: Aggregated sent coins
  total_received: Coin[] // NEW: Aggregated received coins
  note?: string
}

export type Pool = {
  pool_id: string
  coins: Coin[]
  shares_denom: string
  fee_pct: string
  min_price?: Coin[]
  max_price?: Coin[]
  block_height: string
  created: string
  updated: string
  num_trades: string
  fees_earned: Coin[]
}

export type OfferData = {
  offer_id: string
  status: string
  maker: string
  updated_height: string
  updated_timestamp: string
  initial_have: Coin
  initial_want: Coin
  remaining_have: Coin
  remaining_want: Coin
  unit_have_int: string
  unit_want_int: string
  remaining_units: string
  pfand_locked: Coin
}

export type AuctionRecord = {
  auction_id: string
  class_id: string
  nft_id: string
  sell: Coin
  bid_denom: string
  seller: string
}

export type TradeMetrics = {
  num_trades: string
  escrowed_pool_coins: Coin[]
  escrowed_offer_coins: Coin[]
  escrowed_pfand: Coin[]
  escrowed_auction_coins: Coin[]
  escrowed_liquid_coins: Coin[]
  fees_earned: Coin[]
}
