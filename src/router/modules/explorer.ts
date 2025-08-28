import type { RouteRecordRaw } from 'vue-router'

const Placeholder = () => import('../../views/Placeholder.vue')

export const explorerRoutes: RouteRecordRaw[] = [
  { path: '/blocks', name: 'BlocksList', component: Placeholder, meta: { title: 'Blocks List' } },
  {
    path: '/block/:height(\\d+)',
    name: 'BlockDetail',
    component: Placeholder,
    props: true,
    meta: { title: 'Block Detail' },
  },

  { path: '/txs', name: 'TxsList', component: Placeholder, meta: { title: 'Transactions List' } },
  {
    path: '/txs/:hash',
    name: 'TransactionDetails',
    component: Placeholder,
    props: true,
    meta: { title: 'Transaction Details' },
  },

  {
    path: '/validators',
    name: 'ValidatorsList',
    component: Placeholder,
    meta: { title: 'Validators List' },
  },
  {
    path: '/validators/:valAddress',
    name: 'ValidatorDetails',
    component: Placeholder,
    props: true,
    meta: { title: 'Validator Details' },
  },

  {
    path: '/gov/:proposalId(\\d+)',
    name: 'GovernanceProposal',
    component: Placeholder,
    props: true,
    meta: { title: 'Governance Proposal' },
  },
]

export default explorerRoutes
