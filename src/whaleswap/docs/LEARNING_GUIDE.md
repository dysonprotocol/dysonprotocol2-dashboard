# TanStack Ecosystem Learning Guide

## Table of Contents

1. [TanStack Query Basics](#tanstack-query-basics)
2. [TanStack DB Integration](#tanstack-db-integration)
3. [Practical Examples](#practical-examples)
4. [Common Patterns](#common-patterns)
5. [Performance Tips](#performance-tips)

---

## TanStack Query Basics

### What Problem Does It Solve?

Traditional state management (Vuex/Pinia) works great for **client state**, but struggles with **server state**:

```typescript
// ❌ Manual server state management (complex, error-prone)
const trades = ref([])
const loading = ref(false)
const error = ref(null)

async function fetchTrades() {
  loading.value = true
  try {
    const res = await fetch('/api/trades')
    trades.value = await res.json()
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

// Need manual:
// - Deduplication
// - Caching
// - Refetching when stale
// - Background updates
// - Error retry logic
```

```typescript
// ✅ TanStack Query handles everything automatically
const { data, isLoading, error } = useQuery({
  queryKey: ['trades'],
  queryFn: () => fetch('/api/trades').then((r) => r.json()),
})

// Automatic:
// ✅ Deduplication (multiple components → one request)
// ✅ Caching (instant subsequent loads)
// ✅ Stale-while-revalidate (show cached, fetch fresh)
// ✅ Window focus refetch
// ✅ Retry on error
// ✅ Garbage collection
```

### Core Concepts

#### 1. Query Keys

Query keys are **fingerprints** for data. Same key = same data.

```typescript
// Hierarchical keys enable scoped invalidation
;['whaleswap', 'trades'][('whaleswap', 'trades', 'by-taker', addr)] // All trades // Specific taker

// Invalidate all trades:
queryClient.invalidateQueries({ queryKey: ['whaleswap', 'trades'] })

// Invalidate only one taker:
queryClient.invalidateQueries({
  queryKey: ['whaleswap', 'trades', 'by-taker', addr],
})
```

#### 2. Query Functions

```typescript
// Simple fetch
queryFn: () => fetch('/api/trades').then((r) => r.json())

// With parameters
queryFn: ({ queryKey }) => {
  const [_, __, taker] = queryKey
  return fetch(`/api/trades/taker/${taker}`).then((r) => r.json())
}

// With signal for cancellation
queryFn: ({ signal }) => fetch('/api/trades', { signal })
```

#### 3. Query Options

```typescript
useQuery({
  queryKey: ['trades'],
  queryFn: fetchTrades,

  // Cache for 5 minutes
  staleTime: 5 * 60 * 1000,

  // Keep in cache for 10 minutes after unused
  gcTime: 10 * 60 * 1000,

  // Refetch on window focus
  refetchOnWindowFocus: true,

  // Retry failed requests
  retry: 3,

  // Conditional fetching
  enabled: !!userId,

  // Select subset of data
  select: (data) => data.trades.filter((t) => t.amount > 100),
})
```

---

## TanStack DB Integration

### What Is TanStack DB?

**TanStack DB** is a local-first database built on IndexedDB with:

- ⚡ **Instant queries** (no network latency)
- 📴 **Offline support** (works without connection)
- 🔄 **Background sync** (updates from server when online)
- 🔍 **Complex queries** (filters, sorts, joins)
- ⚛️ **Reactive** (live queries auto-update Vue)

### Architecture Pattern

```
┌─────────────────────────────────────────────┐
│  Vue Component                              │
│  - Shows data instantly from IndexedDB      │
│  - Background updates from server           │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────┐       ┌──────────────┐
│ TanStack DB  │       │ TanStack     │
│ (IndexedDB)  │◄──────│ Query        │
│              │ sync  │ (Server)     │
│ - Instant    │       │ - Fresh data │
│ - Offline    │       │ - Cache      │
│ - Reactive   │       │ - Refetch    │
└──────────────┘       └──────────────┘
```

### Basic Usage

```typescript
// 1. Define schema
const db = defineDb({
  name: 'whaleswap',
  version: 1,
  tables: {
    trades: {
      key: 'trade_id',
      indexes: {
        taker: 'taker',
        timestamp: 'timestamp',
      },
    },
  },
})

// 2. Fetch from server
const { data } = useQuery({
  queryKey: ['trades', taker],
  queryFn: () => fetchTrades(taker),
})

// 3. Sync server → DB
watchEffect(() => {
  if (data.value?.trades) {
    db.trades.putMany(data.value.trades)
  }
})

// 4. Live query from DB (reactive!)
const localTrades = useLiveQuery(() =>
  db.trades.where('taker').equals(taker).sortBy('timestamp').reverse()
)

// 5. Use local-first in template
const displayTrades = computed(() => localTrades.value || data.value?.trades || [])
```

---

## Practical Examples

### Example 1: Simple Trade Listing

```vue
<script setup lang="ts">
import { useWhaleswapTradesByTaker } from '@/whaleswap/composables/useWhaleswapTrades'

const address = ref('dys1...')
const { data, isLoading, error } = useWhaleswapTradesByTaker(address)

const trades = computed(() => data.value?.trades || [])
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <div v-for="trade in trades" :key="trade.trade_id">Trade #{{ trade.trade_id }}</div>
  </div>
</template>
```

### Example 2: With Pagination

```typescript
import { useInfiniteQuery } from '@tanstack/vue-query'
import { whaleswapKeys } from '@/whaleswap/utils/queryKeys'

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: whaleswapKeys.tradesByTaker(address.value),
  queryFn: ({ pageParam }) =>
    client.tradesByTaker({
      taker: address.value,
      pagination: {
        limit: 50n,
        key: pageParam,
      },
    }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.pagination?.next_key,
})

// All pages combined
const allTrades = computed(() => data.value?.pages.flatMap((page) => page.trades) || [])
```

### Example 3: Optimistic Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/vue-query'

const queryClient = useQueryClient()

const createTradeMutation = useMutation({
  mutationFn: (trade) => api.createTrade(trade),

  // Before mutation executes
  onMutate: async (newTrade) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({
      queryKey: whaleswapKeys.trades(),
    })

    // Get snapshot
    const previous = queryClient.getQueryData(whaleswapKeys.tradesByTaker(newTrade.taker))

    // Optimistic update
    queryClient.setQueryData(whaleswapKeys.tradesByTaker(newTrade.taker), (old) => ({
      ...old,
      trades: [newTrade, ...(old?.trades || [])],
    }))

    return { previous }
  },

  // On error, rollback
  onError: (err, newTrade, context) => {
    queryClient.setQueryData(whaleswapKeys.tradesByTaker(newTrade.taker), context?.previous)
  },

  // Always refetch after mutation
  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries({
      queryKey: whaleswapKeys.tradesByTaker(variables.taker),
    })
  },
})
```

---

## Common Patterns

### Pattern 1: Dependent Queries

```typescript
// Wait for user before fetching trades
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
})

const { data: trades } = useQuery({
  queryKey: ['trades', user?.address],
  queryFn: () => fetchTrades(user.value!.address),
  enabled: !!user.value?.address, // Only run when user loaded
})
```

### Pattern 2: Parallel Queries

```typescript
// Fetch multiple resources simultaneously
const trades = useWhaleswapTradesByTaker(address)
const offers = useWhaleswapOffersByOwner(address)
const pools = useWhaleswapPoolsByOwner(address)

// All three fetch in parallel, auto-deduplicated
const isLoading = computed(
  () => trades.isLoading.value || offers.isLoading.value || pools.isLoading.value
)
```

### Pattern 3: Reactive Query Keys

```typescript
// Query key updates when filter changes
const filter = ref('open')
const address = ref('dys1...')

const { data } = useQuery({
  queryKey: ['offers', address, filter], // Reactive!
  queryFn: () => fetchOffers(address.value, filter.value),
})

// When filter.value changes, query automatically refetches
```

### Pattern 4: Prefetching

```typescript
const queryClient = useQueryClient()

// Prefetch on hover
function onHover(tradeId: string) {
  queryClient.prefetchQuery({
    queryKey: whaleswapKeys.trade(tradeId),
    queryFn: () => client.trade({ tradeId }),
  })
}

// When user clicks, data is already cached!
```

---

## Performance Tips

### 1. Use Query Key Factory

```typescript
// ❌ BAD: Duplicated strings, typos
queryKey: ['whaleswap', 'trades', 'by-taker', addr]
queryKey: ['whalswap', 'trade', 'by-taker', addr] // Typo!

// ✅ GOOD: Centralized, type-safe
queryKey: whaleswapKeys.tradesByTaker(addr)
```

### 2. Stale Time Strategy

```typescript
// Fast-changing data (current prices)
staleTime: 1000,  // 1 second

// Slow-changing data (historical trades)
staleTime: 5 * 60 * 1000,  // 5 minutes

// Static data (params)
staleTime: Infinity,  // Never refetch
```

### 3. Select Only What You Need

```typescript
// ❌ Component re-renders on any trade change
const { data } = useWhaleswapTradesByTaker(address)
const firstTrade = computed(() => data.value?.trades[0])

// ✅ Only re-renders when first trade changes
const { data: firstTrade } = useWhaleswapTradesByTaker(address, {
  options: {
    select: (data) => data.trades[0],
  },
})
```

### 4. Combine Local + Server

```typescript
// Show instant local data, update from server
const localTrades = useLiveQuery(() => db.trades.where('taker').equals(addr))
const { data: serverTrades } = useWhaleswapTradesByTaker(addr)

watchEffect(() => {
  if (serverTrades.value?.trades) {
    db.trades.putMany(serverTrades.value.trades)
  }
})

// Local-first display (instant load!)
const trades = computed(() => localTrades.value || serverTrades.value?.trades || [])
```

---

## Next Steps

1. ✅ Review `src/whaleswap/examples/TradesWithDB.vue` for complete working example
2. ✅ Check `src/whaleswap/utils/queryKeys.ts` for key factory pattern
3. ✅ Study `src/whaleswap/composables/useWhaleswapDB.ts` for DB schema
4. 🚧 Implement pools, offers, auctions with same patterns
5. 🚧 Add mutations for transactions
6. 🚧 Add infinite scroll pagination

## References

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/vue/overview)
- [TanStack DB Docs](https://tanstack.com/db/latest)
- [TkDodo's Blog](https://tkdodo.eu/blog/practical-react-query) - Best practices
- Swagger Schema: `./swagger-gen/dysonprotocol/whaleswap/v1/query.swagger.json`

