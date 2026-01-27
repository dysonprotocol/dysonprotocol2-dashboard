import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'

export interface Breadcrumb {
  label: string
  path: string
  isLast: boolean
}

// Truncate address for display
function truncateAddress(address: string): string {
  if (!address || address.length <= 16) return address
  return `${address.slice(0, 10)}...${address.slice(-4)}`
}

// Route name to human-readable label mapping
const routeLabels: Record<string, string> = {
  Index: 'Home',
  BlocksList: 'Blocks',
  BlockDetail: 'Block',
  TxsList: 'Transactions',
  TransactionDetails: 'Transaction',
  ValidatorsList: 'Validators',
  ValidatorDetails: 'Validator',
  GovernanceProposals: 'Governance',
  GovernanceProposal: 'Proposal',
  WhaleswapIndex: 'Whaleswap',
  WhaleswapTradePair: 'Trade',
  WhaleswapTrades: 'Trades',
  WhaleswapTrade: 'Trade',
  WhaleswapOffer: 'Offer',
  WhaleswapCreatePool: 'Create Pool',
  WhaleswapPool: 'Pool',
  WhaleswapAuction: 'Auction',
  NameList: 'Names',
  NameDetails: 'Name',
  NameNftClassDetail: 'NFT Class',
  NameNftDetail: 'NFT',
  NameDenomDetail: 'Denom',
  NameDenoms: 'Denoms',
  TaskManager: 'Tasks',
  TaskDetail: 'Task',
  IbcIndex: 'IBC',
  IbcTransferList: 'Transfers',
  IbcTransferDetail: 'Transfer',
  // Address routes
  AddressSummary: 'Address',
  AddressCoins: 'Coins',
  AddressStaking: 'Staking',
  AddressScript: 'Script',
  AddressFunction: 'Function',
  AddressNames: 'Names',
  AddressStorage: 'Storage',
  AddressStoragePath: 'Path',
  AddressTasks: 'Tasks',
  AddressNFTs: 'NFTs',
  AddressAuthz: 'Authz',
  AddressWhaleswapOffers: 'Offers',
  AddressWhaleswapTrades: 'Trades',
  AddressWhaleswapPools: 'Pools',
  AddressWhaleswapAuctions: 'Auctions',
  DocsPage: 'Docs',
  ApiIndex: 'API',
  DesignLab: 'Design Lab',
}

// Helper to get address param from route params
const getAddressParams = (r: RouteLocationNormalizedLoaded) => ({ address: String(r.params.address || '') })

// Parent routes for nested navigation
// params functions receive the full route object to access params from any level of nesting
const parentRoutes: Record<string, { name: string; params?: (route: RouteLocationNormalizedLoaded) => Record<string, string> }> = {
  BlockDetail: { name: 'BlocksList' },
  TransactionDetails: { name: 'TxsList' },
  ValidatorDetails: { name: 'ValidatorsList' },
  GovernanceProposal: { name: 'GovernanceProposals' },
  WhaleswapTrade: { name: 'WhaleswapTrades' },
  WhaleswapOffer: { name: 'WhaleswapIndex' },
  WhaleswapPool: { name: 'WhaleswapIndex' },
  WhaleswapAuction: { name: 'WhaleswapIndex' },
  WhaleswapCreatePool: { name: 'WhaleswapIndex' },
  WhaleswapTradePair: { name: 'WhaleswapIndex' },
  WhaleswapTrades: { name: 'WhaleswapIndex' },
  NameDetails: { name: 'NameList' },
  NameNftClassDetail: { name: 'NameDetails', params: (r) => ({ name: String(r.params.name || '') }) },
  NameNftDetail: { name: 'NameNftClassDetail', params: (r) => ({ name: String(r.params.name || ''), classid: String(r.params.classid || '') }) },
  NameDenomDetail: { name: 'NameDetails', params: (r) => ({ name: String(r.params.name || '') }) },
  NameDenoms: { name: 'NameDetails', params: (r) => ({ name: String(r.params.name || '') }) },
  TaskDetail: { name: 'TaskManager' },
  IbcTransferDetail: { name: 'IbcTransferList' },
  IbcTransferList: { name: 'IbcIndex' },
  // Address routes - parent is the address summary (shows truncated address)
  AddressCoins: { name: 'AddressSummary', params: getAddressParams },
  AddressStaking: { name: 'AddressSummary', params: getAddressParams },
  AddressScript: { name: 'AddressSummary', params: getAddressParams },
  AddressFunction: { name: 'AddressScript', params: getAddressParams },
  AddressNames: { name: 'AddressSummary', params: getAddressParams },
  AddressStorage: { name: 'AddressSummary', params: getAddressParams },
  AddressStoragePath: { name: 'AddressStorage', params: getAddressParams },
  AddressTasks: { name: 'AddressSummary', params: getAddressParams },
  AddressNFTs: { name: 'AddressSummary', params: getAddressParams },
  AddressAuthz: { name: 'AddressSummary', params: getAddressParams },
  AddressWhaleswapOffers: { name: 'AddressSummary', params: getAddressParams },
  AddressWhaleswapTrades: { name: 'AddressSummary', params: getAddressParams },
  AddressWhaleswapPools: { name: 'AddressSummary', params: getAddressParams },
  AddressWhaleswapAuctions: { name: 'AddressSummary', params: getAddressParams },
}

export function useBreadcrumbs() {
  const route = useRoute()
  const router = useRouter()

  const breadcrumbs = computed<Breadcrumb[]>(() => {
    const crumbs: Breadcrumb[] = []
    const currentRouteName = route.name as string | undefined

    if (!currentRouteName || currentRouteName === 'Index') {
      return []
    }

    // Always start with Home
    crumbs.push({
      label: 'Home',
      path: '/',
      isLast: false,
    })

    // Build the breadcrumb chain by walking up the parent hierarchy
    const chain: { name: string; params: Record<string, string> }[] = []
    let current: string | undefined = currentRouteName

    while (current && parentRoutes[current]) {
      const parent = parentRoutes[current]
      // Pass full route object so params functions can access params from any nesting level
      const params = parent.params ? parent.params(route) : {}
      chain.unshift({ name: parent.name, params })
      current = parent.name
    }

    // Add parent crumbs
    for (const item of chain) {
      const resolved = router.resolve({ name: item.name, params: item.params })
      // Use truncated address for AddressSummary parent
      let label = routeLabels[item.name] || item.name
      if (item.name === 'AddressSummary' && item.params.address) {
        label = truncateAddress(item.params.address)
      }
      crumbs.push({
        label,
        path: resolved.path,
        isLast: false,
      })
    }

    // Add current route as last crumb
    let currentLabel = routeLabels[currentRouteName] || currentRouteName

    // Add dynamic segment to label if available
    const params = route.params
    if (params.height) currentLabel = `Block #${params.height}`
    else if (params.hash) currentLabel = `Tx ${String(params.hash).slice(0, 8)}...`
    else if (params.proposalId) currentLabel = `Proposal #${params.proposalId}`
    else if (params.valAddress) currentLabel = `${String(params.valAddress).slice(0, 12)}...`
    else if (params.poolId) currentLabel = `Pool #${params.poolId}`
    else if (params.offerId) currentLabel = `Offer #${params.offerId}`
    else if (params.tradeId) currentLabel = `Trade #${params.tradeId}`
    else if (params.auctionId) currentLabel = `Auction #${params.auctionId}`
    else if (params.name && currentRouteName === 'NameDetails') currentLabel = String(params.name)
    else if (params.classid && currentRouteName === 'NameNftClassDetail') currentLabel = String(params.classid)
    else if (params.id && currentRouteName === 'NameNftDetail') currentLabel = `NFT #${params.id}`
    else if (params.denom && currentRouteName === 'NameDenomDetail') currentLabel = String(params.denom)
    else if (params.taskId) currentLabel = `Task #${params.taskId}`
    else if (params.transferId) currentLabel = `Transfer #${params.transferId}`
    // Address routes - show truncated address for summary, function name, or storage path
    else if (params.address && currentRouteName === 'AddressSummary') {
      currentLabel = truncateAddress(String(params.address))
    }
    else if (params.functionName && currentRouteName === 'AddressFunction') {
      currentLabel = String(params.functionName)
    }
    else if (params.pathMatch && currentRouteName === 'AddressStoragePath') {
      const pathStr = Array.isArray(params.pathMatch) ? params.pathMatch.join('/') : String(params.pathMatch)
      currentLabel = pathStr.length > 20 ? `${pathStr.slice(0, 20)}...` : pathStr
    }

    crumbs.push({
      label: currentLabel,
      path: route.path,
      isLast: true,
    })

    return crumbs
  })

  return { breadcrumbs }
}
