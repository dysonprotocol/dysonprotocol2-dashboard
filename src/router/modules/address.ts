import type { RouteRecordRaw } from 'vue-router'

const AddressLayout = { template: '<router-view />' }
const Placeholder = () => import('../../views/Placeholder.vue')

export const addressRoutes: RouteRecordRaw[] = [
  {
    path: '/address/:address',
    component: AddressLayout,
    props: true,
    children: [
      {
        path: '',
        name: 'AddressSummary',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Summary' },
      },
      {
        path: 'script',
        name: 'AddressScript',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Script' },
      },
      {
        path: 'script/:functionName',
        name: 'AddressFunction',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Function' },
      },
      {
        path: 'names',
        name: 'AddressNames',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Names' },
      },
      {
        path: 'coins',
        name: 'AddressCoins',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Coins' },
      },
      {
        path: 'storage',
        name: 'AddressStorage',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Storage' },
      },
      {
        path: 'storage/:pathMatch(.*)',
        name: 'AddressStoragePath',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Storage Path' },
      },
      {
        path: 'tasks',
        name: 'AddressTasks',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Tasks' },
      },
      {
        path: 'staking',
        name: 'AddressStaking',
        component: Placeholder,
        props: true,
        meta: { title: 'Address Staking' },
      },
      {
        path: 'nfts',
        name: 'AddressNFTs',
        component: Placeholder,
        props: true,
        meta: { title: 'Address NFTs' },
      },
    ],
  },
]

export default addressRoutes
