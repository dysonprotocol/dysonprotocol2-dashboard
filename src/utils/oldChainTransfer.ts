/**
 * IBC Transfer utility for the old chain (dyson-mainnet-01)
 * Signs and broadcasts MsgTransfer directly via Keplr
 */

import { toBase64, fromBase64 } from '@cosmjs/encoding'
import {
  OLD_CHAIN_ID,
  OLD_CHAIN_REST,
  OLD_CHAIN_CHANNEL,
  OLD_CHAIN_DENOM,
} from '@/config/migration'

// IBC transfer port (always 'transfer' for fungible tokens)
const SOURCE_PORT = 'transfer'

interface TransferParams {
  sender: string // Old chain address (dys1...)
  receiver: string // New chain address (dys2...)
  amount: string // Amount in base denom (dys)
  memo?: string
  timeoutSeconds?: number
}

interface TransferResult {
  success: boolean
  txHash?: string
  error?: string
  rawLog?: string
}

/**
 * Execute IBC transfer from old chain to new chain
 */
export async function transferFromOldChain(params: TransferParams): Promise<TransferResult> {
  const { sender, receiver, amount, memo = '', timeoutSeconds = 600 } = params

  if (!window.keplr) {
    return { success: false, error: 'Keplr not available' }
  }

  // Enable the old chain in Keplr
  await window.keplr.enable(OLD_CHAIN_ID)

  // Get the offline signer for the old chain
  const offlineSigner = window.keplr.getOfflineSigner(OLD_CHAIN_ID)
  const accounts = await offlineSigner.getAccounts()
  const account = accounts.find((a) => a.address === sender)

  if (!account) {
    return { success: false, error: `Address ${sender} not found in Keplr` }
  }

  // Fetch account info from old chain
  const accountInfo = await fetchAccountInfo(sender)
  if (!accountInfo) {
    return { success: false, error: 'Failed to fetch account info' }
  }

  // Calculate timeout timestamp (nanoseconds)
  const timeoutTimestamp = calculateTimeoutNs(timeoutSeconds)

  // Build the MsgTransfer
  const msgTransfer = {
    '@type': '/ibc.applications.transfer.v1.MsgTransfer',
    source_port: SOURCE_PORT,
    source_channel: OLD_CHAIN_CHANNEL,
    token: {
      denom: OLD_CHAIN_DENOM,
      amount: amount,
    },
    sender: sender,
    receiver: receiver,
    timeout_height: {
      revision_number: '0',
      revision_height: '0',
    },
    timeout_timestamp: timeoutTimestamp,
    memo: memo,
  }

  // Build the transaction
  const fee = {
    amount: [{ denom: OLD_CHAIN_DENOM, amount: '5000' }],
    gas: '200000',
  }

  const txBody = {
    messages: [msgTransfer],
    memo: memo,
  }

  const authInfo = {
    signer_infos: [
      {
        public_key: {
          '@type': '/cosmos.crypto.secp256k1.PubKey',
          key: toBase64(account.pubkey),
        },
        mode_info: {
          single: {
            mode: 'SIGN_MODE_DIRECT',
          },
        },
        sequence: accountInfo.sequence,
      },
    ],
    fee: {
      amount: fee.amount,
      gas_limit: fee.gas,
    },
  }

  // Use Keplr's signDirect
  const signDoc = {
    bodyBytes: await encodeBody(txBody),
    authInfoBytes: await encodeAuthInfo(authInfo),
    chainId: OLD_CHAIN_ID,
    accountNumber: accountInfo.accountNumber,
  }

  let signResponse
  try {
    signResponse = await window.keplr.signDirect(OLD_CHAIN_ID, sender, signDoc)
  } catch (e: any) {
    return { success: false, error: e?.message || 'User rejected signing' }
  }

  // Build and broadcast the signed tx
  const txRaw = {
    body_bytes: signResponse.signed.bodyBytes,
    auth_info_bytes: signResponse.signed.authInfoBytes,
    signatures: [fromBase64(signResponse.signature.signature)],
  }

  // Broadcast via REST API
  const broadcastResult = await broadcastTx(txRaw)
  return broadcastResult
}

async function fetchAccountInfo(
  address: string
): Promise<{ accountNumber: string; sequence: string } | null> {
  const res = await fetch(`${OLD_CHAIN_REST}/cosmos/auth/v1beta1/accounts/${address}`)
  if (!res.ok) return null

  const data = await res.json()
  const account = data.account

  // Handle different account types
  const accountNumber = account.account_number || account.base_account?.account_number || '0'
  const sequence = account.sequence || account.base_account?.sequence || '0'

  return { accountNumber, sequence }
}

function calculateTimeoutNs(seconds: number): string {
  const nowMs = Date.now()
  const nowNs = BigInt(nowMs) * 1000000n
  const addNs = BigInt(seconds) * 1000000000n
  return (nowNs + addNs).toString()
}

async function encodeBody(txBody: any): Promise<Uint8Array> {
  const { TxBody } = await import('cosmjs-types/cosmos/tx/v1beta1/tx')
  const { MsgTransfer } = await import('cosmjs-types/ibc/applications/transfer/v1/tx')

  const msg = txBody.messages[0]
  const msgTransfer = MsgTransfer.fromPartial({
    sourcePort: msg.source_port,
    sourceChannel: msg.source_channel,
    token: msg.token,
    sender: msg.sender,
    receiver: msg.receiver,
    timeoutHeight: {
      revisionNumber: BigInt(msg.timeout_height.revision_number),
      revisionHeight: BigInt(msg.timeout_height.revision_height),
    },
    timeoutTimestamp: BigInt(msg.timeout_timestamp),
    memo: msg.memo || '',
  })

  const body = TxBody.fromPartial({
    messages: [
      {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: MsgTransfer.encode(msgTransfer).finish(),
      },
    ],
    memo: txBody.memo || '',
  })

  return TxBody.encode(body).finish()
}

async function encodeAuthInfo(authInfo: any): Promise<Uint8Array> {
  const { AuthInfo, SignerInfo, Fee } = await import('cosmjs-types/cosmos/tx/v1beta1/tx')
  const { PubKey } = await import('cosmjs-types/cosmos/crypto/secp256k1/keys')
  const { SignMode } = await import('cosmjs-types/cosmos/tx/signing/v1beta1/signing')
  const { Coin } = await import('cosmjs-types/cosmos/base/v1beta1/coin')

  const pubkeyBytes = fromBase64(authInfo.signer_infos[0].public_key.key)
  const pubkey = PubKey.fromPartial({ key: pubkeyBytes })

  const signerInfo = SignerInfo.fromPartial({
    publicKey: {
      typeUrl: '/cosmos.crypto.secp256k1.PubKey',
      value: PubKey.encode(pubkey).finish(),
    },
    modeInfo: {
      single: {
        mode: SignMode.SIGN_MODE_DIRECT,
      },
    },
    sequence: BigInt(authInfo.signer_infos[0].sequence),
  })

  const fee = Fee.fromPartial({
    amount: authInfo.fee.amount.map((c: any) =>
      Coin.fromPartial({ denom: c.denom, amount: c.amount })
    ),
    gasLimit: BigInt(authInfo.fee.gas_limit),
  })

  const authInfoProto = AuthInfo.fromPartial({
    signerInfos: [signerInfo],
    fee: fee,
  })

  return AuthInfo.encode(authInfoProto).finish()
}

async function broadcastTx(txRaw: any): Promise<TransferResult> {
  const { TxRaw } = await import('cosmjs-types/cosmos/tx/v1beta1/tx')

  const txRawProto = TxRaw.fromPartial({
    bodyBytes: txRaw.body_bytes,
    authInfoBytes: txRaw.auth_info_bytes,
    signatures: txRaw.signatures,
  })

  const txBytes = TxRaw.encode(txRawProto).finish()
  const txBytesBase64 = toBase64(txBytes)

  const res = await fetch(`${OLD_CHAIN_REST}/cosmos/tx/v1beta1/txs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_bytes: txBytesBase64,
      mode: 'BROADCAST_MODE_SYNC',
    }),
  })

  const data = await res.json()

  // SYNC mode only checks CheckTx passed (tx in mempool), not block inclusion
  if (data.tx_response?.code !== 0) {
    return {
      success: false,
      error: data.tx_response?.raw_log || 'Broadcast failed',
      rawLog: data.tx_response?.raw_log,
    }
  }

  const txHash = data.tx_response.txhash

  // Wait for tx to be included in a block
  const confirmed = await waitForTxConfirmation(txHash)
  if (!confirmed) {
    return {
      success: false,
      error: 'Transaction was broadcast but not confirmed in time. It may still succeed.',
      txHash,
    }
  }

  return {
    success: true,
    txHash,
  }
}

async function waitForTxConfirmation(txHash: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${OLD_CHAIN_REST}/cosmos/tx/v1beta1/txs/${txHash}`)
    if (res.ok) {
      const data = await res.json()
      // Transaction included in block with success code
      if (data.tx_response?.height && data.tx_response?.code === 0) {
        console.log(`[Migration] Tx confirmed at height ${data.tx_response.height}`)
        return true
      }
      // Transaction included but failed
      if (data.tx_response?.height && data.tx_response?.code !== 0) {
        console.error(`[Migration] Tx failed:`, data.tx_response.raw_log)
        return false
      }
    }
    // Wait 1 second between attempts (old chain ~5s block time)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}
