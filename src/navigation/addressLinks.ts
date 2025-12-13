export interface AddressLink {
  text: string
  to: any
}

export function getAddressLinks(address: string): AddressLink[] {
  return [
    { text: 'Summary', to: { name: 'AddressSummary', params: { address } } },
    { text: 'Coins', to: { name: 'AddressCoins', params: { address } } },
    { text: 'NFTs', to: { name: 'AddressNFTs', params: { address } } },
    { text: 'Staking', to: { name: 'AddressStaking', params: { address } } },
    { text: 'Names', to: { name: 'AddressNames', params: { address } } },
    { text: 'Script', to: { name: 'AddressScript', params: { address } } },
    { text: 'Storage', to: { name: 'AddressStorage', params: { address } } },
    { text: 'Tasks', to: { name: 'AddressTasks', params: { address } } },
    { text: 'Authz', to: { name: 'AddressAuthz', params: { address } } },
    // whaleswap
    { text: 'Offers', to: { name: 'AddressWhaleswapOffers', params: { address } } },
    { text: 'Trades', to: { name: 'AddressWhaleswapTrades', params: { address } } },
    { text: 'Pools', to: { name: 'AddressWhaleswapPools', params: { address } } },
    { text: 'Auctions', to: { name: 'AddressWhaleswapAuctions', params: { address } } },
  ]
}
