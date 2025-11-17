import type { RouteRecordRaw } from 'vue-router'

const AddressLayout = () => import('@/views/address/AddressLayout.vue')
const AddressScript = () => import('@/views/address/AddressScript.vue')
const AddressFunction = () => import('@/views/address/AddressFunction.vue')
const AddressNames = () => import('@/views/address/AddressNames.vue')
const AddressCoins = () => import('@/views/address/AddressCoins.vue')
const AddressStorage = () => import('@/views/address/AddressStorage.vue')
const AddressStoragePath = () => import('@/views/address/AddressStoragePath.vue')
const AddressTasks = () => import('@/views/address/AddressTasks.vue')
const AddressStaking = () => import('@/views/address/AddressStaking.vue')
const AddressNFTs = () => import('@/views/address/AddressNFTs.vue')
const AddressAuthz = () => import('@/views/address/AddressAuthz.vue')
const AddressSummary = () => import('@/views/address/AddressSummary.vue')
const AddressWhaleswapOffers = () => import('@/views/address/AddressWhaleswapOffers.vue')
const AddressWhaleswapTrades = () => import('@/whaleswap/views/TradesTable.vue')
const AddressWhaleswapPools = () => import('@/views/address/AddressWhaleswapPools.vue')
const AddressWhaleswapAuctions = () => import('@/views/address/AddressWhaleswapAuctions.vue')

export const addressRoutes: RouteRecordRaw[] = [
  {
    path: '/address/:address',
    component: AddressLayout,
    props: true,
    children: [
      {
        path: '',
        name: 'AddressSummary',
        component: AddressSummary,
        props: true,
        meta: { title: 'Address Summary' },
      },
      {
        path: 'script',
        name: 'AddressScript',
        component: AddressScript,
        props: true,
        meta: { title: 'Address Script' },
      },
      {
        path: 'script/:functionName',
        name: 'AddressFunction',
        component: AddressFunction,
        props: true,
        meta: { title: 'Address Function' },
      },
      {
        path: 'names',
        name: 'AddressNames',
        component: AddressNames,
        props: true,
        meta: { title: 'Address Names' },
      },
      {
        path: 'coins',
        name: 'AddressCoins',
        component: AddressCoins,
        props: true,
        meta: { title: 'Address Coins' },
      },
      {
        path: 'storage',
        name: 'AddressStorage',
        component: AddressStorage,
        props: true,
        meta: { title: 'Address Storage' },
      },
      {
        path: 'storage/:pathMatch(.*)',
        name: 'AddressStoragePath',
        component: AddressStoragePath,
        props: true,
        meta: { title: 'Address Storage Path' },
      },
      {
        path: 'tasks',
        name: 'AddressTasks',
        component: AddressTasks,
        props: true,
        meta: { title: 'Address Tasks' },
      },
      {
        path: 'staking',
        name: 'AddressStaking',
        component: AddressStaking,
        props: true,
        meta: { title: 'Address Staking' },
      },
      {
        path: 'nfts',
        name: 'AddressNFTs',
        component: AddressNFTs,
        props: true,
        meta: { title: 'Address NFTs' },
      },
      {
        path: 'authz',
        name: 'AddressAuthz',
        component: AddressAuthz,
        props: true,
        meta: { title: 'Address Authz' },
      },
      {
        path: 'whaleswap/offers',
        name: 'AddressWhaleswapOffers',
        component: AddressWhaleswapOffers,
        props: true,
        meta: { title: 'Address Offers' },
      },
      {
        path: 'whaleswap/trades',
        name: 'AddressWhaleswapTrades',
        component: AddressWhaleswapTrades,
        props: (route) => ({ filterTaker: route.params.address }),
        meta: { title: 'Address Trades' },
      },
      {
        path: 'whaleswap/pools',
        name: 'AddressWhaleswapPools',
        component: AddressWhaleswapPools,
        props: true,
        meta: { title: 'Address Pools' },
      },
      {
        path: 'whaleswap/auctions',
        name: 'AddressWhaleswapAuctions',
        component: AddressWhaleswapAuctions,
        props: true,
        meta: { title: 'Address Auctions' },
      },
    ],
  },
]

export default addressRoutes
