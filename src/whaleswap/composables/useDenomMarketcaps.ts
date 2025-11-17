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
    queryFn: () => bankClient.totalSupply(),
    staleTime: 5 * 60 * 1000,
  })

  const metricsQuery = useQuery({
    queryKey: whaleswapKeys.metrics(),
    queryFn: () => whaleswapClient.metrics(),
    staleTime: 15_000,
  })

  watchEffect(() => {
    const pools = poolsLive.data.value
    if (!pools || pools.length === 0) return

    const supplies = (supplyQuery.data.value?.supply ?? []).map<DenomSupplyRow>((coin) => ({
      denom: coin.denom,
      amount: coin.amount,
      updated_time: new Date().toISOString(),
    }))

    const metricsRow: ModuleMetricsRow | undefined = metricsQuery.data.value?.metrics
      ? {
          ...metricsQuery.data.value.metrics,
          snapshot_time: new Date().toISOString(),
        }
      : undefined

    isComputing.value = true
    try {
      rowsRef.value = computeDenomMarketcaps({
        pools,
        supplies,
        metrics: metricsRow,
        config: configRef.value,
      })
    } finally {
      isComputing.value = false
    }
  })

  const isLoading = computed(
    () => poolsLive.isLoading.value || supplyQuery.isLoading.value || metricsQuery.isLoading.value
  )

  return {
    data: computed(() => rowsRef.value),
    isLoading,
    isComputing,
    refetch: () => {
      poolsLive.refetch()
      supplyQuery.refetch()
      metricsQuery.refetch()
    },
    config: configRef,
  }
}

