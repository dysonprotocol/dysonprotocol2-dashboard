<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Whaleswap gRPC Pair Queries Demo
      </h1>
      <p class="text-gray-600 dark:text-gray-300 mb-6">
        Query Whaleswap data by trading pair using gRPC and the ts-client. This demonstrates how to
        fetch pools, offers, and auctions for specific trading pairs.
      </p>

      <!-- Connection Status -->
      <div class="mb-6 p-4 rounded-lg border" :class="connectionStatus.class">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full mr-3" :class="connectionStatus.dotClass"></div>
          <div>
            <h3 class="font-medium">{{ connectionStatus.title }}</h3>
            <p class="text-sm opacity-80">{{ connectionStatus.message }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pair Selection -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
    >
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Trading Pair</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base Denom
          </label>
          <input
            v-model="baseDenom"
            type="text"
            placeholder="e.g., foo.dys"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quote Denom
          </label>
          <input
            v-model="quoteDenom"
            type="text"
            placeholder="e.g., bar.dys"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>

    <!-- Query Actions -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
    >
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Query Actions</h2>

      <!-- Price Range Inputs (for offers and auctions) -->
      <div v-if="showPriceRange" class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">
          Price Range (optional)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Price
            </label>
            <input
              v-model="minPrice"
              type="text"
              placeholder="e.g., 0.9"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Price
            </label>
            <input
              v-model="maxPrice"
              type="text"
              placeholder="e.g., 1.1"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          @click="queryPoolsByPair"
          :disabled="isLoading || !baseDenom || !quoteDenom || !isConnected"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Querying...
          </span>
          <span v-else>Query Pools</span>
        </button>

        <button
          @click="queryBestOffers"
          :disabled="isLoading || !baseDenom || !quoteDenom || !isConnected"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Querying...
          </span>
          <span v-else>Best Offers (Top 10)</span>
        </button>

        <button
          @click="queryOffersByPriceRange"
          :disabled="isLoading || !baseDenom || !quoteDenom || !isConnected"
          class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Querying...
          </span>
          <span v-else>Offers by Price Range</span>
        </button>

        <button
          @click="queryAuctionsByPriceRange"
          :disabled="isLoading || !baseDenom || !quoteDenom || !isConnected"
          class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Querying...
          </span>
          <span v-else>Auctions by Price Range</span>
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 text-red-500 mr-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 class="text-red-800 dark:text-red-200 font-medium">Query Error</h3>
          <p class="text-red-700 dark:text-red-300 text-sm">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Results Display -->
    <div
      v-if="results"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Results - {{ results.title }}
        </h2>
        <button
          @click="clearResults"
          class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
      </div>

      <!-- Pools Results -->
      <div v-if="results.type === 'pools'" class="space-y-4">
        <div
          v-if="results.data.length === 0"
          class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          No pools found for this pair.
        </div>
        <div v-else class="grid gap-4">
          <div
            v-for="pool in results.data"
            :key="pool.poolId"
            class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <span class="font-semibold text-gray-900 dark:text-white"
                  >Pool #{{ pool.poolId }}</span
                >
                <span class="ml-2 text-sm text-gray-500 dark:text-gray-400"
                  >{{ pool.feePct }}% fee</span
                >
              </div>
              <div class="text-right text-sm text-gray-500 dark:text-gray-400">
                <div>Block: {{ pool.blockHeight }}</div>
                <div>{{ formatDate(pool.created) }}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-3">
              <div
                v-for="coin in pool.coins"
                :key="coin.denom"
                class="bg-gray-50 dark:bg-gray-700 p-3 rounded"
              >
                <div class="text-sm text-gray-600 dark:text-gray-400">{{ coin.denom }}</div>
                <div class="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formatNumber(coin.amount) }}
                </div>
              </div>
            </div>

            <div
              v-if="pool.feesEarned && pool.feesEarned.length > 0"
              class="pt-3 border-t border-gray-200 dark:border-gray-600"
            >
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fees Earned
              </div>
              <div class="flex gap-2">
                <div
                  v-for="fee in pool.feesEarned"
                  :key="fee.denom"
                  class="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded"
                >
                  {{ formatNumber(fee.amount) }} {{ fee.denom }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Offers Results -->
      <div v-if="results.type === 'offers'" class="space-y-4">
        <div
          v-if="results.data.length === 0"
          class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          No offers found for this pair.
        </div>
        <div v-else class="grid gap-4">
          <div
            v-for="offer in results.data"
            :key="offer.offerId"
            class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <span class="font-semibold text-gray-900 dark:text-white"
                  >Offer #{{ offer.offerId }}</span
                >
                <span
                  class="ml-2 px-2 py-1 text-xs rounded"
                  :class="getStatusBadgeClass(offer.status)"
                >
                  {{ offer.status }}
                </span>
              </div>
              <div class="text-right text-sm text-gray-500 dark:text-gray-400">
                <div>Units: {{ offer.remainingUnits }}</div>
                <div>Block: {{ offer.updatedHeight }}</div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium">Have</div>
                <div class="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formatNumber(offer.initialHave.amount) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  {{ offer.initialHave.denom }}
                </div>
              </div>
              <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <div class="text-sm text-green-600 dark:text-green-400 font-medium">Want</div>
                <div class="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formatNumber(offer.initialWant.amount) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  {{ offer.initialWant.denom }}
                </div>
              </div>
            </div>

            <div class="text-sm text-gray-600 dark:text-gray-400">
              Maker:
              <code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{{
                offer.maker
              }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Auctions Results -->
      <div v-if="results.type === 'auctions'" class="space-y-4">
        <div
          v-if="results.data.length === 0"
          class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          No auctions found for this pair.
        </div>
        <div v-else class="grid gap-4">
          <div
            v-for="auction in results.data"
            :key="auction.auctionId"
            class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <span class="font-semibold text-gray-900 dark:text-white"
                  >Auction #{{ auction.auctionId }}</span
                >
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">NFT: {{ auction.nftId }}</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                <div class="text-sm text-orange-600 dark:text-orange-400 font-medium">Selling</div>
                <div class="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formatNumber(auction.sell.amount) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">{{ auction.sell.denom }}</div>
              </div>
              <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                <div class="text-sm text-purple-600 dark:text-purple-400 font-medium">
                  Bid Denom
                </div>
                <div class="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {{ auction.bidDenom }}
                </div>
              </div>
            </div>

            <div class="text-sm text-gray-600 dark:text-gray-400">
              Seller:
              <code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{{
                auction.seller
              }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div
      class="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Code Example</h3>
      <pre
        class="bg-white dark:bg-gray-900 p-4 rounded border text-sm overflow-x-auto"
      ><code>{{ currentCodeExample }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { createPromiseClient } from '@connectrpc/connect'
import { Query } from '@ts-client/dysonprotocol/whaleswap/v1/query_connect'
import {
  QueryPoolsByPairRequest,
  QueryOffersBestRequest,
  QueryOffersByPairPriceRangeRequest,
  QueryAuctionsByPairPriceRangeRequest,
} from '@ts-client/dysonprotocol/whaleswap/v1/query_pb'
import { useWhaleswapGrpc } from '@/composables/useWhaleswapGrpc'

// Reactive state
const baseDenom = ref('foo.dys')
const quoteDenom = ref('bar.dys')
const minPrice = ref('')
const maxPrice = ref('')
const isConnected = ref(false)
const currentQuery = ref('')
const results = ref<{
  type: 'pools' | 'offers' | 'auctions'
  title: string
  data: any[]
} | null>(null)

// gRPC client setup
const endpoint = 'http://localhost:9090' // Adjust for your environment
const {
  isLoading,
  error,
  getPoolsByPair,
  getBestOffers,
  getOffersByPairPriceRange,
  getAuctionsByPairPriceRange,
} = useWhaleswapGrpc(endpoint)

// Computed
const showPriceRange = computed(
  () => results.value?.type === 'offers' || results.value?.type === 'auctions'
)

const connectionStatus = computed(() => {
  if (!isConnected.value) {
    return {
      class: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      dotClass: 'bg-yellow-400',
      title: 'Connecting to gRPC endpoint...',
      message: 'Make sure your Dyson Protocol node is running with gRPC enabled.',
    }
  }
  return {
    class: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    dotClass: 'bg-green-400',
    title: 'Connected to gRPC endpoint',
    message: `Ready to query at ${endpoint}`,
  }
})

const currentCodeExample = computed(() => {
  if (!results.value) return '// Select a query type to see the code example'

  const base = baseDenom.value
  const quote = quoteDenom.value

  switch (results.value.type) {
    case 'pools':
      return `// Query pools by pair
const request = new QueryPoolsByPairRequest({
  baseDenom: '${base}',
  quoteDenom: '${quote}',
})

const response = await client.poolsByPair(request)
console.log('Pools:', response.pools)`

    case 'offers':
      if (currentQuery.value === 'offers') {
        return `// Get best offers (top of book)
const request = new QueryOffersBestRequest({
  haveDenom: '${base}',
  wantDenom: '${quote}',
  limit: 10,
})

const response = await client.offersBest(request)
console.log('Best offers:', response.offers)`
      } else {
        return `// Query offers by price range
const request = new QueryOffersByPairPriceRangeRequest({
  haveDenom: '${base}',
  wantDenom: '${quote}',
  minPrice: '${minPrice.value || 'undefined'}',
  maxPrice: '${maxPrice.value || 'undefined'}',
})

const response = await client.offersByPairPriceRange(request)
console.log('Offers in range:', response.offers)`
      }

    case 'auctions':
      return `// Query auctions by price range
const request = new QueryAuctionsByPairPriceRangeRequest({
  sellDenom: '${base}',
  bidDenom: '${quote}',
  minPrice: '${minPrice.value || 'undefined'}',
  maxPrice: '${maxPrice.value || 'undefined'}',
})

const response = await client.auctionsByPairPriceRange(request)
console.log('Auctions in range:', response.auctions)`

    default:
      return '// Select a query type'
  }
})

// Methods
function initializeGrpcClient() {
  // The composable handles initialization, just mark as connected
  // In a real app, you might want to test the connection
  isConnected.value = true
}

async function queryPoolsByPair() {
  currentQuery.value = 'pools'
  const result = await getPoolsByPair(baseDenom.value, quoteDenom.value)

  if (result) {
    results.value = {
      type: 'pools',
      title: `Pools for ${baseDenom.value}/${quoteDenom.value}`,
      data: result,
    }
  }
}

async function queryBestOffers() {
  currentQuery.value = 'offers'
  const result = await getBestOffers(baseDenom.value, quoteDenom.value, 10)

  if (result) {
    results.value = {
      type: 'offers',
      title: `Best Offers for ${baseDenom.value}/${quoteDenom.value}`,
      data: result,
    }
  }
}

async function queryOffersByPriceRange() {
  currentQuery.value = 'offers-range'
  const result = await getOffersByPairPriceRange(
    baseDenom.value,
    quoteDenom.value,
    minPrice.value || undefined,
    maxPrice.value || undefined
  )

  if (result) {
    results.value = {
      type: 'offers',
      title: `Offers for ${baseDenom.value}/${quoteDenom.value} (Price Range)`,
      data: result,
    }
  }
}

async function queryAuctionsByPriceRange() {
  currentQuery.value = 'auctions'
  const result = await getAuctionsByPairPriceRange(
    baseDenom.value,
    quoteDenom.value,
    minPrice.value || undefined,
    maxPrice.value || undefined
  )

  if (result) {
    results.value = {
      type: 'auctions',
      title: `Auctions for ${baseDenom.value}/${quoteDenom.value} (Price Range)`,
      data: result,
    }
  }
}

function clearResults() {
  results.value = null
  error.value = ''
}

function formatNumber(num: string): string {
  const n = parseInt(num)
  if (isNaN(n)) return num
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return dateStr
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'closed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

// Initialize on mount
onMounted(() => {
  initializeGrpcClient()
})
</script>
