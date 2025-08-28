import type { RouteRecordRaw } from 'vue-router'

const DestinationLayout = { template: '<router-view />' }

const NameList = () => import('@/views/chain/NameList.vue')
const NameDetails = () => import('@/views/chain/NameDetails.vue')

// NFTs under a name
const NftClassList = () => import('@/components/nft/NftClassList.vue')
const NftClassDetails = () => import('@/components/nft/NftClassDetails.vue')
const NftDetail = () => import('@/components/nft/NftDetail.vue')

// Destination (re-using address views)
const AddressScript = () => import('@/views/address/AddressScript.vue')
const AddressFunction = () => import('@/views/address/AddressFunction.vue')
const AddressNames = () => import('@/views/address/AddressNames.vue')
const AddressCoins = () => import('@/views/address/AddressCoins.vue')
const AddressStorage = () => import('@/views/address/AddressStorage.vue')
const AddressStoragePath = () => import('@/views/address/AddressStoragePath.vue')
const AddressTasks = () => import('@/views/address/AddressTasks.vue')
const AddressStaking = () => import('@/views/address/AddressStaking.vue')
const AddressNFTs = () => import('@/views/address/AddressNFTs.vue')

// Denoms under a name
const NameDenoms = () => import('@/views/chain/NameDenoms.vue')
const NameDenomDetail = () => import('@/views/chain/NameDenomDetail.vue')
const NameDenomOwners = () => import('@/views/chain/NameDenomOwners.vue')

export const namesRoutes: RouteRecordRaw[] = [
  { path: '/names', name: 'NameList', component: NameList },
  {
    path: '/names/:name',
    component: DestinationLayout,
    props: true,
    children: [
      { path: '', name: 'NameDetailsViaNames', component: NameDetails, props: true },

      { path: 'nfts', name: 'NameNFTClasses', component: NftClassList, props: true },
      { path: 'nfts/:class', name: 'NameNFTClass', component: NftClassDetails, props: true },
      { path: 'nfts/:class/:id', name: 'NameNFTDetail', component: NftDetail, props: true },

      { path: 'destination/script', name: 'NameScript', component: AddressScript, props: true },
      {
        path: 'destination/script/:functionName',
        name: 'NameFunction',
        component: AddressFunction,
        props: true,
      },
      { path: 'destination/names', name: 'NameNames', component: AddressNames, props: true },
      { path: 'destination/coins', name: 'NameCoins', component: AddressCoins, props: true },
      { path: 'destination/storage', name: 'NameStorage', component: AddressStorage, props: true },
      {
        path: 'destination/storage/:pathMatch(.*)',
        name: 'NameStoragePath',
        component: AddressStoragePath,
        props: true,
      },
      { path: 'destination/tasks', name: 'NameTasks', component: AddressTasks, props: true },
      { path: 'destination/staking', name: 'NameStaking', component: AddressStaking, props: true },
      { path: 'destination/nfts', name: 'NameNFTs', component: AddressNFTs, props: true },

      { path: 'denoms', name: 'NameDenoms', component: NameDenoms, props: true },
      { path: 'denoms/:denom', name: 'NameDenomDetail', component: NameDenomDetail, props: true },
      {
        path: 'denoms/:denom/owners',
        name: 'NameDenomOwners',
        component: NameDenomOwners,
        props: true,
      },
    ],
  },
]

export default namesRoutes
