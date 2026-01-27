<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import LatestBlock from '@/orm/models/base/TendermintService'
import TendermintBlock from '@/orm/models/tendermint/Block'
import TxBlock from '@/orm/models/tx/TxBlock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const txBlockApi = useAxiosRepo(TxBlock).api()
const blockRepo = useRepo(LatestBlock)
const tmRepo = useRepo(TendermintBlock)
const txBlockRepo = useRepo(TxBlock)

const route = useRoute()

function parsePage(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

const currentPage = computed(() => {
  if (typeof route.query.page !== 'undefined') return parsePage(route.query.page as string)
  return maxPage.value
})
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
// Track latest height - use streamed value or fall back to ORM
const streamedHeight = ref(0)
const latestHeight = computed(() => {
  // Prefer streamed height (from WebSocket events) over ORM (which has broken reactivity)
  if (streamedHeight.value > 0) return streamedHeight.value
  const all = blockRepo.all() as unknown as Array<{ singleton?: string; height?: string }>
  const one = all.find((r) => r.singleton === 'default')
  return one?.height ? Number(one.height) : 0
})
let tipTimer: ReturnType<typeof setTimeout> | null = null
// Tx counts are sourced from TxBlock summary; cached by height forever

// Grid configuration: 10 columns, 1 row per page
const SQUARES_PER_ROW = 10
const ROWS_PER_PAGE = 10
const totalSquaresPerPage = computed(() => SQUARES_PER_ROW * ROWS_PER_PAGE)

const maxPage = computed(() => {
  const h = latestHeight.value || 0
  const per = totalSquaresPerPage.value || 1
  return Math.max(1, Math.ceil(h / per))
})

const gridHeights = computed(() => {
  const per = totalSquaresPerPage.value
  const end = currentPage.value * per
  const start = end - per + 1
  const startClamped = Math.max(1, start)
  const heights: number[] = []
  for (let h = end; h >= startClamped; h--) heights.push(h)
  return heights
})

const blocks = computed(() => {
  return gridHeights.value
    .map((h) => {
      const isFuture = h > latestHeight.value
      const summary = txBlockRepo.find(String(h)) as unknown as
        | { height: string; tx_count: string; timestamp?: string }
        | undefined
      const hasData = Boolean(summary)
      const count = isFuture ? 0 : hasData ? Number(summary?.tx_count || '0') : null
      const txCountSafe = count ?? 0
      const displayTx = isFuture ? '' : count === null ? '-' : String(count)
      let minuteEven = false
      let d = null
      if (!isFuture) {
        const header = tmRepo.find(String(h)) as unknown as
          | { header?: { time?: string } }
          | undefined
        const ts = (summary?.timestamp as string) || String((header?.header as any)?.time || '')
        d = ts ? new Date(ts) : null
        if (d && !Number.isNaN(d.getTime())) minuteEven = d.getUTCMinutes() % 2 === 0
      }
      return { height: String(h), isFuture, txCountSafe, displayTx, minuteEven, date: d }
    })
    .filter((r) => r.height)
})


async function loadPage() {
  if (isLoading.value) return
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  try {
    const heights = gridHeights.value.filter((h) => h <= latestHeight.value && h > 0)
    await processInBatches(heights, 8, async (h) => {
      const key = String(h)
      if (!txBlockRepo.find(key)) await txBlockApi.fetchSummary(h)
      // Grid does not require full Tendermint block; fetch lazily in detail pages
    })
  } catch (e) {
    console.error(e)
    hasError.value = true
    errorMessage.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

// reserved helper for targeted fetches if needed in the future
// function loadHeights(heights: number[]) {}

/* eslint-disable-next-line no-unused-vars */
async function processInBatches<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
  const l = Math.max(1, Number(limit) || 1)
  let i = 0
  while (i < items.length) {
    const chunk = items.slice(i, i + l)
    await Promise.all(chunk.map((it) => fn(it)))
    i += l
  }
}

const isPrevDisabled = computed(() => currentPage.value <= 1 || isLoading.value)
const isNextDisabled = computed(() => isLoading.value || currentPage.value >= maxPage.value)
const isCurrentDisabled = computed(() => isLoading.value || currentPage.value >= maxPage.value)

const prevTo = computed(() => ({
  query: { ...route.query, page: String(Math.max(1, currentPage.value - 1)) },
}))

const nextTo = computed(() => ({
  query: { ...route.query, page: String(Math.min(maxPage.value, currentPage.value + 1)) },
}))

// When no page is provided in the query, we default to the latest page in-memory
// without mutating the URL.

// no timestamp formatting needed for square grid

watch(
  () => route.query.page,
  () => {
    // react to URL page changes and load data for that fixed window
    loadPage()
  }
)

// When latestHeight changes, check if current page has blocks that need fetching
watch(latestHeight, () => {
  // Check if any blocks on this page are now fetchable (height <= latestHeight but no data)
  const hasUnfetched = gridHeights.value.some(
    (h) => h <= latestHeight.value && h > 0 && !txBlockRepo.find(String(h))
  )
  if (hasUnfetched) {
    if (tipTimer) globalThis.clearTimeout(tipTimer)
    tipTimer = setTimeout(() => {
      loadPage()
    }, 150)
  }
})

// Handler for new block events from WebSocket
function onNewBlock(e: Event) {
  const detail = (e as CustomEvent).detail as {
    height?: string | number
    timestamp?: string
    tx_count?: number
  } | undefined
  const height = Number(detail?.height || 0)
  if (height > streamedHeight.value) {
    streamedHeight.value = height
  }
  // Save TxBlock directly from WS data if block is on current page
  if (height > 0 && detail?.timestamp !== undefined) {
    const isOnPage = gridHeights.value.includes(height)
    if (isOnPage && !txBlockRepo.find(String(height))) {
      txBlockRepo.save({
        height: String(height),
        timestamp: String(detail.timestamp || ''),
        tx_count: String(detail.tx_count ?? 0),
      })
    }
  }
}

onMounted(async () => {
  await loadPage()
  globalThis.addEventListener('dys:newblock', onNewBlock)
})

onUnmounted(() => {
  globalThis.removeEventListener('dys:newblock', onNewBlock)
  if (tipTimer) clearTimeout(tipTimer)
})

// Watch streamed height and fetch blocks that appear on current page
watch(streamedHeight, (newHeight) => {
  if (newHeight <= 0) return
  const hasUnfetched = gridHeights.value.some(
    (h) => h <= newHeight && h > 0 && !txBlockRepo.find(String(h))
  )
  if (hasUnfetched && !isLoading.value) {
    if (tipTimer) clearTimeout(tipTimer)
    tipTimer = setTimeout(() => loadPage(), 150)
  }
})
</script>

<template>
  <section class="w-full max-w-5xl mx-auto p-4 flex flex-col gap-6">
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>Recent Blocks</CardTitle>
          <div class="flex items-center gap-2">
            <div class="text-sm text-muted-foreground">Page {{ currentPage }} / {{ maxPage }}</div>
            <RouterLink :to="prevTo" class="inline-block">
              <Button size="sm" variant="outline" :disabled="isPrevDisabled">Prev</Button>
            </RouterLink>
            <RouterLink :to="nextTo" class="inline-block">
              <Button size="sm" :disabled="isNextDisabled">Next</Button>
            </RouterLink>
            <RouterLink :to="{ name: 'BlocksList' }" class="inline-block">
              <!-- the main page has no query params, so we can just link to it for the current page -->
              <Button size="sm" :disabled="isCurrentDisabled">Current</Button>
            </RouterLink>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <div class="grid [grid-template-columns:repeat(10,minmax(0,1fr))] gap-1">
            <RouterLink
              v-for="b in blocks"
              :key="b.height"
              :to="{ name: 'BlockDetail', params: { height: b.height } }"
              :aria-label="`Block #${b.height}`"
              :title="
                b.isFuture
                  ? `#${b.height} — future`
                  : `#${b.height} — ${b.date?.toLocaleString()} - ${b.displayTx} txs `
              "
              :class="[
                'aspect-square rounded-xs border flex items-center justify-center select-none sq',
                b.isFuture
                  ? 'pointer-events-none border-muted-foreground/20 text-muted-foreground/40 bg-muted'
                  : 'border-muted-foreground/40',
                !b.isFuture && b.txCountSafe > 0
                  ? ' text-foreground bg-success/20'
                  : !b.isFuture
                    ? b.minuteEven
                      ? 'border-primary/20'
                      : 'border-primary/60'
                    : '',
                b.date ? 'text-foreground ' : 'text-muted-foreground border-0',
              ]"
            >
              <div
                v-if="!b.isFuture && b.date"
                class="flex flex-col items-center justify-center text-center select-none sq-content"
              >
                <div class="font-mono">#{{ b.height }}</div>
                <div>{{ b.date ? b.date.toLocaleDateString() : '' }}</div>
                <div>{{ b.date ? b.date.toLocaleTimeString() : '' }}</div>
                <div>txs: {{ b.txCountSafe }}</div>
              </div>
            </RouterLink>
          </div>

          <div v-if="!isLoading && blocks.length === 0" class="text-sm text-muted-foreground mt-4">
            No blocks found.
          </div>
          <div
            v-if="isLoading"
            class="flex justify-center items-center py-8 text-sm text-muted-foreground"
          >
            Loading...
          </div>
          <div v-if="hasError" class="mt-4 text-sm text-red-600">{{ errorMessage }}</div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>

<style scoped>
.sq {
  container-type: size;
}
.sq-content {
  font-size: 16cqw;
  line-height: 1.05;
}
.sq-content .font-mono {
  font-size: 16cqw;
}
</style>
