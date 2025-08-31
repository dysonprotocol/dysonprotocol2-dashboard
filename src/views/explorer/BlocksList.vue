<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import LatestBlock from '@/orm/models/base/TendermintService'
import TxRecord from '@/orm/models/tx/TxRecord'

const blockApi = useAxiosRepo(LatestBlock).api()
const txApi = useAxiosRepo(TxRecord).api()
const blockRepo = useRepo(LatestBlock)
const txRepo = useRepo(TxRecord)

const currentPage = ref(1)
const pageSize = ref(20)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const latestHeight = ref(0)
const txCountByHeight = ref<Record<string, number>>({})

const pageHeights = computed(() => {
  if (latestHeight.value <= 0) return [] as number[]
  const start = latestHeight.value - (currentPage.value - 1) * pageSize.value
  const heights: number[] = []
  for (let i = 0; i < pageSize.value; i++) {
    const h = start - i
    if (h <= 0) break
    heights.push(h)
  }
  return heights
})

const blocks = computed(() => {
  return pageHeights.value
    .map((h) => {
      const b = blockRepo.find(String(h)) as unknown as
        | { height: string; time: string; proposer_address: string; hash: string }
        | undefined
      const txs = txRepo.where('height', (x: string) => x === String(h)).get()
      return {
        height: String(h),
        timestamp: b?.time || '',
        txCount: txCountByHeight.value[String(h)] ?? (txs as unknown as Array<unknown>).length,
      }
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
    if (!latestHeight.value) {
      await blockApi.fetch()
      latestHeight.value = getLatestHeightFromRepo()
    }
    const heights = pageHeights.value
    await Promise.all([
      ...heights.map((h) => blockApi.fetchByHeight(h)),
      ...heights.map(async (h) => {
        const res = await txApi.searchInit({ query: `tx.height=${h}`, limit: '1' })
        const total = res?.total ? Number(res.total) : 0
        txCountByHeight.value[String(h)] = Number.isFinite(total) ? total : 0
      }),
    ])
  } catch (e) {
    console.error(e)
    hasError.value = true
    errorMessage.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

async function nextPage() {
  currentPage.value += 1
  await loadPage()
}

async function prevPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  await loadPage()
}

function formatTimestamp(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString()
}

onMounted(() => {
  loadPage()
})
</script>

<template>
  <section class="w-full max-w-3xl mx-auto p-4 flex flex-col gap-6">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl font-bold">Recent Blocks</h1>
      <div class="join">
        <button
          class="join-item btn btn-sm"
          :disabled="currentPage <= 1 || isLoading"
          @click="prevPage"
        >
          Prev
        </button>
        <button class="join-item btn btn-sm" :disabled="isLoading" @click="nextPage">Next</button>
      </div>
    </div>

    <div class="overflow-x-auto shadow bg-base-200">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Height</th>
            <th>Timestamp</th>
            <th>Txs</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in blocks" :key="b.height">
            <td>
              <RouterLink
                :to="{ name: 'BlockDetail', params: { height: b.height } }"
                class="link link-primary"
              >
                {{ b.height }}
              </RouterLink>
            </td>
            <td>{{ formatTimestamp(b.timestamp) }}</td>
            <td>{{ b.txCount }}</td>
            <td>
              <RouterLink
                :to="{ name: 'BlockDetail', params: { height: b.height } }"
                class="btn btn-xs btn-outline"
              >
                View
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <span class="loading loading-spinner loading-lg" />
      </div>
      <div v-if="hasError" class="alert alert-error mt-4">{{ errorMessage }}</div>
      <div v-if="!isLoading && blocks.length === 0" class="text-base-content/60 italic p-4">
        No blocks found.
      </div>
    </div>
  </section>
</template>
