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

export type DecCoin = {
  denom: string
  amount: string // Decimal string
}

export type Pool = {
  pool_id: string
  coins: Coin[]
  shares_denom: string
  fee_pct?: string // Deprecated: use fee_rate instead
  fee_rate?: DecCoin[] // Per-denom fee rates (exactly 2 entries matching coins order)
  min_price?: Coin[]
  max_price?: Coin[]
  block_height: string
  created: string
  updated: string
  num_trades: string
  fees_earned: Coin[]
  // Leverage fields
  interest_rate?: DecCoin[] // Annual interest rates per reserve denom
  interest_earned?: Coin[] // Total accrued interest
  total_borrowed?: Coin[] // Total borrowed per denom
  min_initial_collateral_ratio?: DecCoin[] // Minimum initial collateral ratio per denom
  liquidation_threshold?: DecCoin[] // Liquidation threshold per denom
  max_borrow_percent?: DecCoin[] // Maximum borrow capacity per denom
}

export type PositionStatus =
  | 'POSITION_STATUS_UNSPECIFIED'
  | 'POSITION_STATUS_OPEN'
  | 'POSITION_STATUS_CLOSED'
  | 'POSITION_STATUS_LIQUIDATING'
  | 'POSITION_STATUS_LIQUIDATED'

export type LeveragePosition = {
  position_id: string
  pool_id: string
  user: string
  status: PositionStatus
  borrowed: Coin
  held: Coin
  collateral: Coin
  created_height?: string
  created_time?: string
  updated_height?: string
  updated_time?: string
  liquidation_initialized_block_height?: string
  liquidation_status?: string
  accrued_interest: Coin
  interest_rate?: DecCoin[]
  min_collateral_ratio?: string
  liquidation_threshold?: string
  initial_borrowed?: Coin
  total_interest_paid?: Coin
  last_interest_settlement_time?: string
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
