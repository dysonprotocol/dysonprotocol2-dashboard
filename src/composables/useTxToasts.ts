import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useWallet } from '@/composables/useWallet'

const publishedKeys = new Set<string>()

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
      for (const item of list) {
        const key = `${item.txHash}:${item.status}`
        if (publishedKeys.has(key)) continue

        const title = item.type || 'Transaction'
        const desc = `${String(item.status || '').toLowerCase()} • ${shortHash(item.txHash)}`
        const status = String(item.status || '').toLowerCase()
        const show = status === 'failed' || status === 'error' ? toast.error : toast.message

        show(desc, {
          id: key,
          description: title,
          duration: 8000,
          action: {
            label: 'View',
            onClick: () => router.push(`/txs/${item.txHash}`),
          },
          onDismiss: () => {
            try {
              removeTransaction(item.txHash)
            } catch {}
          },
        })

        publishedKeys.add(key)
      }
    },
    { deep: true, immediate: true }
  )
}

export default useTxToasts
