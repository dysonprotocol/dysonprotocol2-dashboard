<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWhaleswapPairPools } from '@/whaleswap/composables/useWhaleswapPool'
import { useWhaleswapPairOffers } from '@/whaleswap/composables/useWhaleswapOffer'
import { useWhaleswapPairAuctions } from '@/whaleswap/composables/useWhaleswapAuction'
import { useDenomMetadata } from '@/whaleswap/composables/useDenomMetadata'
import type { Coin } from '@/whaleswap/utils/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const router = useRouter()
const metadata = useDenomMetadata()

// Reactive refs for route parameters - updated when route changes
const baseParam = ref('')
const quoteParam = ref('')

// Watch individual query params for reliable reactivity during navigation
watch(
  () => route.query.base,
  (base) => {
    baseParam.value = (base as string) || ''
  },
  { immediate: true }
)

watch(
  () => route.query.quote,
  (quote) => {
    quoteParam.value = (quote as string) || ''
  },
  { immediate: true }
)

// Resolve to base denoms for internal use (API calls, etc.)
const baseDenom = computed(() => {
  return baseParam.value ? metadata.resolveBaseDenom(baseParam.value) : ''
})

const quoteDenom = computed(() => {
  return quoteParam.value ? metadata.resolveBaseDenom(quoteParam.value) : ''
})

// Display names
const baseDisplay = computed(() => {
  const base = baseDenom.value
  return metadata.resolveDisplayDenom(base)
})

const quoteDisplay = computed(() => {
  const base = quoteDenom.value
  return metadata.resolveDisplayDenom(base)
})

// Pair ready check
const pairReady = computed(() => {
  const hasMetadata =
    !metadata.isLoading.value && metadata.data.value && metadata.data.value.length > 0
  const hasDenoms = Boolean(baseParam.value && quoteParam.value)
  return hasMetadata && hasDenoms
})

// Data fetching
const poolsQuery = useWhaleswapPairPools(baseDenom, quoteDenom, {
  enabled: pairReady,
})
const offersQuery = useWhaleswapPairOffers(baseDenom, quoteDenom, {
  enabled: pairReady,
})
const auctionsQuery = useWhaleswapPairAuctions(baseDenom, quoteDenom, {
  enabled: pairReady,
})

// Computed data
const pools = computed(() => {
  const result = poolsQuery.data.value ?? []
  console.log('[pools] computed:', {
    length: result.length,
    isLoading: poolsQuery.isLoading.value,
    hasError: poolsQuery.isError.value,
  })
  return result
})
const offersForward = computed(() => {
  const result = offersQuery.forward.data.value ?? []
  console.log('[offersForward] computed:', {
    length: result.length,
    isLoading: offersQuery.isLoading.value,
  })
  return result
})
const offersReverse = computed(() => {
  const result = offersQuery.reverse.data.value ?? []
  console.log('[offersReverse] computed:', {
    length: result.length,
    isLoading: offersQuery.isLoading.value,
  })
  return result
})
const auctionsForward = computed(() => {
  const result = auctionsQuery.forward.data.value ?? []
  console.log('[auctionsForward] computed:', {
    length: result.length,
    isLoading: auctionsQuery.isLoading.value,
  })
  return result
})
const auctionsReverse = computed(() => {
  const result = auctionsQuery.reverse.data.value ?? []
  console.log('[auctionsReverse] computed:', {
    length: result.length,
    isLoading: auctionsQuery.isLoading.value,
  })
  return result
})

// Reactive state
const hasPools = computed(() => {
  const result = pools.value.length > 0
  console.log('[hasPools] computed:', {
    result,
    poolsLength: pools.value.length,
    poolsQueryData: poolsQuery.data.value,
  })
  return result
})

// Computed pool prices for current pair (reactive)
const poolPrices = computed(() => {
  const prices: Record<string, string> = {}

  for (const pool of pools.value) {
    const poolId = pool.pool_id.toString()

    if (!pool || !pool.coins || pool.coins.length !== 2) {
      prices[poolId] = 'N/A'
      continue
    }

    const [coinA, coinB] = pool.coins

    // Find which coin corresponds to base vs quote for current pair
    const baseCoin = coinA.denom === baseDenom.value ? coinA : coinB
    const quoteCoin = coinA.denom === quoteDenom.value ? coinA : coinB

    // Normalize amounts
    const normalizedBase = metadata.normalize({
      amount: baseCoin.amount,
      denom: baseCoin.denom,
    })
    const normalizedQuote = metadata.normalize({
      amount: quoteCoin.amount,
      denom: quoteCoin.denom,
    })

    const baseAmount = parseFloat(normalizedBase.display.amount)
    const quoteAmount = parseFloat(normalizedQuote.display.amount)

    if (baseAmount === 0) {
      prices[poolId] = '∞'
    } else {
      const price = quoteAmount / baseAmount
      prices[poolId] = price.toFixed(6)
    }
  }

  return prices
})

// Helper functions
function formatDisplayCoin(coin: Coin): string {
  const normalized = metadata.normalize({
    amount: coin.amount,
    denom: coin.denom,
  })
  return `${normalized.display.amount} ${normalized.display.denom}`
}

function poolPrice(poolId: string): string {
  return poolPrices.value[poolId] || 'N/A'
}

function offerPrice(offer: any): string {
  if (!offer.remaining_have || !offer.remaining_want) return 'N/A'

  // Normalize to display amounts before calculating price
  const normalizedHave = metadata.normalize({
    amount: offer.remaining_have.amount,
    denom: offer.remaining_have.denom,
  })
  const normalizedWant = metadata.normalize({
    amount: offer.remaining_want.amount,
    denom: offer.remaining_want.denom,
  })

  const haveAmount = parseFloat(normalizedHave.display.amount)
  const wantAmount = parseFloat(normalizedWant.display.amount)

  if (haveAmount === 0) return '∞'

  const price = wantAmount / haveAmount
  return price.toFixed(6)
}

function swapPair(): void {
  router.replace({
    path: '/whaleswap/trade',
    query: {
      base: quoteParam.value,
      quote: baseParam.value,
    },
  })
}
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{{ baseDisplay }} / {{ quoteDisplay }}</CardTitle>
            <CardDescription>
              Pools, orderbook offers, and auctions for the {{ baseDisplay }} /
              {{ quoteDisplay }} trading pair.
            </CardDescription>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="swapPair">Swap Pair</Button>
            <RouterLink to="/whaleswap">
              <Button variant="secondary">Back to Markets</Button>
            </RouterLink>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!pairReady" class="text-muted-foreground">
          Provide both base and quote query params with display denoms, e.g.
          <code>?base=FOO&amp;quote=DYS</code>.
        </div>
        <div
          v-else-if="poolsQuery.isLoading.value"
          class="flex items-center gap-2 text-muted-foreground"
        >
          <Spinner class="h-4 w-4" />
          <span>Loading pools…</span>
        </div>
      </CardContent>
    </Card>

    <Card v-if="hasPools">
      <CardHeader>
        <CardTitle>AMM Pools</CardTitle>
        <CardDescription
          >Pools containing both {{ baseDisplay }} and {{ quoteDisplay }}.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pool</TableHead>
              <TableHead>Liquidity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Trades</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="pool in pools"
              :key="pool.pool_id"
              class="cursor-pointer hover:bg-muted/50"
              @click="
                router.replace(
                  `/whaleswap/pools/${pool.pool_id}?base=${baseDisplay}&quote=${quoteDisplay}`
                )
              "
            >
              <TableCell class="font-semibold">#{{ pool.pool_id }}</TableCell>
              <TableCell>{{ pool.coins.map(formatDisplayCoin).join(' / ') }}</TableCell>
              <TableCell>{{ poolPrice(pool.pool_id) }}</TableCell>
              <TableCell>{{ pool.num_trades }}</TableCell>
              <TableCell class="text-right">
                <span class="text-muted-foreground text-sm">Click to view</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div class="grid gap-6 md:grid-cols-2" v-if="pairReady">
      <Card>
        <CardHeader>
          <CardTitle>Offers (Sell {{ baseDisplay }})</CardTitle>
          <CardDescription>
            Makers selling {{ baseDisplay }} for {{ quoteDisplay }}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="offersForward.length === 0" class="text-sm text-muted-foreground">
            No offers yet.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Price ({{ quoteDisplay }})</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="offer in offersForward" :key="offer.offer_id">
                <TableCell>#{{ offer.offer_id }}</TableCell>
                <TableCell>
                  {{ formatDisplayCoin(offer.remaining_have) }} →
                  {{ formatDisplayCoin(offer.remaining_want) }}
                </TableCell>
                <TableCell>{{ offerPrice(offer) }}</TableCell>
                <TableCell class="text-right">
                  <RouterLink :to="`/whaleswap/offers/${offer.offer_id}`">
                    <Button variant="outline" size="sm">View</Button>
                  </RouterLink>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offers (Sell {{ quoteDisplay }})</CardTitle>
          <CardDescription>
            Makers selling {{ quoteDisplay }} for {{ baseDisplay }}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="offersReverse.length === 0" class="text-sm text-muted-foreground">
            No offers yet.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Price ({{ baseDisplay }})</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="offer in offersReverse" :key="offer.offer_id">
                <TableCell>#{{ offer.offer_id }}</TableCell>
                <TableCell>
                  {{ formatDisplayCoin(offer.remaining_have) }} →
                  {{ formatDisplayCoin(offer.remaining_want) }}
                </TableCell>
                <TableCell>{{ offerPrice(offer) }}</TableCell>
                <TableCell class="text-right">
                  <RouterLink :to="`/whaleswap/offers/${offer.offer_id}`">
                    <Button variant="outline" size="sm">View</Button>
                  </RouterLink>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 md:grid-cols-2" v-if="pairReady">
      <Card>
        <CardHeader>
          <CardTitle>Auctions (Sell {{ baseDisplay }})</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="auctionsForward.length === 0" class="text-sm text-muted-foreground">
            No auctions yet.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sell</TableHead>
                <TableHead>Bid Denom</TableHead>
                <TableHead>Seller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="auction in auctionsForward" :key="auction.auction_id">
                <TableCell>#{{ auction.auction_id }}</TableCell>
                <TableCell>{{ formatDisplayCoin(auction.sell) }}</TableCell>
                <TableCell>{{ metadata.resolveDisplayDenom(auction.bid_denom) }}</TableCell>
                <TableCell>
                  <Badge variant="outline">{{ auction.seller }}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auctions (Sell {{ quoteDisplay }})</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="auctionsReverse.length === 0" class="text-sm text-muted-foreground">
            No auctions yet.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sell</TableHead>
                <TableHead>Bid Denom</TableHead>
                <TableHead>Seller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="auction in auctionsReverse" :key="auction.auction_id">
                <TableCell>#{{ auction.auction_id }}</TableCell>
                <TableCell>{{ formatDisplayCoin(auction.sell) }}</TableCell>
                <TableCell>{{ metadata.resolveDisplayDenom(auction.bid_denom) }}</TableCell>
                <TableCell>
                  <Badge variant="outline">{{ auction.seller }}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
