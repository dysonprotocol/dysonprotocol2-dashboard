<script setup lang="ts">
import { computed } from 'vue'
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

// Parse query params
const baseDenom = computed(() => {
  const base = route.query.base as string
  return base ? metadata.resolveBaseDenom(base) : ''
})

const quoteDenom = computed(() => {
  const quote = route.query.quote as string
  return quote ? metadata.resolveBaseDenom(quote) : ''
})

// Display names
const baseDisplay = computed(() => metadata.resolveDisplayDenom(baseDenom.value))
const quoteDisplay = computed(() => metadata.resolveDisplayDenom(quoteDenom.value))

// Pair ready check
const pairReady = computed(() => Boolean(baseDenom.value && quoteDenom.value))

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
const pools = computed(() => poolsQuery.data.value ?? [])
const offersForward = computed(() => offersQuery.forward.data.value ?? [])
const offersReverse = computed(() => offersQuery.reverse.data.value ?? [])
const auctionsForward = computed(() => auctionsQuery.forward.data.value ?? [])
const auctionsReverse = computed(() => auctionsQuery.reverse.data.value ?? [])

// Loading states
const anyLoading = computed(
  () => poolsQuery.isLoading.value || offersQuery.isLoading.value || auctionsQuery.isLoading.value
)

// Helper functions
function formatDisplayCoin(coin: Coin): string {
  const normalized = metadata.normalize({
    amount: coin.amount,
    denom: coin.denom,
  })
  return `${normalized.display.amount} ${normalized.display.denom}`
}

function poolPrice(poolId: string): string {
  const pool = pools.value.find((p) => p.pool_id === poolId)
  if (!pool || !pool.coins || pool.coins.length !== 2) return 'N/A'

  // Assume coins are ordered as [base, quote] for this pair
  const [coin0, coin1] = pool.coins

  // Calculate price as coin1/coin0 (quote per base)
  const amount0 = parseFloat(coin0.amount)
  const amount1 = parseFloat(coin1.amount)

  if (amount0 === 0) return '∞'

  const price = amount1 / amount0
  return price.toFixed(6)
}

function offerPrice(offer: any): string {
  if (!offer.remaining_have || !offer.remaining_want) return 'N/A'

  const haveAmount = parseFloat(offer.remaining_have.amount)
  const wantAmount = parseFloat(offer.remaining_want.amount)

  if (haveAmount === 0) return '∞'

  const price = wantAmount / haveAmount
  return price.toFixed(6)
}

function swapPair(): void {
  const currentBase = route.query.base as string
  const currentQuote = route.query.quote as string

  router.push({
    path: '/whaleswap/trade',
    query: {
      base: currentQuote,
      quote: currentBase,
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
              Pools, orderbook offers, and auctions referencing the pair {{ baseDenom }} /
              {{ quoteDenom }}.
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
          Provide both base and quote query params, e.g.
          <code>?base=foo.dys&amp;quote=dys2</code>.
        </div>
        <div v-else-if="anyLoading" class="flex items-center gap-2 text-muted-foreground">
          <Spinner class="h-4 w-4" />
          <span>Loading pair data…</span>
        </div>
      </CardContent>
    </Card>

    <Card v-if="pairReady">
      <CardHeader>
        <CardTitle>AMM Pools</CardTitle>
        <CardDescription
          >Pools escrowing both {{ baseDisplay }} and {{ quoteDisplay }}.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <div v-if="pools.length === 0" class="text-muted-foreground text-sm">No pools yet.</div>
        <Table v-else>
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
            <TableRow v-for="pool in pools" :key="pool.pool_id">
              <TableCell class="font-semibold">#{{ pool.pool_id }}</TableCell>
              <TableCell>{{ pool.coins.map(formatDisplayCoin).join(' / ') }}</TableCell>
              <TableCell>{{ poolPrice(pool.pool_id) }}</TableCell>
              <TableCell>{{ pool.num_trades }}</TableCell>
              <TableCell class="text-right">
                <RouterLink :to="`/whaleswap/pools/${pool.pool_id}`">
                  <Button size="sm" variant="outline">View Pool</Button>
                </RouterLink>
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
            No offers currently.
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
            No offers currently.
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
