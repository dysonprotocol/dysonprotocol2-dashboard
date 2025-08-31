import type { RouteRecordRaw } from 'vue-router'

const NameList = () => import('@/views/chain/NameList.vue')
const NameDetails = () => import('@/views/chain/NameDetails.vue')
const NameDenomDetail = () => import('@/views/chain/NameDenomDetail.vue')
const NameDenoms = () => import('@/views/chain/NameDenoms.vue')
const NftDetails = () => import('@/views/chain/NftDetails.vue')
const NftClassDetails = () => import('@/views/chain/NftClassDetails.vue')

export const namesRoutes: RouteRecordRaw[] = [
  { path: '/names', name: 'NameList', component: NameList },
  { path: '/names/:name', name: 'NameDetails', component: NameDetails, props: true },
  {
    path: '/name/:name/nft/:classid',
    name: 'NameNftClassDetail',
    component: NftClassDetails,
    props: true,
  },
  {
    path: '/name/:name/nft/:classid/:id',
    name: 'NameNftDetail',
    component: NftDetails,
    props: true,
  },
  {
    path: '/names/:name/denom/:denom',
    name: 'NameDenomDetail',
    component: NameDenomDetail,
    props: true,
  },
  { path: '/names/:name/denoms', name: 'NameDenoms', component: NameDenoms, props: true },
]

export default namesRoutes
