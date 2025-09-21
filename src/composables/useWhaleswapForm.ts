import { ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapActions from '@/orm/models/whaleswap/Actions'

export function useWhaleswapForm() {
  const isSubmitting = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  async function submit<T extends (...args: any[]) => Promise<any>>(fn: T, args: Parameters<T>[0]) {
    errorMessage.value = ''
    successMessage.value = ''
    isSubmitting.value = true
    try {
      const api = useAxiosRepo(WhaleswapActions).api() as unknown as Record<string, any>
      const method = api[fn.name] as T
      const res = await method.call(api, args)
      successMessage.value = 'Submitted'
      return res
    } catch (e: any) {
      errorMessage.value = String(e?.message || e || 'Failed')
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  function msgTypeFor(action: string): string {
    const map: Record<string, string> = {
      makeOffer: '/dysonprotocol.whaleswap.v1.MsgMakeOffer',
      takeOffer: '/dysonprotocol.whaleswap.v1.MsgTakeOffer',
      cancelOffer: '/dysonprotocol.whaleswap.v1.MsgCancelOffer',
      createPool: '/dysonprotocol.whaleswap.v1.MsgCreatePool',
      addLiquidity: '/dysonprotocol.whaleswap.v1.MsgAddLiquidity',
      removeLiquidity: '/dysonprotocol.whaleswap.v1.MsgRemoveLiquidity',
      poolSwap: '/dysonprotocol.whaleswap.v1.MsgPoolSwap',
      updatePoolConfig: '/dysonprotocol.whaleswap.v1.MsgUpdatePoolConfig',
      openAuction: '/dysonprotocol.whaleswap.v1.MsgOpenAuction',
      redeemAuction: '/dysonprotocol.whaleswap.v1.MsgRedeemAuction',
      convertToLiquid: '/dysonprotocol.whaleswap.v1.MsgConvertToLiquid',
      convertToSolid: '/dysonprotocol.whaleswap.v1.MsgConvertToSolid',
      updateParams: '/dysonprotocol.whaleswap.v1.MsgUpdateParams',
    }
    return map[action] || ''
  }

  return { isSubmitting, errorMessage, successMessage, submit, msgTypeFor }
}

export default useWhaleswapForm
