<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Whaleswap Pair Queries</h1>

    <!-- Pair Selection -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Select Trading Pair</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Base Denom</label>
          <input
            v-model="baseDenom"
            type="text"
            placeholder="e.g., foo.dys"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Quote Denom</label>
          <input
            v-model="quoteDenom"
            type="text"
            placeholder="e.g., bar.dys"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Query Buttons -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Query Options</h2>
      <div class="flex flex-wrap gap-3">
        <button
          @click="queryPoolsByPair"
          :disabled="isLoading || !baseDenom || !quoteDenom"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Query Pools
        </button>

        <button
          @click="queryBestOffers"
          :disabled="isLoading || !baseDenom || !quoteDenom"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Best Offers (Top of Book)
        </button>

        <button
          @click="queryOffersByPriceRange"
          :disabled="isLoading || !baseDenom || !quoteDenom"
          class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Offers by Price Range
        </button>

        <button
          @click="queryAuctionsByPriceRange"
          :disabled="isLoading || !baseDenom || !quoteDenom"
          class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Auctions by Price Range
        </button>
      </div>
    </div>

    <!-- Price Range Inputs (for offers and auctions) -->
    <div v-if="showPriceRange" class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-md font-medium mb-3">Price Range (optional)</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Min Price</label>
          <input
            v-model="minPrice"
            type="text"
            placeholder="e.g., 0.9"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Max Price</label>
          <input
            v-model="maxPrice"
            type="text"
            placeholder="e.g., 1.1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
        <span class="text-blue-700">Querying blockchain...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <svg
          class="w-6 h-6 text-red-500 mr-3"
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
        <span class="text-red-700">{{ error }}</span>
      </div>
    </div>

    <!-- Results -->
    <div v-if="results" class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Results</h2>

      <!-- Pools Results -->
      <div v-if="results.type === 'pools'" class="space-y-4">
        <h3 class="text-md font-medium">Pools ({{ results.data.length }})</h3>
        <div
          v-for="pool in results.data"
          :key="pool.poolId"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start mb-2">
            <span class="font-medium">Pool #{{ pool.poolId }}</span>
            <span class="text-sm text-gray-500">{{ pool.feePct }}% fee</span>
          </div>
          <div class="space-y-1 text-sm">
            <div v-for="coin in pool.coins" :key="coin.denom" class="flex justify-between">
              <span>{{ coin.denom }}:</span>
              <span>{{ coin.amount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Offers Results -->
      <div v-if="results.type === 'offers'" class="space-y-4">
        <h3 class="text-md font-medium">Offers ({{ results.data.length }})</h3>
        <div
          v-for="offer in results.data"
          :key="offer.offerId"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start mb-2">
            <span class="font-medium">Offer #{{ offer.offerId }}</span>
            <span class="text-sm text-gray-500">{{ offer.status }}</span>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Have</div>
              <div>{{ offer.initialHave.amount }} {{ offer.initialHave.denom }}</div>
            </div>
            <div>
              <div class="text-gray-600">Want</div>
              <div>{{ offer.initialWant.amount }} {{ offer.initialWant.denom }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Auctions Results -->
      <div v-if="results.type === 'auctions'" class="space-y-4">
        <h3 class="text-md font-medium">Auctions ({{ results.data.length }})</h3>
        <div
          v-for="auction in results.data"
          :key="auction.auctionId"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start mb-2">
            <span class="font-medium">Auction #{{ auction.auctionId }}</span>
            <span class="text-sm text-gray-500">{{ auction.sell.denom }}</span>
          </div>
          <div class="text-sm">
            <div>Selling: {{ auction.sell.amount }} {{ auction.sell.denom }}</div>
            <div>Bid denom: {{ auction.bidDenom }}</div>
            <div>Seller: {{ auction.seller }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { createGrpcTransport } from '@connectrpc/connect-web'
import { Query } from '@ts-client/dysonprotocol/whaleswap/v1/query_connect'
import {
  QueryPoolsByPairRequest,
  QueryOffersBestRequest,
  QueryOffersByPairPriceRangeRequest,
  QueryAuctionsByPairPriceRangeRequest,
} from '@ts-client/dysonprotocol/whaleswap/v1/query_pb'

// Reactive state
const baseDenom = ref('foo.dys')
const quoteDenom = ref('bar.dys')
const minPrice = ref('')
const maxPrice = ref('')
const isLoading = ref(false)
const error = ref('')
const results = ref<{
  type: 'pools' | 'offers' | 'auctions'
  data: any[]
} | null>(null)

// Computed
const showPriceRange = computed(
  () => results.value?.type === 'offers' || results.value?.type === 'auctions'
)

// gRPC client setup
const endpoint = 'http://localhost:9090' // Adjust to your gRPC endpoint
const transport = createGrpcTransport({
  baseUrl: endpoint,
  httpVersion: '1.1',
})
const client = Query.create(transport)

// Query functions
async function executeQuery<T>(queryFn: () => Promise<T>): Promise<T | null> {
  isLoading.value = true
  error.value = ''

  try {
    const result = await queryFn()
    return result
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    console.error('Query failed:', err)
    return null
  } finally {
    isLoading.value = false
  }
}

async function queryPoolsByPair() {
  const result = await executeQuery(async () => {
    const request = new QueryPoolsByPairRequest({
      baseDenom: baseDenom.value,
      quoteDenom: quoteDenom.value,
    })
    const response = await client.poolsByPair(request)
    return response.pools
  })

  if (result) {
    results.value = {
      type: 'pools',
      data: result,
    }
  }
}

async function queryBestOffers() {
  const result = await executeQuery(async () => {
    const request = new QueryOffersBestRequest({
      haveDenom: baseDenom.value,
      wantDenom: quoteDenom.value,
      limit: 10,
    })
    const response = await client.offersBest(request)
    return response.offers
  })

  if (result) {
    results.value = {
      type: 'offers',
      data: result,
    }
  }
}

async function queryOffersByPriceRange() {
  const result = await executeQuery(async () => {
    const request = new QueryOffersByPairPriceRangeRequest({
      haveDenom: baseDenom.value,
      wantDenom: quoteDenom.value,
      minPrice: minPrice.value || undefined,
      maxPrice: maxPrice.value || undefined,
    })
    const response = await client.offersByPairPriceRange(request)
    return response.offers
  })

  if (result) {
    results.value = {
      type: 'offers',
      data: result,
    }
  }
}

async function queryAuctionsByPriceRange() {
  const result = await executeQuery(async () => {
    const request = new QueryAuctionsByPairPriceRangeRequest({
      sellDenom: baseDenom.value,
      bidDenom: quoteDenom.value,
      minPrice: minPrice.value || undefined,
      maxPrice: maxPrice.value || undefined,
    })
    const response = await client.auctionsByPairPriceRange(request)
    return response.auctions
  })

  if (result) {
    results.value = {
      type: 'auctions',
      data: result,
    }
  }
}
</script>









