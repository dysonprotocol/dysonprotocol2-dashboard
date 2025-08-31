<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/orm/http'
import { useWallet } from '@/composables/useWallet'

const route = useRoute()
const router = useRouter()

const { unlockedWallets } = useWallet()
const wallets = computed(() => (Array.isArray(unlockedWallets?.value) ? unlockedWallets.value : []))

const searchForm = ref({ query: '', orderBy: 'ORDER_BY_DESC', limit: 25, page: 1 })
const isLoading = ref(false)
const error = ref('')
const total = ref<number | undefined>()
const lastQuery = ref('')

const rows = ref<
  Array<{ hash: string; height: string; timestamp: string; code: string; msgTypes: string }>
>([])

const hasResults = computed(() => rows.value.length > 0 && !!searchForm.value.query)
const hasNextPage = computed(() => {
  const lim = Number(searchForm.value.limit)
  if (typeof total.value === 'number') return searchForm.value.page * lim < total.value
  return rows.value.length === lim
})

function resetResults() {
  rows.value = []
  total.value = undefined
}

async function runSearch() {
  const q = searchForm.value.query.trim()
  if (!q) return
  if (isLoading.value) return
  isLoading.value = true
  error.value = ''
  try {
    const qs = new URLSearchParams({ query: q })
    qs.set('order_by', searchForm.value.orderBy)
    qs.set('page', String(searchForm.value.page))
    qs.set('limit', String(searchForm.value.limit))
    const { data } = await api.get(`/cosmos/tx/v1beta1/txs?${qs}`)
    const listResponses = Array.isArray(data?.tx_responses) ? data.tx_responses : []
    const listTxs = Array.isArray(data?.txs) ? data.txs : []
    rows.value = listResponses
      .map((r: any, idx: number) => {
        const tx = listTxs[idx]
        const msgs = Array.isArray(tx?.body?.messages) ? tx.body.messages : []
        const types = msgs
          .map((m: any) => String(m?.['@type'] || m?.type_url || ''))
          .filter(Boolean)
        return {
          hash: String(r?.txhash || ''),
          height: String(r?.height ?? '0'),
          timestamp: String(r?.timestamp || ''),
          code: String(r?.code ?? '0'),
          msgTypes: types.join(', '),
        }
      })
      .filter((r: any) => r.hash)
    const totAny = (data?.pagination?.total ?? data?.total) as string | number | undefined
    total.value = typeof totAny === 'number' ? totAny : totAny ? Number(totAny) : undefined
  } catch (e) {
    error.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

function handleSearch() {
  const qTrim = searchForm.value.query.trim()
  if (!qTrim) return
  searchForm.value.query = qTrim
  searchForm.value.page = 1
  const needNav = route.query.query !== qTrim || String(route.query.page || '') !== '1'
  if (needNav) {
    router.push({
      query: {
        ...route.query,
        query: qTrim,
        page: '1',
      },
    })
  } else {
    runSearch()
  }
}

function goToPage(page: number) {
  searchForm.value.page = page
  router.push({
    query: {
      ...route.query,
      query: searchForm.value.query.trim(),
      page: String(searchForm.value.page),
    },
  })
}

function applyQuickQuery(q: string) {
  if (!q) return
  const qTrim = q.trim()
  searchForm.value.query = qTrim
  searchForm.value.page = 1
  const needNav = route.query.query !== qTrim || String(route.query.page || '') !== '1'
  if (needNav) {
    router.push({ query: { ...route.query, query: qTrim, page: '1' } })
  } else {
    runSearch()
  }
}

function goToTx(hash: string) {
  if (!hash) return
  router.push({ name: 'TransactionDetails', params: { hash } })
}

async function appendLast1000() {
  if (isLoading.value) return
  try {
    const { data } = await api.get('/cosmos/base/tendermint/v1beta1/blocks/latest')
    const h = Number(data?.sdk_block?.header?.height)
    if (!Number.isFinite(h)) return
    const cutoff = Math.max(1, h - 1000)
    const clause = `tx.height>${cutoff}`
    const base = searchForm.value.query
    // Remove any prior height filters: occurrences of "AND tx.height>number" and a leading "tx.height>number"
    let cleaned = String(base || '')
      .replace(/\s+AND\s+tx\.height\s*>\s*\d+/gi, '')
      .replace(/^\s*tx\.height\s*>\s*\d+\s*(?:AND\s*)?/i, '')
      .trim()
    cleaned = cleaned
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+AND\s+$/i, '')
      .trim()
    const next = cleaned ? `${cleaned} AND ${clause}` : clause
    searchForm.value.query = next
    handleSearch()
  } catch (e) {
    console.error('appendLast1000 failed', e)
    error.value = (e as Error).message || String(e)
  }
}

watch(
  () => ({ q: route.query.query, p: route.query.page }),
  ({ q, p }) => {
    if (typeof q === 'string' && q.trim()) {
      const trimmed = q.trim()
      searchForm.value.query = trimmed
      const pn = Number(p)
      searchForm.value.page = Number.isFinite(pn) && pn > 0 ? pn : 1
      if (trimmed !== lastQuery.value) {
        resetResults()
        lastQuery.value = trimmed
      }
      runSearch()
      return
    }
    error.value = ''
  },
  { immediate: true }
)

function qSender(addr: string) {
  return `message.sender='${addr}'`
}
function qSpent(addr: string) {
  return `coin_spent.spender='${addr}'`
}
function qReceived(addr: string) {
  return `coin_received.receiver='${addr}'`
}
function qExecBy(addr: string) {
  return `dysonprotocol.script.v1.EventExecScript.executor_address='${addr}'`
}
function qScriptAddr(addr: string) {
  return `dysonprotocol.script.v1.EventExecScript.script_address='${addr}'`
}
</script>

<template>
  <div class="space-y-6 p-6">
    <div>
      <h1 class="text-2xl font-bold text-base-content">Transaction Explorer</h1>
      <p class="text-base-content/60">Search and explore blockchain transactions</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left column: search + results -->
      <div class="space-y-6 md:col-span-2">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Search Transactions</h2>

            <form class="space-y-4" @submit.prevent="handleSearch">
              <div class="form-control">
                <label class="label"><span class="label-text">Query</span></label>
                <input
                  v-model="searchForm.query"
                  type="text"
                  placeholder="e.g. tx.height=123"
                  class="input input-bordered w-full"
                />
                <div class="mt-1 text-xs">
                  <button type="button" class="link" @click="appendLast1000">
                    … in the last 1000 blocks
                  </button>
                </div>
              </div>

              <div class="bg-base-200 rounded-box p-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="form-control">
                    <label class="label"><span class="label-text">Order By</span></label>
                    <select v-model="searchForm.orderBy" class="select select-bordered">
                      <option value="ORDER_BY_DESC">Newest First</option>
                      <option value="ORDER_BY_ASC">Oldest First</option>
                    </select>
                  </div>
                  <div class="form-control">
                    <label class="label"><span class="label-text">Results per page</span></label>
                    <select v-model.number="searchForm.limit" class="select select-bordered">
                      <option :value="10">10</option>
                      <option :value="25">25</option>
                      <option :value="50">50</option>
                      <option :value="100">100</option>
                    </select>
                  </div>
                  <div class="form-control">
                    <label class="label"><span class="label-text">Page</span></label>
                    <input
                      v-model.number="searchForm.page"
                      type="number"
                      min="1"
                      class="input input-bordered"
                    />
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :class="{ loading: isLoading }"
                  :disabled="isLoading"
                >
                  Search Transactions
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-12">
          <span class="loading loading-spinner loading-lg" />
          <p class="mt-4 text-base-content/60">Searching transactions...</p>
        </div>

        <div v-else-if="error" class="alert alert-error">
          <span>Error: {{ error }}</span>
        </div>

        <div v-else-if="hasResults" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Search Results ({{ rows.length }} transactions)</h2>
            <div v-if="total" class="text-sm text-base-content/60">Total: {{ total }}</div>
          </div>

          <div v-if="rows.length > 0" class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Height</th>
                  <th>Timestamp</th>
                  <th>Messages</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in rows"
                  :key="t.hash"
                  class="hover cursor-pointer hover:bg-primary/20"
                  @click="goToTx(t.hash)"
                >
                  <td class="font-mono">{{ t.height }}</td>
                  <td class="text-sm">{{ t.timestamp }}</td>
                  <td class="text-xs whitespace-pre-wrap break-words">{{ t.msgTypes || '—' }}</td>
                  <td>
                    <span class="text-xs" :class="t.code === '0' ? 'text-success' : 'text-error'">
                      {{ t.code === '0' ? 'OK' : 'ERR ' + t.code }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-12">
            <p class="text-base-content/60">No transactions found matching your search criteria.</p>
          </div>

          <div v-if="rows.length > 0" class="flex justify-center mt-2">
            <div class="join">
              <button
                class="join-item btn"
                :disabled="searchForm.page <= 1"
                @click="goToPage(searchForm.page - 1)"
              >
                Previous
              </button>
              <button class="join-item btn btn-active">Page {{ searchForm.page }}</button>
              <button
                class="join-item btn"
                :disabled="!hasNextPage && searchForm.page >= 1"
                @click="goToPage(searchForm.page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column: quick links -->
      <div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="font-semibold mb-3">Quick Links</div>
            <div v-if="wallets.length === 0" class="text-sm text-base-content/60">
              Connect or unlock a wallet to see quick links.
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="(w, idx) in wallets"
                :key="(w as any).address || idx"
                class="rounded-box border border-base-300 p-4"
              >
                <div class="text-sm font-medium mb-2">
                  {{ (w as any).name }} — {{ (w as any).address }}
                </div>
                <ul class="space-y-2 text-sm">
                  <li>
                    <button class="link" @click="applyQuickQuery(qSender((w as any).address))">
                      All Transactions
                    </button>
                  </li>
                  <li>
                    <button class="link" @click="applyQuickQuery(qSpent((w as any).address))">
                      Coins sent from
                    </button>
                  </li>
                  <li>
                    <button class="link" @click="applyQuickQuery(qReceived((w as any).address))">
                      Coins sent to
                    </button>
                  </li>
                  <li>
                    <button class="link" @click="applyQuickQuery(qExecBy((w as any).address))">
                      All scripts this address has called
                    </button>
                  </li>
                  <li>
                    <button class="link" @click="applyQuickQuery(qScriptAddr((w as any).address))">
                      All addresses that have called this script
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
