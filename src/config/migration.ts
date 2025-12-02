/**
 * Migration configuration for DYS → DYS2 token swap
 */

import { getIbcTransferPeerById } from './ibcTransfers'

// Old chain configuration
export const OLD_CHAIN_ID = 'dyson-mainnet-01'
export const OLD_CHAIN_RPC = 'https://dys-tm.dysonprotocol.com'
export const OLD_CHAIN_REST = 'https://dys-api.dysonprotocol.com'
export const OLD_CHAIN_DENOM = 'dys'
export const OLD_CHAIN_PREFIX = 'dys'

// New chain configuration
export const NEW_CHAIN_ID = 'dysonprotocol-testnet-2'
export const NEW_CHAIN_DENOM = 'udys'
export const NEW_CHAIN_PREFIX = 'dys2'

// IBC channel configuration
export const OLD_CHAIN_CHANNEL = 'channel-3' // Channel on old chain to new chain
export const NEW_CHAIN_CHANNEL = 'channel-1' // Channel on new chain to old chain

// IBC denom for old DYS when it arrives on the new chain
// = ibc/SHA256("transfer/channel-1/dys")
export const IBC_OLD_DYS_DENOM =
  'ibc/2ED385C0A97745B42B6A82A1CDECA206C005037E5FF620D12D0CEADCC6F35141'

// Swap script address on new chain (must be funded with udys reserves)
// TODO: Deploy the migration_swap.py script and set this address
export const SWAP_SCRIPT_ADDRESS = 'dys210d07y265gmmuvt4z0w9aw880jnsr700jsjgnxq' // e.g., 'dys2...'

// Conversion rate: 1 old DYS (0 decimals) = 1 udys (which is 0.000001 DYS2)
// So 1,000,000 old DYS = 1 DYS2 = 1,000,000 udys
export const CONVERSION_RATE = 1 // 1:1 in base units

/**
 * Get the IBC peer config for the old chain
 */
export function getOldChainConfig() {
  return getIbcTransferPeerById(OLD_CHAIN_ID)
}

/**
 * Format old DYS amount for display (0 decimals)
 */
export function formatOldDys(amount: string | number): string {
  return Number(amount).toLocaleString()
}

/**
 * Format new DYS2 amount for display (6 decimals)
 * Converts from udys base units to DYS2
 */
export function formatNewDys2(udysAmount: string | number): string {
  const amount = Number(udysAmount) / 1_000_000
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

/**
 * Calculate expected DYS2 output from old DYS input
 * 1,000,000 old DYS = 1 DYS2
 */
export function calculateDys2FromOldDys(oldDysAmount: string | number): {
  udys: string
  dys2Display: string
} {
  const oldAmount = BigInt(oldDysAmount)
  const udysAmount = oldAmount.toString() // 1:1 in base units
  const dys2Display = formatNewDys2(udysAmount)
  return { udys: udysAmount, dys2Display }
}
