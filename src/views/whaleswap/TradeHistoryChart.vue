<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import type { Trade } from '@/whaleswap/utils/types'
import { useChartTheme } from '@/composables/useChartTheme'

const props = defineProps<{
  trades: Trade[]
  poolId: string
  base: string
  quote: string
  displayBase?: string
  displayQuote?: string
  currentPrice?: number | null
}>()

const chartContainerRef = ref<HTMLDivElement | null>(null)
const interval = ref<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('1m')

const { chartOptions, seriesColors, isDark } = useChartTheme()

let chart: any = null
let series: any = null
let resizeObserver: ResizeObserver | null = null

console.log('[TradeHistoryChart] trades:', props.trades.length)
console.log('[TradeHistoryChart] poolId:', props.poolId)
console.log('[TradeHistoryChart] base:', props.base, 'quote:', props.quote)

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
}

const rawPriceData = computed(() => {
  const data: Array<{ time: number; price: number }> = []

  for (const trade of props.trades) {
    if (!trade.operations || !trade.timestamp || !trade.trade_id) continue

    for (const op of trade.operations) {
      if (!op.swap || String(op.swap.pool_id) !== String(props.poolId)) continue
      if (!op.sent || !op.received) continue

      const sentDenom = op.sent.denom
      const receivedDenom = op.received.denom
      const sentAmount = BigInt(op.sent.amount)
      const receivedAmount = BigInt(op.received.amount)

      if (sentAmount === 0n || receivedAmount === 0n) continue

      let price: number | null = null

      if (sentDenom === props.base && receivedDenom === props.quote) {
        price = Number(receivedAmount) / Number(sentAmount)
      } else if (sentDenom === props.quote && receivedDenom === props.base) {
        price = Number(sentAmount) / Number(receivedAmount)
      }

      if (price !== null && isFinite(price) && price > 0) {
        const baseTime = new Date(trade.timestamp).getTime() / 1000
        const tradeIdMs = (Number(trade.trade_id) % 1000) / 1000
        data.push({ time: baseTime + tradeIdMs, price })
      }
    }
  }

  data.sort((a, b) => a.time - b.time)
  console.log('[TradeHistoryChart] raw price points:', data.length)
  return data
})

function aggregateToCandles(data: Array<{ time: number; price: number }>, intervalSec: number) {
  const buckets = new Map<number, { open: number; high: number; low: number; close: number }>()

  for (const point of data) {
    const bucketTime = Math.floor(point.time / intervalSec) * intervalSec
    const candle = buckets.get(bucketTime)

    if (!candle) {
      buckets.set(bucketTime, {
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
      })
    } else {
      candle.high = Math.max(candle.high, point.price)
      candle.low = Math.min(candle.low, point.price)
      candle.close = point.price
    }
  }

  const result = Array.from(buckets.entries()).map(([time, ohlc]) => ({
    time,
    ...ohlc,
  }))

  console.log('[TradeHistoryChart] aggregated candles:', result.length)
  return result
}

const chartData = computed(() => {
  const raw = rawPriceData.value
  const intervalSec = INTERVAL_SECONDS[interval.value]
  console.log('[TradeHistoryChart] aggregating to', interval.value, 'candles')
  return aggregateToCandles(raw, intervalSec)
})

function createSeries() {
  if (!chart) return

  if (series) {
    chart.removeSeries(series)
    series = null
  }

  console.log('[TradeHistoryChart] Creating candlestick series')

  const colors = seriesColors.value

  series = chart.addSeries(CandlestickSeries, {
    upColor: colors.upColor,
    downColor: colors.downColor,
    borderVisible: false,
    wickUpColor: colors.wickUpColor,
    wickDownColor: colors.wickDownColor,
    priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
  })

  console.log('[TradeHistoryChart] Series created')
}

async function initChart() {
  if (!chartContainerRef.value) return

  await nextTick()

  if (chartContainerRef.value.clientWidth === 0) {
    setTimeout(() => initChart(), 100)
    return
  }

  console.log('[TradeHistoryChart] Initializing chart')
  console.log('[TradeHistoryChart] Container:', chartContainerRef.value)
  console.log('[TradeHistoryChart] Container width:', chartContainerRef.value.clientWidth)

  const width = chartContainerRef.value.clientWidth || 800
  const height = chartContainerRef.value.clientHeight || 400

  chart = createChart(chartContainerRef.value, {
    ...chartOptions.value,
    width,
    height,
    localization: {
      priceFormatter: (price: number) => price.toFixed(6),
    },
    timeScale: {
      ...chartOptions.value.timeScale,
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true,
    },
  })

  console.log('[TradeHistoryChart] Chart created:', chart)

  createSeries()
  updateChart()
}

function updateChart() {
  if (!series || !chart) return

  const data = chartData.value
  console.log('[TradeHistoryChart] Updating chart with', data.length, 'points')

  if (data.length === 0) return

  series.setData(data)
  chart.timeScale().fitContent()
}

function handleResize() {
  if (!chart || !chartContainerRef.value) return
  const width = chartContainerRef.value.clientWidth
  const height = chartContainerRef.value.clientHeight
  if (width > 0 && height > 0) {
    chart.applyOptions({ width, height })
  }
}

onMounted(async () => {
  console.log('[TradeHistoryChart] Mounted')
  await initChart()

  await nextTick()

  if (chartContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(chartContainerRef.value)
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  console.log('[TradeHistoryChart] Unmounting')
  window.removeEventListener('resize', handleResize)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (chart) {
    chart.remove()
    chart = null
    series = null
  }
})

watch(interval, () => {
  console.log('[TradeHistoryChart] interval changed to:', interval.value)
  updateChart()
})

watch(
  chartData,
  () => {
    console.log('[TradeHistoryChart] chartData changed')
    updateChart()
  },
  { deep: true }
)

watch(isDark, () => {
  console.log('[TradeHistoryChart] theme changed to:', isDark.value ? 'dark' : 'light')
  if (chart) {
    chart.applyOptions(chartOptions.value)
  }
  if (series) {
    const colors = seriesColors.value
    series.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    })
  }
})
</script>

<template>
  <div class="flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <h3 class="text-lg font-semibold">Pool: {{ poolId }}</h3>

        <div
          v-if="currentPrice !== null && currentPrice !== undefined && isFinite(currentPrice)"
          class="text-lg font-bold"
        >
          {{ currentPrice.toFixed(6) }} {{ displayQuote }}
          <span class="font-extrabold">/</span>
          {{ displayBase }}
        </div>
        <div v-else class="text-muted-foreground">Price data unavailable</div>
      </div>

      <div class="flex gap-1 border border-border rounded-md p-1">
        <button
          v-for="int in ['1m', '5m', '15m', '1h', '4h', '1d']"
          :key="int"
          type="button"
          class="px-3 py-1 rounded text-sm transition"
          :class="
            interval === int
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="interval = int as any"
        >
          {{ int }}
        </button>
      </div>
    </div>

    <div ref="chartContainerRef" class="flex-1 min-h-0"></div>
  </div>
</template>
