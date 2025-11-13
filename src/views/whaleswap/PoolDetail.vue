<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useWhaleswapPool } from '@/whaleswap/composables/useWhaleswapPool'
import { useWhaleswapTradesByPool } from '@/whaleswap/composables/useWhaleswapTrades'
import { useWallet } from '@/composables/useWallet'
import SwapPanel from './SwapPanel.vue'
import TradeHistoryChart from './TradeHistoryChart.vue'
import TradesTable from './TradesTable.vue'

const route = useRoute()
const poolId = computed(() => String(route.params.poolId || ''))
const baseDenomRaw = computed(() => String(route.query.base || ''))
const quoteDenomRaw = computed(() => String(route.query.quote || ''))

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

const { data: poolData, isLoading: poolLoading, error: poolError } = useWhaleswapPool(poolId)
const pool = computed(() => poolData.value?.pool)

const { data: tradesData } = useWhaleswapTradesByPool(poolId, {
  limit: '100',
  options: { staleTime: 5000 },
})
const trades = computed(() => tradesData.value?.trades || [])

const coins = computed(() => pool.value?.coins || [])
const coin0 = computed(() => coins.value[0] || null)
const coin1 = computed(() => coins.value[1] || null)

const base = computed(() => {
  if (baseDenom.value && coins.value.some((c) => c.denom === baseDenom.value)) {
    return baseDenom.value
  }
  return coin0.value?.denom || ''
})

const quote = computed(() => {
  if (quoteDenom.value && coins.value.some((c) => c.denom === quoteDenom.value)) {
    return quoteDenom.value
  }
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
  if (base.value === coin0.value?.denom && quote.value === coin1.value?.denom) {
    return p
  }
  if (p === 0) return null
  return 1 / p
})

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

onMounted(async () => {
  await wallet.loadDenomMetadata()
})
</script>

<template>
  <div class="h-[calc(100vh-4rem)] overflow-y-auto md:overflow-hidden">
    <h2 class="text-2xl font-semibold mb-4">Pool #{{ poolId }}</h2>

    <div v-if="poolLoading" class="h-full flex items-center justify-center">
      <div class="text-center text-muted-foreground">Loading pool...</div>
    </div>

    <div v-else-if="poolError" class="h-full flex items-center justify-center">
      <div class="text-center text-destructive">Error: {{ poolError.message }}</div>
    </div>

    <div v-else-if="!pool" class="h-full flex items-center justify-center">
      <div class="text-center text-muted-foreground">Pool not found</div>
    </div>

    <template v-else>
      <ResizablePanelGroup
        :direction="panelDirection"
        class="pool-detail-layout md:h-[calc(100%-3rem)]"
        auto-save-id="pool-detail:main"
      >
        <!-- Left Column -->
        <ResizablePanel :default-size="50" class="pool-detail-panel">
          <div class="h-full flex flex-col overflow-y-auto">
            <!-- Pool Info -->
            <div class="flex-shrink-0 p-4">
              <h3 class="text-lg font-semibold mb-4">Pool Information</h3>
              <div class="space-y-3">
                <div class="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div class="text-muted-foreground">Pool ID:</div>
                  <div class="font-mono">{{ pool.pool_id }}</div>

                  <div class="text-muted-foreground">Reserves:</div>
                  <div class="font-mono">
                    <div v-for="coin in normalizedCoins" :key="coin.denom">
                      {{ coin.displayAmount }} {{ coin.displayDenom }}
                    </div>
                  </div>

                  <div class="text-muted-foreground">Price:</div>
                  <div class="font-mono" v-if="price !== null && isFinite(price)">
                    {{ price.toFixed(6) }} {{ displayQuote }}/{{ displayBase }}
                  </div>
                  <div v-else class="text-muted-foreground">Price unavailable</div>

                  <div class="text-muted-foreground">Fee:</div>
                  <div class="font-mono">
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

                  <div class="text-muted-foreground">Trades:</div>
                  <div class="font-mono">{{ pool.num_trades || '0' }}</div>
                </div>
              </div>
            </div>

            <!-- Swap Panel -->
            <div class="flex-shrink-0">
              <SwapPanel :pool="pool" :base="base" :quote="quote" />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle class="pool-detail-handle" />

        <!-- Right Column -->
        <ResizablePanel :default-size="50" class="pool-detail-panel">
          <ResizablePanelGroup
            direction="vertical"
            class="pool-detail-layout"
            auto-save-id="pool-detail:right"
          >
            <!-- Trade History Chart -->
            <ResizablePanel :default-size="60" class="pool-detail-panel">
              <div class="h-full flex flex-col p-4">
                <h3 class="text-lg font-semibold mb-4">Trade History Chart</h3>
                <div class="flex-1 min-h-[300px]">
                  <TradeHistoryChart
                    v-if="trades.length > 0"
                    :trades="trades"
                    :pool-id="poolId"
                    :base="base"
                    :quote="quote"
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

            <ResizableHandle class="pool-detail-handle" />

            <!-- Trades Table -->
            <ResizablePanel :default-size="40" class="pool-detail-panel">
              <div class="h-full flex flex-col p-4">
                <h3 class="text-lg font-semibold mb-4">Recent Trades</h3>
                <div class="flex-1 overflow-hidden min-h-[300px]">
                  <TradesTable
                    v-if="trades.length > 0"
                    :trades="trades"
                    :pool-id="poolId"
                    :base="base"
                    :quote="quote"
                  />
                  <div v-else class="text-center py-8 text-muted-foreground">No trades found</div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </template>
  </div>
</template>
