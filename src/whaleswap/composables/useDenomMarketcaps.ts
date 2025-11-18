import { ref, computed, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { whaleswapKeys } from '../utils/queryKeys'
import { useWhaleswapClient } from './useWhaleswapClient'
import { useCosmosBankClient } from './useCosmosBankClient'
import { useWhaleswapPoolsLive } from './useWhaleswapPool'
import {
  computeDenomMarketcaps,
  defaultMarketcapConfig,
  type MarketcapConfig,
} from '../utils/marketcap'
import type { DenomSupplyRow, ModuleMetricsRow, DenomMarketcapRow } from './useWhaleswapDB'

export type UseDenomMarketcapsOptions = {
  config?: MaybeRefOrGetter<Partial<MarketcapConfig>>
}

export function useDenomMarketcaps(options?: UseDenomMarketcapsOptions) {
  console.log('[useDenomMarketcaps] Initializing composable')

  const configRef = computed<MarketcapConfig>(() => ({
    ...defaultMarketcapConfig,
    ...(toValue(options?.config) ?? {}),
  }))

  const poolsLive = useWhaleswapPoolsLive()
  const whaleswapClient = useWhaleswapClient()
  const bankClient = useCosmosBankClient()

  const rowsRef = ref<DenomMarketcapRow[]>([])
  const isComputing = ref(false)

  const supplyQuery = useQuery({
    queryKey: ['cosmos', 'bank', 'total-supply'],
    queryFn: () => {
      console.log('[useDenomMarketcaps] Fetching supply data')
      return bankClient.totalSupply()
    },
    staleTime: 5 * 60 * 1000,
  })

  const metricsQuery = useQuery({
    queryKey: whaleswapKeys.metrics(),
    queryFn: () => {
      console.log('[useDenomMarketcaps] Fetching metrics data')
      return whaleswapClient.metrics()
    },
    staleTime: 15_000,
  })

  watchEffect(() => {
    console.log('[useDenomMarketcaps] watchEffect triggered')
    const pools = poolsLive.data.value
    console.log('[useDenomMarketcaps] watchEffect: pools data', {
      poolsLength: pools?.length ?? 0,
      poolsLoading: poolsLive.isLoading.value,
      poolsError: poolsLive.error.value,
    })

    if (!pools || pools.length === 0) {
      console.log('[useDenomMarketcaps] watchEffect: No pools available, skipping computation')
      return
    }

    const supplies = (supplyQuery.data.value?.supply ?? []).map<DenomSupplyRow>((coin) => ({
      denom: coin.denom,
      amount: coin.amount,
      updated_time: new Date().toISOString(),
    }))
    console.log('[useDenomMarketcaps] watchEffect: supplies data', {
      suppliesLength: supplies.length,
      suppliesLoading: supplyQuery.isLoading.value,
      suppliesError: supplyQuery.error.value,
    })

    const metricsRow: ModuleMetricsRow | undefined = metricsQuery.data.value?.metrics
      ? {
          ...metricsQuery.data.value.metrics,
          snapshot_time: new Date().toISOString(),
        }
      : undefined
    console.log('[useDenomMarketcaps] watchEffect: metrics data', {
      hasMetrics: Boolean(metricsRow),
      metricsLoading: metricsQuery.isLoading.value,
      metricsError: metricsQuery.error.value,
      metricsData: metricsQuery.data.value,
    })

    console.log('[useDenomMarketcaps] watchEffect: Starting marketcap computation')
    isComputing.value = true
    try {
      const result = computeDenomMarketcaps({
        pools,
        supplies,
        metrics: metricsRow,
        config: configRef.value,
      })
      console.log('[useDenomMarketcaps] watchEffect: Marketcap computation complete', {
        resultLength: result.length,
        resultSample: result.slice(0, 3),
        config: configRef.value,
      })
      rowsRef.value = result
    } finally {
      isComputing.value = false
    }
  })

  const isLoading = computed(
    () => poolsLive.isLoading.value || supplyQuery.isLoading.value || metricsQuery.isLoading.value
  )

  const dataComputed = computed(() => {
    const result = rowsRef.value
    console.log('[useDenomMarketcaps] data computed:', {
      rowsLength: result.length,
      rowsSample: result.slice(0, 2),
      isComputing: isComputing.value,
      isLoading: isLoading.value,
    })
    return result
  })

  return {
    data: dataComputed,
    isLoading,
    isComputing,
    refetch: () => {
      console.log('[useDenomMarketcaps] Manual refetch triggered')
      poolsLive.refetch()
      supplyQuery.refetch()
      metricsQuery.refetch()
    },
    config: configRef,
  }
}
