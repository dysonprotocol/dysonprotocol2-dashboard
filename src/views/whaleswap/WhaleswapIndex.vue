<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import { useDenomMarketcaps } from '@/whaleswap/composables/useDenomMarketcaps'
import { useDenomMetadata } from '@/whaleswap/composables/useDenomMetadata'
import { DenomMetadata } from '@/orm/models/bank/DenomMetadata'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'

const router = useRouter()

const { data: marketcaps, isLoading, isComputing } = useDenomMarketcaps()
const { resolveDisplayDenom } = useDenomMetadata()

const quoteDisplay = computed(() => resolveDisplayDenom('udys'))

// Ensure DenomMetadata is loaded into Pinia ORM for normalization
onMounted(async () => {
  try {
    await useAxiosRepo(DenomMetadata).api().fetchAll()
  } catch (e) {
    console.warn('[WhaleswapIndex] Failed to load denom metadata:', e)
  }
})

// Access repo reactively so computed updates when metadata loads
const metadataRepo = useRepo(DenomMetadata)

const rows = computed(() => {
  // Access repo.all() reactively inside computed
  const _metadataCheck = metadataRepo.all()

  return (marketcaps.value ?? [])
    .filter((row) => row.status !== 'no_price')
    .map((row, index) => {
      // Normalize price (in base udys units)
      const priceNorm = DenomMetadata.normalize({
        amount: row.price_udys,
        denom: 'udys',
      })

      // Normalize marketcap (in base udys units)
      const marketcapNorm = DenomMetadata.normalize({
        amount: row.marketcap_udys,
        denom: 'udys',
      })

      // Normalize liquidity (in base udys units)
      const liquidityNorm = DenomMetadata.normalize({
        amount: row.liquidity_udys,
        denom: 'udys',
      })

      // Normalize supply (in base denom units)
      const supplyNorm = DenomMetadata.normalize({
        amount: row.supply,
        denom: row.denom,
      })

      // Use normalized display denom, fallback to name if display isn't set
      let displayDenom = supplyNorm.display.denom
      if (displayDenom === row.denom && supplyNorm.metadata?.name) {
        // If display denom equals base denom, try to use name from metadata
        displayDenom = supplyNorm.metadata.name
      }

      return {
        id: `${row.denom}-${row.config_hash}`,
        denom: row.denom,
        display: displayDenom,
        rank: index + 1,
        price: formatDisplayAmount(priceNorm.display.amount),
        priceDenom: priceNorm.display.denom,
        marketcap: formatDisplayAmount(marketcapNorm.display.amount, { notation: 'compact' }),
        marketcapDenom: marketcapNorm.display.denom,
        liquidity: formatDisplayAmount(liquidityNorm.display.amount, { notation: 'compact' }),
        liquidityDenom: liquidityNorm.display.denom,
        supply: formatDisplayAmount(supplyNorm.display.amount),
        supplyDenom: supplyNorm.display.denom,
      }
    })
})

function formatDisplayAmount(value: string, opts?: Intl.NumberFormatOptions) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  const maxDigits = opts?.notation === 'compact' ? 2 : num >= 1 ? 2 : 4
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDigits,
    ...opts,
  }).format(num)
}

function goToTrade(denom: string) {
  router.push({
    path: '/whaleswap/trade',
    query: {
      base: denom,
      quote: quoteDisplay.value,
    },
  })
}
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Whaleswap Markets</CardTitle>
        <CardDescription>
          Sorted by market cap (quoted in {{ quoteDisplay }}). Pools with high fees or thin
          liquidity are filtered out automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Spinner v-if="isComputing" class="h-4 w-4" />
          <span v-if="isComputing">Recomputing market caps…</span>
        </div>
        <div v-if="isLoading" class="flex justify-center py-10">
          <Spinner class="h-6 w-6" />
        </div>
        <div v-else>
          <div v-if="rows.length === 0" class="text-center text-muted-foreground py-10">
            No denoms discovered yet. Ensure pools and supply data are available.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">#</TableHead>
                <TableHead>Denom</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Market Cap</TableHead>
                <TableHead>Liquidity (escrow)</TableHead>
                <TableHead>Supply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in rows"
                :key="row.id"
                class="cursor-pointer hover:bg-muted/50"
                @click="goToTrade(row.denom)"
              >
                <TableCell class="font-medium">{{ row.rank }}</TableCell>
                <TableCell>
                  <div class="flex flex-col">
                    <span class="font-semibold">{{ row.display }}</span>
                    <span class="text-xs text-muted-foreground">{{ row.denom }}</span>
                  </div>
                </TableCell>
                <TableCell>{{ row.price }} {{ row.priceDenom }}</TableCell>
                <TableCell>{{ row.marketcap }} {{ row.marketcapDenom }}</TableCell>
                <TableCell>{{ row.liquidity }} {{ row.liquidityDenom }}</TableCell>
                <TableCell>{{ row.supply }} {{ row.supplyDenom }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
