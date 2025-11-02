<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useWhaleswapTradesByTaker,
  useWhaleswapTradesByPool,
  useWhaleswapTradesByOffer,
} from '../composables/useWhaleswapTrades'
import TradeListItem from '../components/TradeListItem.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  filterTaker?: string
}>()

const searchMode = ref<'taker' | 'offer' | 'pool'>('taker')
const takerInput = ref(props.filterTaker || '')
const offerIdInput = ref('')
const poolIdInput = ref('')
const limit = ref('50')
const page = ref(1)

const activeTaker = ref(props.filterTaker || '')
const activeOfferId = ref('')
const activePoolId = ref('')

const offset = computed(() => String((page.value - 1) * parseInt(limit.value || '50', 10)))

const takerQuery = useWhaleswapTradesByTaker(activeTaker, {
  limit,
  offset,
  options: { enabled: computed(() => searchMode.value === 'taker' && !!activeTaker.value) },
})

const offerQuery = useWhaleswapTradesByOffer(activeOfferId, {
  limit,
  offset,
  options: { enabled: computed(() => searchMode.value === 'offer' && !!activeOfferId.value) },
})

const poolQuery = useWhaleswapTradesByPool(activePoolId, {
  limit,
  offset,
  options: { enabled: computed(() => searchMode.value === 'pool' && !!activePoolId.value) },
})

const trades = computed(() => {
  if (searchMode.value === 'taker' && takerQuery.data.value) {
    console.log('[TradesList] taker data:', takerQuery.data.value)
    return takerQuery.data.value.trades || []
  }
  if (searchMode.value === 'offer' && offerQuery.data.value) {
    console.log('[TradesList] offer data:', offerQuery.data.value)
    return offerQuery.data.value.trades || []
  }
  if (searchMode.value === 'pool' && poolQuery.data.value) {
    console.log('[TradesList] pool data:', poolQuery.data.value)
    return poolQuery.data.value.trades || []
  }
  return []
})

const isLoading = computed(
  () => takerQuery.isLoading.value || offerQuery.isLoading.value || poolQuery.isLoading.value
)

const error = computed(
  () => takerQuery.error.value || offerQuery.error.value || poolQuery.error.value
)

function search() {
  page.value = 1 // Reset to first page
  if (takerInput.value) {
    searchMode.value = 'taker'
    activeTaker.value = takerInput.value
    activeOfferId.value = ''
    activePoolId.value = ''
  } else if (offerIdInput.value) {
    searchMode.value = 'offer'
    activeOfferId.value = offerIdInput.value
    activeTaker.value = ''
    activePoolId.value = ''
  } else if (poolIdInput.value) {
    searchMode.value = 'pool'
    activePoolId.value = poolIdInput.value
    activeTaker.value = ''
    activeOfferId.value = ''
  }
}

function clear() {
  takerInput.value = ''
  offerIdInput.value = ''
  poolIdInput.value = ''
  activeTaker.value = ''
  activeOfferId.value = ''
  activePoolId.value = ''
  page.value = 1
}

function nextPage() {
  page.value++
}

function prevPage() {
  if (page.value > 1) page.value--
}

const totalPages = computed(() => {
  const total = parseInt(
    (searchMode.value === 'taker'
      ? takerQuery.data.value?.pagination?.total
      : searchMode.value === 'offer'
        ? offerQuery.data.value?.pagination?.total
        : poolQuery.data.value?.pagination?.total) || '0',
    10
  )
  const lim = parseInt(limit.value || '50', 10)
  return Math.ceil(total / lim) || 1
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Whaleswap Trades</h2>
      <div class="text-xs text-muted-foreground">⚡ Auto-cached (5s stale time)</div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Filter Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-4">
          <div class="space-y-2">
            <Label for="taker">Taker Address</Label>
            <Input
              id="taker"
              v-model="takerInput"
              placeholder="dys1..."
              class="font-mono text-sm"
            />
          </div>
          <div class="space-y-2">
            <Label for="offer">Offer ID</Label>
            <Input id="offer" v-model="offerIdInput" placeholder="123" class="font-mono text-sm" />
          </div>
          <div class="space-y-2">
            <Label for="pool">Pool ID</Label>
            <Input id="pool" v-model="poolIdInput" placeholder="456" class="font-mono text-sm" />
          </div>
          <div class="flex items-end gap-2">
            <Button @click="search" class="flex-1">Search</Button>
            <Button @click="clear" variant="outline">Clear</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4">
        <div v-if="isLoading" class="text-center py-8 text-muted-foreground">Loading trades...</div>
        <div v-else-if="error" class="text-center py-8 text-destructive">
          Error: {{ error.message }}
        </div>
        <div v-else-if="trades.length === 0" class="text-center py-8 text-muted-foreground">
          No trades found. Try searching by taker, offer ID, or pool ID.
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <div class="text-muted-foreground">
              Showing {{ trades.length }} trade(s), newest first (server-sorted)
            </div>
            <div class="flex items-center gap-2">
              <Label for="limit" class="text-xs">Per page:</Label>
              <Input
                id="limit"
                v-model="limit"
                type="number"
                min="10"
                max="100"
                class="w-20 h-8 text-sm"
              />
            </div>
          </div>

          <div class="space-y-2">
            <TradeListItem v-for="trade in trades" :key="trade.trade_id" :trade="trade" />
          </div>

          <div class="flex items-center justify-between pt-3 border-t">
            <div class="text-sm text-muted-foreground">Page {{ page }} of {{ totalPages }}</div>
            <div class="flex gap-2">
              <Button @click="prevPage" :disabled="page === 1" variant="outline" size="sm">
                Previous
              </Button>
              <Button @click="nextPage" :disabled="page >= totalPages" variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
