import type { Component } from 'vue'
import { Tag, Clock } from 'lucide-vue-next'

export interface AddressLink {
  text: string
  to: any
  icon?: Component
  iconClass?: string
}

export function getAddressLinks(address: string): AddressLink[] {
  return [
    {
      text: 'Summary',
      iconClass: 'lucide--scroll-text',
      to: { name: 'AddressSummary', params: { address } },
    },
    {
      text: 'Coins',
      iconClass: 'lucide--coins',
      to: { name: 'AddressCoins', params: { address } },
    },
    {
      text: 'NFTs',
      iconClass: 'lucide--file-badge-2',
      to: { name: 'AddressNFTs', params: { address } },
    },
    {
      text: 'Staking',
      iconClass: 'lucide--landmark',
      to: { name: 'AddressStaking', params: { address } },
    },
    {
      text: 'Names',
      icon: Tag,
      to: { name: 'AddressNames', params: { address } },
    },
    {
      text: 'Script',
      iconClass: 'lucide--file-json',
      to: { name: 'AddressScript', params: { address } },
    },
    {
      text: 'Storage',
      iconClass: 'lucide--table',
      to: { name: 'AddressStorage', params: { address } },
    },
    {
      text: 'Tasks',
      icon: Clock,
      to: { name: 'AddressTasks', params: { address } },
    },
    {
      text: 'Authz',
      iconClass: 'lucide--key-round',
      to: { name: 'AddressAuthz', params: { address } },
    },
    // whaleswap
    {
      text: 'Offers',
      iconClass: 'lucide--list-plus',
      to: { name: 'AddressWhaleswapOffers', params: { address } },
    },
    {
      text: 'Trades',
      iconClass: 'lucide--arrow-left-right',
      to: { name: 'AddressWhaleswapTrades', params: { address } },
    },
    {
      text: 'Pools',
      iconClass: 'lucide--waves',
      to: { name: 'AddressWhaleswapPools', params: { address } },
    },
    {
      text: 'Auctions',
      iconClass: 'lucide--gavel',
      to: { name: 'AddressWhaleswapAuctions', params: { address } },
    },
  ]
}
