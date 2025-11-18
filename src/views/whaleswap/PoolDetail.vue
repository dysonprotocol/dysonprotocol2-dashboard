<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useWhaleswapPool, useWhaleswapPoolsLive } from '@/whaleswap/composables/useWhaleswapPool'
import { usePoolChainEvents } from '@/whaleswap/composables/usePoolChainEvents'
import { useWhaleswapTradesByPool } from '@/whaleswap/composables/useWhaleswapTrades'
import { useWhaleswapPositions } from '@/whaleswap/composables/useWhaleswapPositions'
import { useWallet } from '@/composables/useWallet'
import SwapPanel from './SwapPanel.vue'
import LeverageForm from './LeverageForm.vue'
import TradeHistoryChart from './TradeHistoryChart.vue'
import TradesTable from './TradesTable.vue'
import PositionsTable from './PositionsTable.vue'

const route = useRoute()
const router = useRouter()

// Reactive refs for route parameters - updated when route changes
const poolIdParam = ref('')
const baseParam = ref('')
const quoteParam = ref('')

// Watch route changes and update reactive refs
watch(
  () => route.params.poolId,
  (poolId) => {
    poolIdParam.value = String(poolId || '')
  },
  { immediate: true }
)

watch(
  () => route.query.base,
  (base) => {
    baseParam.value = String(base || '')
  },
  { immediate: true }
)

watch(
  () => route.query.quote,
  (quote) => {
    quoteParam.value = String(quote || '')
  },
  { immediate: true }
)

const poolId = computed(() => poolIdParam.value)
const baseDenomRaw = computed(() => baseParam.value)
const quoteDenomRaw = computed(() => quoteParam.value)

const isMobile = useMediaQuery('(max-width: 768px)')
const panelDirection = computed(() => (isMobile.value ? 'vertical' : 'horizontal'))

const wallet = useWallet()

function normalizeToBaseDenom(denom: string): string {
  if (!denom) return denom
  try {
    const normalized = wallet.normalizeCoin({ amount: '0', denom })
    return normalized.base.denom
  } catch (e) {
    console.error('[PoolDetail] Failed to normalize denom to base:', e)
    return denom
  }
}

const baseDenom = computed(() => normalizeToBaseDenom(baseDenomRaw.value))
const quoteDenom = computed(() => normalizeToBaseDenom(quoteDenomRaw.value))

console.log('[PoolDetail] poolId:', poolId.value)
console.log('[PoolDetail] base (raw):', baseDenomRaw.value, 'base (normalized):', baseDenom.value)
console.log(
  '[PoolDetail] quote (raw):',
  quoteDenomRaw.value,
  'quote (normalized):',
  quoteDenom.value
)

const { data: poolData, isLoading: poolQueryLoading, error: poolError } = useWhaleswapPool(poolId)
const { data: poolsLiveData } = useWhaleswapPoolsLive()
usePoolChainEvents(poolId)
const pool = computed(() => {
  const targetId = poolId.value
  if (!targetId) return poolData.value?.pool || null
  const liveMatch = poolsLiveData.value.find((p) => p.pool_id === targetId)
  return liveMatch || poolData.value?.pool || null
})
const poolLoading = computed(() => poolQueryLoading.value && !pool.value)

watch(
  () => poolsLiveData.value,
  (next) => {
    const match = next?.find((p) => p.pool_id === poolId.value)
    console.debug('[PoolDetail] poolsLiveData updated', {
      total: next?.length,
      match,
    })
  },
  { deep: true }
)

watch(
  () => pool.value,
  (next, prev) => {
    console.debug('[PoolDetail] pool computed changed', { prev, next })
  },
  { deep: true }
)

const { data: tradesData, refetch: refetchTrades } = useWhaleswapTradesByPool(poolId, {
  limit: '100',
  options: { staleTime: 5000 },
})
const trades = computed(() => tradesData.value?.trades || [])
const traderFilter = ref('all')
const activeTab = ref<'trades' | 'positions'>('trades')
const actionTab = ref<'swap' | 'leverage'>('swap')
const traderAddress = computed(() => (traderFilter.value === 'all' ? '' : traderFilter.value))

interface LocalWalletEntry {
  name: string
  address: string
}

const traderOptions = computed(() => {
  const wallets = Array.isArray(wallet.localCosmJsWallets?.value)
    ? (wallet.localCosmJsWallets.value as LocalWalletEntry[])
    : []
  const walletOptions = wallets.map((entry) => ({
    value: entry.address,
    label: `${entry.name} ${entry.address}`,
  }))
  return [{ value: 'all', label: 'All' }, ...walletOptions]
})

const filteredTrades = computed(() => {
  if (traderAddress.value === '') return trades.value
  return trades.value.filter((trade) => trade.trader === traderAddress.value)
})

// Positions query - always fetch (not just when tab is active) so modal updates work
const positionsQuery = useWhaleswapPositions({
  poolId,
  enabled: computed(() => true),
})

// Debug: watch positions query state
watch(
  () => positionsQuery.data.value,
  (newData) => {
    console.log('[PoolDetail] Positions query data updated:', {
      count: newData?.positions?.length || 0,
      isFetching: positionsQuery.isFetching.value,
    })
  },
  { deep: true }
)

watch(
  () => positionsQuery.isFetching.value,
  (fetching) => {
    console.log('[PoolDetail] Positions query fetching state:', fetching)
  }
)

const activePositions = computed(() => positionsQuery.data.value?.positions || [])
const positionsLoading = computed(
  () =>
    activeTab.value === 'positions' && positionsQuery.isLoading.value && !positionsQuery.data.value
)

const coins = computed(() => pool.value?.coins || [])
const coin0 = computed(() => coins.value[0] || null)
const coin1 = computed(() => coins.value[1] || null)

const base = computed(() => {
  // If both query params are specified and valid, use base as specified
  if (
    baseDenom.value &&
    quoteDenom.value &&
    coins.value.some((c) => c.denom === baseDenom.value) &&
    coins.value.some((c) => c.denom === quoteDenom.value)
  ) {
    return baseDenom.value
  }

  // If only quote is specified, use the other denom as base
  if (
    quoteDenom.value &&
    coins.value.some((c) => c.denom === quoteDenom.value) &&
    coins.value.length === 2
  ) {
    return coins.value.find((c) => c.denom !== quoteDenom.value)?.denom || coin0.value?.denom || ''
  }

  // If no query params, prefer udys as quote if present
  const hasUdys = coins.value.some((c) => c.denom === 'udys')
  if (hasUdys && coins.value.length === 2) {
    // Use the non-udys denom as base
    return coins.value.find((c) => c.denom !== 'udys')?.denom || coin0.value?.denom || ''
  }

  // Default: use first coin as base
  return coin0.value?.denom || ''
})

const quote = computed(() => {
  // If both query params are specified and valid, use quote as specified
  if (
    baseDenom.value &&
    quoteDenom.value &&
    coins.value.some((c) => c.denom === baseDenom.value) &&
    coins.value.some((c) => c.denom === quoteDenom.value)
  ) {
    return quoteDenom.value
  }

  // If only base is specified, use the other denom as quote
  if (
    baseDenom.value &&
    coins.value.some((c) => c.denom === baseDenom.value) &&
    coins.value.length === 2
  ) {
    return coins.value.find((c) => c.denom !== baseDenom.value)?.denom || coin1.value?.denom || ''
  }

  // If no query params, prefer udys as quote if present
  const hasUdys = coins.value.some((c) => c.denom === 'udys')
  if (hasUdys && coins.value.length === 2) {
    // Use udys as quote
    return 'udys'
  }

  // Default: use second coin as quote
  return coin1.value?.denom || ''
})

const baseCoin = computed(() => coins.value.find((c) => c.denom === base.value))
const quoteCoin = computed(() => coins.value.find((c) => c.denom === quote.value))

const price = computed(() => {
  if (!baseCoin.value || !quoteCoin.value) return null
  const baseAmt = BigInt(baseCoin.value.amount)
  const quoteAmt = BigInt(quoteCoin.value.amount)
  if (baseAmt === 0n) return null
  const p = Number(quoteAmt) / Number(baseAmt)
  return p
})

function getFeeRate(outputDenom: string): number {
  // Use fee_rate if available (per-denom), fallback to fee_pct (deprecated)
  if (pool.value?.fee_rate && Array.isArray(pool.value.fee_rate)) {
    const feeCoin = pool.value.fee_rate.find((f) => f.denom === outputDenom)
    if (feeCoin) {
      return parseFloat(feeCoin.amount)
    }
  }
  // Fallback to deprecated fee_pct
  if (pool.value?.fee_pct) {
    return parseFloat(pool.value.fee_pct)
  }
  return 0
}

function getDisplayDenom(denom: string): string {
  if (!denom) return denom
  try {
    const normalized = wallet.normalizeCoin({ amount: '0', denom })
    return normalized.display.denom
  } catch (e) {
    console.error('[PoolDetail] Failed to get display denom:', e)
    return denom
  }
}

const normalizedCoins = computed(() => {
  return coins.value.map((coin) => {
    try {
      const normalized = wallet.normalizeCoin({ amount: coin.amount, denom: coin.denom })
      return {
        ...coin,
        displayAmount: normalized.display.amount,
        displayDenom: normalized.display.denom,
      }
    } catch (e) {
      console.error('[PoolDetail] Failed to normalize coin:', e)
      return {
        ...coin,
        displayAmount: coin.amount,
        displayDenom: coin.denom,
      }
    }
  })
})

const displayBase = computed(() => getDisplayDenom(base.value))
const displayQuote = computed(() => getDisplayDenom(quote.value))

// Pool leverage limits
const poolLimits = computed(() => {
  if (!pool.value) return null

  const limits = {
    minCollateralRatio: pool.value.min_initial_collateral_ratio || null,
    maxBorrowPercent: pool.value.max_borrow_percent || null,
    liquidationThreshold: pool.value.liquidation_threshold || null,
    interestRate: pool.value.interest_rate || null,
  }

  const hasAnyLimits = Object.values(limits).some((v) => v && Array.isArray(v) && v.length > 0)
  return hasAnyLimits ? limits : null
})

function handleSwapSuccess() {
  console.log('[PoolDetail] Swap successful, refetching trades and pool data')
  refetchTrades()
}

function swapPair(): void {
  router.replace({
    path: `/whaleswap/pools/${poolId.value}`,
    query: {
      base: quoteParam.value || displayQuote.value,
      quote: baseParam.value || displayBase.value,
    },
  })
}

onMounted(async () => {
  await wallet.loadDenomMetadata()
})
</script>

<template>
  <div class="flex flex-col" style="height: calc(100vh - 70px)">
    <div v-if="poolLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">Loading pool...</div>
    </div>

    <div v-else-if="poolError" class="flex-1 flex items-center justify-center">
      <div class="text-center text-destructive">Error: {{ poolError.message }}</div>
    </div>

    <div v-else-if="!pool" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">Pool not found</div>
    </div>

    <ResizablePanelGroup
      v-else
      :direction="panelDirection"
      class="flex-1 pool-detail-layout"
      auto-save-id="pool-detail:main"
    >
      <!-- Right Column -->
      <ResizablePanel :default-size="50" class="pool-detail-panel">
        <ResizablePanelGroup
          direction="vertical"
          class="pool-detail-layout"
          auto-save-id="pool-detail:right"
        >
          <!-- Trade History Chart -->
          <ResizablePanel :default-size="60" class="pool-detail-panel">
            <div class="h-full flex flex-col px-4">
              <div class="flex-1 min-h-[300px]">
                <TradeHistoryChart
                  v-if="trades.length > 0"
                  :trades="trades"
                  :pool-id="poolId"
                  :base="base"
                  :quote="quote"
                  :display-base="displayBase"
                  :display-quote="displayQuote"
                  :current-price="price"
                />
                <div
                  v-else
                  class="text-center py-8 text-muted-foreground h-full flex items-center justify-center"
                >
                  No trades yet
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle with-handle class="hover:bg-green-500" />

          <!-- Trades/Positions Tabs -->
          <ResizablePanel :default-size="40" class="pool-detail-panel">
            <div class="h-full flex flex-col p-4">
              <Tabs v-model="activeTab" default-value="trades" class="flex flex-col flex-1">
                <div
                  class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <TabsList>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                  </TabsList>
                  <div v-if="activeTab === 'trades'" class="w-full sm:w-64">
                    <Select v-model="traderFilter">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Filter trader" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="option in traderOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <TabsContent value="trades" class="flex-1 overflow-hidden min-h-[300px]">
                  <TradesTable
                    v-if="filteredTrades.length > 0"
                    :trades="filteredTrades"
                    :pool-id="poolId"
                    :base="base"
                    :quote="quote"
                  />
                  <div v-else class="text-center py-8 text-muted-foreground">No trades found</div>
                </TabsContent>
                <TabsContent value="positions" class="flex-1 overflow-hidden min-h-[300px]">
                  <div
                    v-if="positionsLoading"
                    class="flex h-full items-center justify-center gap-2 py-8 text-muted-foreground"
                  >
                    <Spinner class="size-5" />
                    <span>Loading positions...</span>
                  </div>
                  <PositionsTable v-else :positions="activePositions" :pool-id="poolId" />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle with-handle class="hover:bg-green-500" />

      <!-- Left Column -->
      <ResizablePanel :default-size="50" class="pool-detail-panel">
        <div class="h-full flex flex-col overflow-y-auto">
          <!-- Pool Info -->
          <div class="flex-shrink-0 p-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Left Column -->
              <div class="space-y-3 text-xs">
                <div class="">
                  <div>
                    <div class="text-lg font-semibold">
                      <span v-if="price !== null && isFinite(price)">
                        {{ price.toFixed(6) }} {{ displayBase }}/{{ displayQuote }}
                      </span>
                      <span v-else class="text-muted-foreground">Price unavailable</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" @click="swapPair">Swap Pair</Button>
                </div>

                <div>
                  <div class="text-muted-foreground mb-1">Reserves:</div>
                  <div v-for="coin in normalizedCoins" :key="coin.denom" class="font-mono ml-2">
                    {{ coin.displayAmount }} {{ coin.displayDenom }}
                  </div>
                </div>

                <div>
                  <div class="text-muted-foreground mb-1">Fee:</div>
                  <div class="font-mono ml-2">
                    <div
                      v-if="
                        pool.fee_rate && Array.isArray(pool.fee_rate) && pool.fee_rate.length > 0
                      "
                    >
                      <div v-for="fee in pool.fee_rate" :key="fee.denom">
                        {{ getDisplayDenom(fee.denom) }}:
                        {{ (parseFloat(fee.amount) * 100).toFixed(3) }}%
                      </div>
                    </div>
                    <div v-else-if="pool.fee_pct">
                      {{ (parseFloat(pool.fee_pct) * 100).toFixed(3) }}% (deprecated)
                    </div>
                    <div v-else>N/A</div>
                  </div>
                </div>

                <div>
                  <div class="text-muted-foreground mb-1">Trades:</div>
                  <div class="font-mono ml-2">{{ pool.num_trades || '0' }}</div>
                </div>
              </div>

              <!-- Right Column - Pool Limits -->
              <div v-if="poolLimits" class="space-y-3 text-xs">
                <div v-if="poolLimits.minCollateralRatio?.length">
                  <div class="text-muted-foreground mb-1">Min Initial Collateral Ratio:</div>
                  <div
                    v-for="item in poolLimits.minCollateralRatio"
                    :key="item.denom"
                    class="font-mono ml-2"
                  >
                    {{ getDisplayDenom(item.denom) }}: {{ parseFloat(item.amount).toFixed(2) }}x
                  </div>
                </div>
                <div v-if="poolLimits.liquidationThreshold?.length">
                  <div class="text-muted-foreground mb-1">Liquidation Threshold:</div>
                  <div
                    v-for="item in poolLimits.liquidationThreshold"
                    :key="item.denom"
                    class="font-mono ml-2"
                  >
                    {{ getDisplayDenom(item.denom) }}: {{ parseFloat(item.amount).toFixed(2) }}x
                  </div>
                </div>
                <div v-if="poolLimits.maxBorrowPercent?.length">
                  <div class="text-muted-foreground mb-1">Max Borrow Percent:</div>
                  <div
                    v-for="item in poolLimits.maxBorrowPercent"
                    :key="item.denom"
                    class="font-mono ml-2"
                  >
                    {{ getDisplayDenom(item.denom) }}:
                    {{ (parseFloat(item.amount) * 100).toFixed(1) }}%
                  </div>
                </div>
                <div v-if="poolLimits.interestRate?.length">
                  <div class="text-muted-foreground mb-1">Interest Rate:</div>
                  <div
                    v-for="item in poolLimits.interestRate"
                    :key="item.denom"
                    class="font-mono ml-2"
                  >
                    {{ getDisplayDenom(item.denom) }}:
                    {{ (parseFloat(item.amount) * 100).toFixed(2) }}% APR
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Tabs: Swap and Leverage -->
          <div class="flex-shrink-0 border-t pt-4 px-4">
            <Tabs v-model="actionTab" default-value="swap">
              <TabsList class="w-full">
                <TabsTrigger value="swap" class="flex-1">Swap</TabsTrigger>
                <TabsTrigger value="leverage" class="flex-1">Leverage</TabsTrigger>
              </TabsList>
              <TabsContent value="swap">
                <SwapPanel
                  :pool="pool"
                  :base="base"
                  :quote="quote"
                  @swap-success="handleSwapSuccess"
                />
              </TabsContent>
              <TabsContent value="leverage">
                <LeverageForm :pool="pool" :base="base" :quote="quote" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
