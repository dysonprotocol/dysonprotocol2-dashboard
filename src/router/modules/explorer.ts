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
]

export default explorerRoutes
