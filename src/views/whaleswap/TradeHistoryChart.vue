<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'
import type { Trade } from '@/whaleswap/utils/types'

const props = defineProps<{
  trades: Trade[]
  poolId: string
  base: string
  quote: string
}>()

const chartContainerRef = ref<HTMLDivElement | null>(null)
let chart: any = null
let series: any = null
let resizeObserver: ResizeObserver | null = null

console.log('[TradeHistoryChart] trades:', props.trades.length)
console.log('[TradeHistoryChart] poolId:', props.poolId)
console.log('[TradeHistoryChart] base:', props.base, 'quote:', props.quote)

const chartData = computed(() => {
  const data: Array<{ time: number; value: number }> = []

  for (const trade of props.trades) {
    if (!trade.operations || !trade.timestamp) continue

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
        const timestamp = new Date(trade.timestamp).getTime() / 1000
        data.push({ time: timestamp, value: price })
      }
    }
  }

  data.sort((a, b) => a.time - b.time)
  console.log('[TradeHistoryChart] chartData points:', data.length)
  return data
})

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

  try {
    const width = chartContainerRef.value.clientWidth || 800
    const height = chartContainerRef.value.clientHeight || 400
    
    chart = createChart(chartContainerRef.value, {
      layout: {
        background: { type: ColorType.Transparent },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      width,
      height,
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    console.log('[TradeHistoryChart] Chart created:', chart)

    series = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
    })
    console.log('[TradeHistoryChart] Series created:', series)
    updateChart()
  } catch (e) {
    console.error('[TradeHistoryChart] Error initializing chart:', e)
  }
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
  }
})

watch(chartData, () => {
  console.log('[TradeHistoryChart] chartData changed')
  updateChart()
}, { deep: true })
</script>

<template>
  <div ref="chartContainerRef" class="w-full h-full"></div>
</template>

