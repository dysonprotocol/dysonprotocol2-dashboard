import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { useWhaleswapClient, type OfferResponse, type OffersResponse } from './useWhaleswapClient'
import { whaleswapKeys } from '../utils/queryKeys'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, computed } from 'vue'
import type { OfferData } from '../utils/types'

export function useWhaleswapOffer(
  offerId: MaybeRefOrGetter<string | bigint>,
  options?: Partial<UseQueryOptions<OfferResponse>>
) {
  const client = useWhaleswapClient()
  const offerIdVal = computed(() => String(toValue(offerId)))

  return useQuery({
    queryKey: whaleswapKeys.offer(offerIdVal.value),
    queryFn: async () => {
      return await client.offer({ offerId: offerIdVal.value })
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

export function useWhaleswapPairOffers(
  baseDenom: MaybeRefOrGetter<string>,
  quoteDenom: MaybeRefOrGetter<string>,
  options?: Partial<UseQueryOptions<OfferData[]>>
) {
  const client = useWhaleswapClient()
  const baseDenomVal = computed(() => toValue(baseDenom))
  const quoteDenomVal = computed(() => toValue(quoteDenom))

  // Forward offers: base (have) -> quote (want)
  const forwardQuery = useQuery({
    queryKey: whaleswapKeys.offersBest(baseDenomVal.value, quoteDenomVal.value),
    queryFn: async () => {
      const result = await client.offersBest({
        haveDenom: baseDenomVal.value,
        wantDenom: quoteDenomVal.value,
      })
      return result.offers
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    enabled: computed(() => Boolean(baseDenomVal.value && quoteDenomVal.value)),
    ...options,
  })

  // Reverse offers: quote (have) -> base (want)
  const reverseQuery = useQuery({
    queryKey: whaleswapKeys.offersBest(quoteDenomVal.value, baseDenomVal.value),
    queryFn: async () => {
      const result = await client.offersBest({
        haveDenom: quoteDenomVal.value,
        wantDenom: baseDenomVal.value,
      })
      return result.offers
    },
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    enabled: computed(() => Boolean(baseDenomVal.value && quoteDenomVal.value)),
    ...options,
  })

  return {
    forward: forwardQuery,
    reverse: reverseQuery,
    isLoading: computed(() => forwardQuery.isLoading.value || reverseQuery.isLoading.value),
    error: computed(() => forwardQuery.error.value || reverseQuery.error.value),
  }
}
