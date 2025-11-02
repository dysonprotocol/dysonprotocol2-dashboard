# TanStack Query + DB Integration Guide

## Overview

This document explains how we integrate **TanStack Query** and **TanStack DB** for the Whaleswap module, following best practices from the [TanStack Query Vue docs](https://tanstack.com/query/latest/docs/framework/vue/overview).

## Architecture

```
Cosmos SDK REST API (swagger-gen)
         ↓
  useWhaleswapClient (fetch wrapper)
         ↓
  TanStack Query (server state)
         ↓
  TanStack DB (local cache + live queries)
         ↓
  Vue Components (reactive UI)
```

## Key Concepts

### 1. Server State vs Client State

**Server State** (TanStack Query manages this):

- Persisted remotely on blockchain
- Requires async API calls
- Shared ownership (multiple users)
- Can become stale
- Examples: trades, pools, offers

**Client State** (Vue refs/reactive):

- Local to browser
- Synchronous access
- Single owner
- Always fresh
- Examples: form inputs, UI toggles

### 2. TanStack Query Features We Use

✅ **Automatic Caching**: Deduplicates requests with same query key  
✅ **Background Refetching**: Updates stale data on window focus  
✅ **Query Keys**: Hierarchical keys for granular invalidation  
✅ **Pagination**: Built-in support for next_key cursors  
✅ **Reactivity**: Automatically updates Vue components

### 3. Query Key Factory Pattern

```typescript
// Hierarchical keys for precise cache control
;['whaleswap', 'trades'][('whaleswap', 'trades', 'by-taker', address)][ // All trades // Trades by taker
  ('whaleswap', 'trades', 'by-pool', poolId)
][('whaleswap', 'trade', tradeId)] // Trades by pool // Single trade
```

This allows invalidating all taker trades without affecting pool trades.

## Implementation

### Step 1: REST Client (`useWhaleswapClient.ts`)

Maps swagger endpoints to typed functions:

```typescript
// Swagger: GET /dysonprotocol/whaleswap/v1/trades/taker/{taker}
async tradesByTaker(req: {
  taker: string
  pagination?: { limit?: bigint }
}) {
  const params = new URLSearchParams()
  if (req.pagination?.limit)
    params.set('pagination.limit', String(req.pagination.limit))
  return fetchJson(`/trades/taker/${req.taker}?${params}`)
}
```

### Step 2: Query Composables (`useWhaleswapTrades.ts`)

Wraps REST client with TanStack Query:

```typescript
export function useWhaleswapTradesByTaker(
  taker: MaybeRefOrGetter<string>,
  opts?: { limit?: string; options?: UseQueryOptions }
) {
  const client = useWhaleswapClient()
  return useQuery({
    queryKey: ['whaleswap', 'trades', 'by-taker', taker, opts?.limit],
    queryFn: async () => {
      const pagination = limit ? { limit: BigInt(limit) } : undefined
      return await client.tradesByTaker({
        taker: toValue(taker),
        pagination,
      })
    },
    enabled: !!toValue(taker), // Don't fetch if no taker
    ...opts?.options,
  })
}
```

**Key Features:**

- `MaybeRefOrGetter<T>` - Accepts `ref`, `computed`, or plain values
- `toValue()` - Extracts value in queryFn
- `enabled` - Conditional fetching
- Query key reactivity - Refetches when deps change

### Step 3: Type-Safe Responses

Use swagger schema to define types:

```typescript
// From swagger: "#/definitions/dysonprotocol.whaleswap.v1.Trade"
export type Trade = {
  trade_id: string // uint64 as string
  taker: string // bech32 address
  timestamp: string // ISO 8601 date-time
  sent: Coin
  received: Coin
  pool_id: string // "0" if not pool trade
  offer_id: string // "0" if not offer trade
  note?: string
}
```

## TanStack DB Integration (Future)

TanStack DB provides **local-first persistence** with live queries:

```typescript
// Define schema
const db = defineDb({
  tables: {
    trades: {
      key: 'trade_id',
      fields: {
        trade_id: 'string',
        taker: 'string',
        timestamp: 'number',
        // ... more fields
      },
    },
  },
})

// Sync query → DB
const { data } = useWhaleswapTradesByTaker(address)
watchEffect(() => {
  if (data.value?.trades) {
    db.trades.putMany(data.value.trades)
  }
})

// Live query from DB (instant, offline-capable)
const localTrades = useLiveQuery(() => db.trades.where('taker').equals(address).sortBy('timestamp'))
```

**Benefits:**

- ⚡ Instant reads from IndexedDB
- 🔄 Background sync from server
- 📴 Offline support
- 🔍 Complex local queries (filters, joins)

## Best Practices

### 1. Query Key Organization

```typescript
// ❌ BAD: Flat keys, hard to invalidate
;['trades', address][('trades', poolId)][
  // ✅ GOOD: Hierarchical, scoped invalidation
  ('whaleswap', 'trades', 'by-taker', address)
][('whaleswap', 'trades', 'by-pool', poolId)]

// Invalidate all taker queries:
queryClient.invalidateQueries({
  queryKey: ['whaleswap', 'trades', 'by-taker'],
})
```

### 2. Pagination with Cursors

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['whaleswap', 'trades', 'by-taker', taker],
  queryFn: ({ pageParam }) =>
    client.tradesByTaker({
      taker,
      pagination: {
        limit: 50n,
        key: pageParam ? atob(pageParam) : undefined,
      },
    }),
  getNextPageParam: (lastPage) => lastPage.pagination?.next_key,
})
```

### 3. Optimistic Updates

When creating trades, update cache optimistically:

```typescript
const mutation = useMutation({
  mutationFn: (trade) => client.createTrade(trade),
  onMutate: async (newTrade) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: ['whaleswap', 'trades'],
    })

    // Snapshot current value
    const prev = queryClient.getQueryData(['whaleswap', 'trades', 'by-taker', taker])

    // Optimistically update
    queryClient.setQueryData(['whaleswap', 'trades', 'by-taker', taker], (old) => ({
      ...old,
      trades: [newTrade, ...(old?.trades || [])],
    }))

    return { prev }
  },
  onError: (_err, _vars, context) => {
    // Rollback on error
    queryClient.setQueryData(['whaleswap', 'trades', 'by-taker', taker], context?.prev)
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({
      queryKey: ['whaleswap', 'trades'],
    })
  },
})
```

## Current Implementation Status

✅ **Implemented:**

- REST client with swagger-defined endpoints
- TanStack Query composables for trades
- Query key factory pattern
- Pagination support
- Reactive queries with MaybeRefOrGetter

🚧 **TODO:**

- TanStack DB local persistence
- Infinite scroll pagination
- Optimistic updates for mutations
- Query composables for pools, offers, auctions
- Error boundary handling
- Suspense integration

## References

- [TanStack Query Vue Docs](https://tanstack.com/query/latest/docs/framework/vue/overview)
- [TanStack DB Beta Docs](https://tanstack.com/db/latest)
- [Cosmos SDK REST API](https://docs.cosmos.network/main/build/building-modules/REST)
- Swagger Schema: `./swagger-gen/dysonprotocol/whaleswap/v1/query.swagger.json`
