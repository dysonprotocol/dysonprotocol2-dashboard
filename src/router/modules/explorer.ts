import type { RouteRecordRaw } from 'vue-router'

export const explorerRoutes: RouteRecordRaw[] = [
  {
    path: '/blocks',
    name: 'BlocksList',
    component: () => import('@/views/explorer/BlocksList.vue'),
  },
  {
    path: '/block/:height',
    name: 'BlockDetail',
    component: () => import('@/views/explorer/BlockDetail.vue'),
    props: true,
  },

  { path: '/txs', name: 'TxsList', component: () => import('@/views/explorer/TxsList.vue') },
  {
    path: '/txs/:hash',
    name: 'TransactionDetails',
    component: () => import('@/views/explorer/TxDetail.vue'),
    props: true,
  },

  {
    path: '/validators',
    name: 'ValidatorsList',
    component: () => import('@/views/chain/ValidatorsList.vue'),
  },
  {
    path: '/validators/:valAddress',
    name: 'ValidatorDetails',
    component: () => import('@/views/chain/ValidatorDetails.vue'),
    props: true,
  },

  {
    path: '/gov',
    name: 'GovernanceProposals',
    component: () => import('@/views/chain/GovernanceProposals.vue'),
  },
  {
    path: '/gov/:proposalId(\\d+)',
    name: 'GovernanceProposal',
    component: () => import('@/views/chain/GovernanceProposal.vue'),
    props: true,
  },
  // whaleswap
  {
    path: '/whaleswap',
    name: 'WhaleswapHub',
    component: () => import('@/views/whaleswap/WhaleswapHub.vue'),
  },
  {
    path: '/whaleswap/offers/:offerId(\\d+)',
    name: 'WhaleswapOffer',
    component: () => import('@/views/whaleswap/OfferDetail.vue'),
    props: true,
  },
  {
    path: '/whaleswap/pools/:poolId(\\d+)',
    name: 'WhaleswapPool',
    component: () => import('@/views/whaleswap/PoolDetail.vue'),
    props: true,
  },
  {
    path: '/whaleswap/auctions/:auctionId(\\d+)',
    name: 'WhaleswapAuction',
    component: () => import('@/views/whaleswap/AuctionDetail.vue'),
    props: true,
  },
  {
    path: '/whaleswap/trades/:tradeId(\\d+)',
    name: 'WhaleswapTrade',
    component: () => import('@/views/whaleswap/TradeDetail.vue'),
    props: true,
  },
]

export default explorerRoutes
