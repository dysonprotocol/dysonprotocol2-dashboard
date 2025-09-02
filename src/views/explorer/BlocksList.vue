<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import LatestBlock from '@/orm/models/base/TendermintService'
import TendermintBlock from '@/orm/models/tendermint/Block'
import TxBlock from '@/orm/models/tx/TxBlock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const blockApi = useAxiosRepo(LatestBlock).api()
const tmApi = useAxiosRepo(TendermintBlock).api()
const txBlockApi = useAxiosRepo(TxBlock).api()
const blockRepo = useRepo(LatestBlock)
const tmRepo = useRepo(TendermintBlock)
const txBlockRepo = useRepo(TxBlock)

const currentPage = ref(1)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const latestHeight = ref(0)
// Tx counts are sourced from TxBlock summary; cached by height forever

// Grid configuration: 10 columns, 1 row per page
const SQUARES_PER_ROW = 10
const ROWS_PER_PAGE = 10
const totalSquaresPerPage = computed(() => SQUARES_PER_ROW * ROWS_PER_PAGE)

// Keep newest block in the top row, snap to modulo 10 to avoid shifting
const targetTop = computed(() => {
  const h = latestHeight.value || 0
  if (h <= 0) return 0
  const rounded = Math.ceil(h / SQUARES_PER_ROW) * SQUARES_PER_ROW
  return rounded
})

const maxPage = computed(() => {
  const total = targetTop.value
  const per = totalSquaresPerPage.value || 1
  return Math.max(1, Math.ceil(total / per))
})

const gridHeights = computed(() => {
  const top = targetTop.value
  const start = top - (currentPage.value - 1) * totalSquaresPerPage.value
  const heights: number[] = []
  for (let i = 0; i < totalSquaresPerPage.value; i++) {
    const h = start - i
    if (h <= 0) break
    heights.push(h)
  }
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

function getLatestHeightFromRepo(): number {
  const list = blockRepo.all() as unknown as Array<{ height: string }>
  if (list.length === 0) return 0
  return list.reduce((m, r) => Math.max(m, Number(r.height || '0')), 0)
}

async function loadPage() {
  if (isLoading.value) return
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  try {
    await blockApi.fetch()
    latestHeight.value = getLatestHeightFromRepo()
    const heights = gridHeights.value.filter((h) => h <= latestHeight.value && h > 0)
    await Promise.all(
      heights.map(async (h) => {
        const key = String(h)
        if (!txBlockRepo.find(key)) await txBlockApi.fetchSummary(h)
        if (!tmRepo.find(key)) await tmApi.fetchWithTxs(h)
      })
    )
  } catch (e) {
    console.error(e)
    hasError.value = true
    errorMessage.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

async function nextPage() {
  if (currentPage.value < maxPage.value) {
    currentPage.value += 1
    await loadPage()
  }
}

async function prevPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  await loadPage()
}

// no timestamp formatting needed for square grid

onMounted(() => {
  loadPage()
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
            <Button
              size="sm"
              variant="outline"
              :disabled="currentPage <= 1 || isLoading"
              @click="prevPage"
            >
              Prev
            </Button>
            <Button size="sm" :disabled="isLoading || currentPage >= maxPage" @click="nextPage">
              Next
            </Button>
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
                  ? ' text-foreground'
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
