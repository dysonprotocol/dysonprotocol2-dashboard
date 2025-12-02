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
    localChannelId: 'channel-1', // Channel on new chain (dysonprotocol-testnet-2)
    remoteChannelId: 'channel-3', // Channel on old chain (dyson-mainnet-01)
    chainId: 'dyson-mainnet-01',
    chainName: 'Dyson Protocol',
    // IBC denom = ibc/SHA256("transfer/channel-1/dys")
    ibcDenom: 'ibc/2ED385C0A97745B42B6A82A1CDECA206C005037E5FF620D12D0CEADCC6F35141',
  },
  {
    id: 'dysonprotocol-testnet-2',
    name: 'Dyson Protocol Testnet 2',
    description: 'Official Dyson testnet',
    rest_address: 'https://dys-testnet2.dysonprotocol.com',
    rpc_addr: 'https://dys-testnet2.dysonprotocol.com/rpc',
    grpc_addr: 'http://139.162.147.122:9090',
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
