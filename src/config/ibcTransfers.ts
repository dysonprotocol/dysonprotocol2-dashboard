export interface IbcTransferPeer {
  id: string
  name: string
  description?: string
  rest_address: string
  rpc_addr?: string
  grpc_addr?: string
  account_prefix?: string
  localChannelId: string
  remoteChannelId: string
  chainId?: string
  chainName?: string
  ibcDenom?: string // IBC denom hash when tokens arrive on local chain
}

export const IBC_TRANSFER_PEERS: IbcTransferPeer[] = [
  {
    id: 'dyson-mainnet-01',
    name: 'Dyson Protocol (Old Chain)',
    description: 'Original Dyson mainnet for token migration',
    rest_address: 'https://dys-api.dysonprotocol.com',
    rpc_addr: 'https://dys-tm.dysonprotocol.com',
    account_prefix: 'dys',
    localChannelId: 'channel-0', // Channel on new chain (dys2-mainnet-1)
    remoteChannelId: 'channel-6', // Channel on old chain (dyson-mainnet-01)
    chainId: 'dyson-mainnet-01',
    chainName: 'Dyson Protocol',
    // IBC denom = ibc/SHA256("transfer/channel-0/dys")
    ibcDenom: 'ibc/3B2294AF63D402DF9B10DA43CEC03677D9041297A1031AB1AFC789C492280D79',
  },
  {
    id: 'dys2-mainnet-1',
    name: 'Dyson Protocol Mainnet 2',
    description: 'Official Dyson mainnet',
    rest_address: 'https://dys2.dysonprotocol.com', // New chain API
    rpc_addr: 'https://dys2.dysonprotocol.com/rpc',
    account_prefix: 'dys2',
    localChannelId: 'channel-0',
    remoteChannelId: 'channel-0',
  },
  {
    id: 'osmosis-1',
    name: 'Osmosis',
    description: 'Osmosis mainnet',
    rest_address: 'https://lcd-osmosis.keplr.app',
    rpc_addr: 'https://rpc-osmosis.keplr.app',
    account_prefix: 'osmo',
    localChannelId: '', // TODO: provide Dyson<->Osmosis local channel id
    remoteChannelId: '', // TODO: provide Dyson<->Osmosis remote channel id
    chainId: 'osmosis-1',
    chainName: 'Osmosis',
  },
]

export function getIbcTransferPeerById(id: string): IbcTransferPeer | undefined {
  return IBC_TRANSFER_PEERS.find((p) => p.id === id)
}
