import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useWallet } from '@/composables/useWallet'

const publishedKeys = new Set<string>()

interface TxHistoryItem {
  txHash: string
  timestamp: number
  type: string
  fromAddress: string
  toAddress: string
  amount?: unknown
  status: string
}

function shortHash(hash: string) {
  if (!hash) return ''
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export function useTxToasts() {
  const router = useRouter()
  const { txHistory, removeTransaction } = useWallet()

  watch(
    () => txHistory.value,
    (list) => {
      if (!Array.isArray(list)) return
      const arr = list as unknown as TxHistoryItem[]
      for (const item of arr) {
        const key = `${item.txHash}:${item.status}`
        if (publishedKeys.has(key)) continue

        const title = item.type || 'Transaction'
        const desc = `${String(item.status || '').toLowerCase()} • ${shortHash(item.txHash)}`
        const status = String(item.status || '').toLowerCase()
        const isError = status === 'failed' || status === 'error'
        const isSuccess = status === 'success'
        const show = isError ? toast.error : isSuccess ? toast.success : toast.message
        show(desc, {
          id: key,
          description: title,
          duration: Infinity,
          action: {
            label: 'View Tx',
            onClick: () => router.push(`/txs/${item.txHash}`),
          },
          onDismiss: () => {
            try {
              removeTransaction(item.txHash)
            } catch {
              console.error('Failed to remove transaction from txHistory', item.txHash)
            }
          },
        })

        publishedKeys.add(key)
      }
    },
    { deep: true, immediate: true }
  )
}

export default useTxToasts
