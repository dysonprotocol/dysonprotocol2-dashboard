/**
 * Migration swap utility - swaps IBC old DYS for native udys
 */

import { useWallet } from '@/composables/useWallet'
import { IBC_OLD_DYS_DENOM, SWAP_SCRIPT_ADDRESS } from '@/config/migration'

interface SwapResult {
  success: boolean
  txHash?: string
  amountSwapped?: string
  error?: string
}

/**
 * Execute the migration swap - sends IBC tokens to the swap script
 * which returns native udys at 1:1 rate
 */
export async function executeMigrationSwap(
  executorAddress: string,
  ibcAmount: string
): Promise<SwapResult> {
  if (!SWAP_SCRIPT_ADDRESS) {
    return { success: false, error: 'Swap script address not configured' }
  }

  if (!ibcAmount || ibcAmount === '0') {
    return { success: false, error: 'No IBC tokens to swap' }
  }

  try {
    const { runDysonScript } = useWallet()

    // Build the attached MsgSend to transfer IBC tokens to the script
    const attachedMsg = [
      {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: executorAddress,
        to_address: SWAP_SCRIPT_ADDRESS,
        amount: [{ denom: IBC_OLD_DYS_DENOM, amount: ibcAmount }],
      },
    ]

    console.log('[Swap] Executing swap:', {
      executor: executorAddress,
      script: SWAP_SCRIPT_ADDRESS,
      amount: ibcAmount,
      denom: IBC_OLD_DYS_DENOM,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (runDysonScript as any)({
      scriptAddress: SWAP_SCRIPT_ADDRESS,
      functionName: 'swap',
      kwargs: '{}',
      attachedMsg,
      simulate: false,
      executorAddress,
    })

    console.log('[Swap] Result:', result)

    if (result?.success) {
      return {
        success: true,
        txHash: result.txHash || result.rawSendMsgsResponse?.raw?.txhash,
        amountSwapped: ibcAmount,
      }
    } else {
      // Extract error message
      const errorMsg =
        result?.scriptResponse?.exception?.msg ||
        result?.rawSendMsgsResponse?.rawLog ||
        result?.rawLog ||
        'Swap transaction failed'
      return { success: false, error: errorMsg }
    }
  } catch (e) {
    console.error('[Swap] Error:', e)
    const error = e as Error
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred during swap',
    }
  }
}
