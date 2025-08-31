<script setup lang="ts">
import { computed, toRefs } from 'vue'

const props = defineProps<{ blockData: Record<string, unknown> }>()
const { blockData } = toRefs(props)

const metaDump = computed(() => {
  const src = (blockData.value || {}) as Record<string, unknown>
  const meta: Record<string, unknown> = {}
  for (const k of Object.keys(src)) if (k !== 'txs') meta[k] = src[k]
  return JSON.stringify(meta, null, 2)
})

const txs = computed(() => {
  const src = (blockData.value || {}) as { txs?: Array<{ hash?: string }> }
  return Array.isArray(src.txs) ? src.txs : []
})

function txHash(tx: { hash?: string }): string {
  return tx?.hash || ''
}
</script>

<template>
  <section>
    <div class="bg-base-200 text-base-content overflow-x-auto">
      <pre><code>{{ metaDump }}</code></pre>
    </div>

    <div class="mt-4">
      <h2 class="text-lg font-semibold mb-2">Transactions</h2>
      <div v-if="txs.length > 0" class="flex flex-col gap-2">
        <div
          v-for="(tx, idx) in txs"
          :key="txHash(tx) || idx"
          class="p-2 border rounded flex items-center justify-between"
        >
          <RouterLink
            v-if="txHash(tx)"
            :to="{ name: 'TransactionDetails', params: { hash: txHash(tx) } }"
            class="font-mono text-sm"
          >
            {{ txHash(tx) }}
          </RouterLink>
          <span v-else class="text-sm text-gray-500">(no hash)</span>
        </div>
      </div>
      <div class="text-base-content/60 italic" v-else>No transactions in this block.</div>
    </div>
  </section>
</template>
