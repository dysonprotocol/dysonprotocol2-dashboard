// Query Key Factory for Whaleswap Module
// Following TanStack Query best practices for hierarchical keys
// Reference: https://tkdodo.eu/blog/effective-react-query-keys

export const whaleswapKeys = {
  all: ['whaleswap'] as const,

  // Trades
  trades: () => [...whaleswapKeys.all, 'trades'] as const,
  trade: (id: string | bigint) => [...whaleswapKeys.trades(), id] as const,
  tradesByTaker: (taker: string, limit?: string) =>
    [...whaleswapKeys.trades(), 'by-taker', taker, limit] as const,
  tradesByOffer: (offerId: string | bigint, limit?: string) =>
    [...whaleswapKeys.trades(), 'by-offer', offerId, limit] as const,
  tradesByPool: (poolId: string | bigint, limit?: string) =>
    [...whaleswapKeys.trades(), 'by-pool', poolId, limit] as const,

  // Pools
  pools: () => [...whaleswapKeys.all, 'pools'] as const,
  pool: (id: string | bigint) => [...whaleswapKeys.pools(), id] as const,
  poolsByPair: (baseDenom: string, quoteDenom: string) =>
    [...whaleswapKeys.pools(), 'by-pair', baseDenom, quoteDenom] as const,
  poolsByDenom: (denom: string) => [...whaleswapKeys.pools(), 'by-denom', denom] as const,
  poolsByOwner: (owner: string) => [...whaleswapKeys.pools(), 'by-owner', owner] as const,

  // Offers
  offers: () => [...whaleswapKeys.all, 'offers'] as const,
  offer: (id: string | bigint) => [...whaleswapKeys.offers(), id] as const,
  offersByOwner: (owner: string, status?: string) =>
    [...whaleswapKeys.offers(), 'by-owner', owner, status] as const,
  offersByDenom: (denom: string, role?: string) =>
    [...whaleswapKeys.offers(), 'by-denom', denom, role] as const,
  offersBest: (haveDenom: string, wantDenom: string, limit?: string) =>
    [...whaleswapKeys.offers(), 'best', haveDenom, wantDenom, limit] as const,

  // Auctions
  auctions: () => [...whaleswapKeys.all, 'auctions'] as const,
  auction: (id: string | bigint) => [...whaleswapKeys.auctions(), id] as const,
  auctionsBySeller: (seller: string) => [...whaleswapKeys.auctions(), 'by-seller', seller] as const,
  auctionsByPair: (sellDenom: string, bidDenom: string) =>
    [...whaleswapKeys.auctions(), 'by-pair', sellDenom, bidDenom] as const,
  auctionByNFT: (classId: string, nftId: string) =>
    [...whaleswapKeys.auctions(), 'by-nft', classId, nftId] as const,

  // Params & Metrics
  params: () => [...whaleswapKeys.all, 'params'] as const,
  metrics: () => [...whaleswapKeys.all, 'metrics'] as const,

  // Positions
  positions: () => [...whaleswapKeys.all, 'positions'] as const,
  positionsByPool: (poolId: string | bigint, status?: string, limit?: string, offset?: string) =>
    [...whaleswapKeys.positions(), 'by-pool', poolId, status, limit, offset] as const,
  positionsByAddress: (
    address: string,
    poolId?: string | bigint,
    status?: string,
    borrowedDenom?: string,
    collateralDenom?: string,
    limit?: string,
    offset?: string
  ) =>
    [
      ...whaleswapKeys.positions(),
      'by-address',
      address,
      poolId,
      status,
      borrowedDenom,
      collateralDenom,
      limit,
      offset,
    ] as const,
}

// Usage examples:
//
// 1. Fetch all trades by taker:
//    useQuery({ queryKey: whaleswapKeys.tradesByTaker(address) })
//
// 2. Invalidate all trade queries:
//    queryClient.invalidateQueries({ queryKey: whaleswapKeys.trades() })
//
// 3. Invalidate specific taker's trades:
//    queryClient.invalidateQueries({ queryKey: whaleswapKeys.tradesByTaker(address) })
