import { computed } from 'vue'
import { useAppColorMode } from './useAppColorMode'
import type { DeepPartial, ChartOptions } from 'lightweight-charts'

export function useChartTheme() {
  const { isDark } = useAppColorMode()

  const chartOptions = computed<DeepPartial<ChartOptions>>(() => {
    if (isDark.value) {
      return {
        layout: {
          background: { color: 'transparent' },
          textColor: '#e5e5e5',
        },
        grid: {
          vertLines: { color: '#2e2e2e' },
          horzLines: { color: '#2e2e2e' },
        },
        timeScale: {
          borderColor: '#444444',
        },
        rightPriceScale: {
          borderColor: '#444444',
        },
      }
    }

    return {
      layout: {
        background: { color: 'transparent' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      timeScale: {
        borderColor: '#cccccc',
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
    }
  })

  const seriesColors = computed(() => {
    if (isDark.value) {
      return {
        upColor: '#26a69a',
        downColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        lineColor: '#2962ff',
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
      }
    }

    return {
      upColor: '#089981',
      downColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
      lineColor: '#2962ff',
      topColor: 'rgba(41, 98, 255, 0.28)',
      bottomColor: 'rgba(41, 98, 255, 0.0)',
    }
  })

  return {
    chartOptions,
    seriesColors,
    isDark,
  }
}
