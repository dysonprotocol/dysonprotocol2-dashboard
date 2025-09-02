<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/orm/http'
import { useWallet } from '@/composables/useWallet'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-vue-next'
import AddressDisplay from '@/components/AddressDisplay.vue'

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

const DEFAULT_QUERY = 'tx.height>0'

const limitModel = computed({
  get: () => String(searchForm.value.limit),
  set: (value) => {
    const n = Number(value as any)
    searchForm.value.limit = Number.isFinite(n) ? n : 25
  },
})

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
  const qTrimRaw = searchForm.value.query.trim()
  const qTrim = qTrimRaw || DEFAULT_QUERY
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
    // If no query provided, default to a safe catch-all that returns recent txs
    error.value = ''
    if (route.query.query !== DEFAULT_QUERY) {
      router.replace({
        query: {
          ...route.query,
          query: DEFAULT_QUERY,
          page: '1',
        },
      })
    }
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
      <h1 class="text-2xl font-bold text-foreground">Transaction Explorer</h1>
      <p class="text-muted-foreground">Search and explore blockchain transactions</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left column: search + results -->
      <div class="space-y-6 md:col-span-2">
        <Card :aria-busy="isLoading">
          <CardHeader>
            <CardTitle>Search Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <form class="space-y-4" @submit.prevent="handleSearch">
              <div class="space-y-1">
                <label class="text-sm text-muted-foreground">Query</label>
                <Input v-model="searchForm.query" type="text" placeholder="e.g. tx.height=123" />
                <div class="mt-1 text-xs">
                  <Button type="button" variant="link" class="px-0" @click="appendLast1000">
                    … in the last 1000 blocks
                  </Button>
                </div>
              </div>

              <div class="rounded-lg border p-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="space-y-1">
                    <label class="text-sm text-muted-foreground">Order By</label>
                    <Select v-model="searchForm.orderBy">
                      <SelectTrigger>
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORDER_BY_DESC">Newest First</SelectItem>
                        <SelectItem value="ORDER_BY_ASC">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1">
                    <label class="text-sm text-muted-foreground">Results per page</label>
                    <Select v-model="limitModel">
                      <SelectTrigger>
                        <SelectValue placeholder="Limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1">
                    <label class="text-sm text-muted-foreground">Page</label>
                    <Input v-model.number="searchForm.page" type="number" min="1" />
                  </div>
                </div>
              </div>

              <div>
                <Button type="submit" :disabled="isLoading">
                  <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                  Search Transactions
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div v-if="isLoading" class="text-center py-12">
          <Loader2 class="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p class="mt-4 text-muted-foreground">Searching transactions...</p>
        </div>

        <div
          v-else-if="error"
          role="alert"
          class="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive p-3 text-sm"
        >
          Error: {{ error }}
        </div>

        <div v-else-if="hasResults" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Search Results ({{ rows.length }} transactions)</h2>
            <div v-if="total" class="text-sm text-muted-foreground">Total: {{ total }}</div>
          </div>

          <div v-if="rows.length > 0" class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Height</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="t in rows"
                  :key="t.hash"
                  class="cursor-pointer hover:bg-accent/50"
                  role="button"
                  :aria-label="`Open transaction ${t.hash}`"
                  @click="goToTx(t.hash)"
                >
                  <TableCell class="font-mono">{{ t.height }}</TableCell>
                  <TableCell class="text-sm">{{ t.timestamp }}</TableCell>
                  <TableCell class="text-xs whitespace-pre-wrap break-words">{{
                    t.msgTypes || '—'
                  }}</TableCell>
                  <TableCell>
                    <Badge
                      :class="
                        t.code === '0'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-red-500/10 text-red-600'
                      "
                      class="text-xs"
                    >
                      {{ t.code === '0' ? 'OK' : 'ERR ' + t.code }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div v-else class="text-center py-12">
            <p class="text-muted-foreground">
              No transactions found matching your search criteria.
            </p>
          </div>

          <div v-if="rows.length > 0" class="flex justify-center mt-2">
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                :disabled="searchForm.page <= 1"
                @click="goToPage(searchForm.page - 1)"
                >Previous</Button
              >
              <Button variant="secondary" disabled>Page {{ searchForm.page }}</Button>
              <Button
                variant="outline"
                :disabled="!hasNextPage && searchForm.page >= 1"
                @click="goToPage(searchForm.page + 1)"
                >Next</Button
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Right column: quick links -->
      <div>
        <div class="font-semibold mb-3">Quick Links</div>
        <div v-if="wallets.length === 0" class="text-sm text-muted-foreground">
          Connect or unlock a wallet to see quick links.
        </div>
        <div v-else class="space-y-4">
          <Card v-for="(w, idx) in wallets" :key="(w as any).address || idx" class="gap-3">
            <CardHeader class="">
              <CardTitle class="font-medium">
                {{ (w as any).name }} —
                <AddressDisplay :address="(w as any).address" :truncate="8" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="">
                <li>
                  <Button
                    variant="link"
                    class="px-0"
                    @click="applyQuickQuery(qSender((w as any).address))"
                  >
                    All Transactions
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    class="px-0"
                    @click="applyQuickQuery(qSpent((w as any).address))"
                  >
                    Coins sent from
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    class="px-0"
                    @click="applyQuickQuery(qReceived((w as any).address))"
                  >
                    Coins sent to
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    class="px-0"
                    @click="applyQuickQuery(qExecBy((w as any).address))"
                  >
                    All scripts this address has called
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    class="px-0"
                    @click="applyQuickQuery(qScriptAddr((w as any).address))"
                  >
                    All addresses that have called this script
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
