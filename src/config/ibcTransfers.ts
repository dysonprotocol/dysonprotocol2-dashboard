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
}

export const IBC_TRANSFER_PEERS: IbcTransferPeer[] = [
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
