# Dyson Protocol Dashboard: Browser-Side Protobuf Encoding Migration

## Overview

This document outlines 3 migration plans to move from node-side protobuf encoding to browser-side encoding using ts-client, TanStack Query, and TanStack DB for live-updating data.

## Current Architecture

- **Encoding**: Node-side via `/cosmos/tx/v1beta1/encode` endpoint
- **Data Storage**: Pinia ORM with Axios
- **Real-time Updates**: Custom event listeners
- **Transaction Flow**: `dysonTxUtils.js` → Node encode → Sign → Broadcast

## Target Architecture

- **Encoding**: Browser-side using ts-client + ConnectRPC
- **Data Fetching**: TanStack Query for server state
- **Local State**: TanStack DB for client-side persistence and live queries
- **Real-time Updates**: Event-driven synchronization with TanStack DB
- **Transaction Flow**: ts-client encode → Sign → Broadcast

---

## Plan 1: Gradual Migration (Dual Stack)

### Strategy

Maintain current Pinia ORM system while introducing TanStack Query/DB alongside it. Migrate features incrementally with fallback mechanisms.

### Implementation Steps

1. **Setup TanStack Infrastructure**

   ```bash
   npm install @tanstack/vue-query @tanstack/vue-db @connectrpc/connect-web
   ```

2. **Create ConnectRPC Client**

   ```typescript
   const transport = createConnectTransport({
     baseUrl: apiUrl,
     useBinaryFormat: true,
   })
   const queryClient = createPromiseClient(Query, transport)
   ```

3. **Dual Data Layer Pattern**

   ```vue
   <template>
     <!-- Current Pinia ORM -->
     <div v-if="usePinia">Pinia ORM Results</div>

     <!-- New TanStack Query -->
     <div v-else-if="useTanStack">TanStack Results</div>

     <!-- Fallback -->
     <div v-else>Fallback to Pinia ORM</div>
   </template>
   ```

4. **Feature Flags**
   ```typescript
   const FEATURES = {
     whaleswap_trades_tanstack: false, // Enable per feature
   }
   ```

### Benefits

- **Zero Downtime**: Fallback to current system if issues arise
- **Incremental**: Migrate one feature at a time
- **Risk Mitigation**: Easy rollback per feature
- **Learning Curve**: Team can learn TanStack while maintaining production stability

### Migration Timeline

- **Week 1-2**: Setup infrastructure, create composables
- **Week 3-4**: Migrate whaleswap trades page
- **Week 5-8**: Migrate other modules incrementally
- **Week 9-12**: Deprecate Pinia ORM, cleanup

---

## Plan 2: Full TanStack Migration (Big Bang)

### Strategy

Complete replacement of Pinia ORM with TanStack Query/DB. All-or-nothing approach with comprehensive testing.

### Implementation Steps

1. **Replace All Data Fetching**

   ```typescript
   // Before: Pinia ORM
   const repo = useAxiosRepo(Model).api()

   // After: TanStack Query + DB
   const { data, isLoading } = useQuery({ ... })
   const collection = useTanStackDB({ ... })
   ```

2. **New Transaction Encoding**

   ```typescript
   // Replace dysonTxUtils.encodeAndDecodeTx()
   const txClient = createPromiseClient(Tx, transport)
   const encoded = await txClient.encode({ tx })
   ```

3. **Unified Data Layer**

   ```vue
   <template>
     <!-- Single source of truth -->
     <TradeList :trades="tradesQuery.data" :live-trades="liveTrades" />
   </template>
   ```

4. **Comprehensive Testing**
   - Unit tests for all composables
   - Integration tests for data flow
   - E2E tests for critical user journeys

### Benefits

- **Clean Architecture**: Single data layer, no duplication
- **Performance**: Optimized caching and state management
- **Developer Experience**: Consistent patterns across the app
- **Future-Proof**: Modern stack ready for scaling

### Challenges

- **High Risk**: All-or-nothing migration
- **Testing Burden**: Comprehensive testing required
- **Rollback Difficulty**: Complex to revert if issues found
- **Timeline Pressure**: Longer development/testing cycle

### Migration Timeline

- **Month 1**: Design new architecture, create all composables
- **Month 2**: Implement all pages, extensive testing
- **Month 3**: Staging deployment, user acceptance testing
- **Month 4**: Production deployment with monitoring

---

## Plan 3: Feature-Based Migration (Microservices)

### Strategy

Treat each major feature as an independent "microservice" that can be migrated individually. Use composition over inheritance pattern.

### Implementation Steps

1. **Feature Modules**

   ```typescript
   // src/features/whaleswap/index.ts
   export { useWhaleswapTrades, useWhaleswapTradesLive }

   // src/features/bank/index.ts
   export { useBankBalances, useBankTransfersLive }

   // src/features/script/index.ts
   export { useScripts, useScriptExecution }
   ```

2. **Composition Pattern**

   ```vue
   <script setup>
   import { useWhaleswapTrades, useWhaleswapTradesLive } from '@/features/whaleswap'

   // Feature-specific composables
   const { tradesQuery } = useWhaleswapTrades(filters)
   const { allTrades: liveTrades } = useWhaleswapTradesLive()
   </script>
   ```

3. **Gradual Rollout**

   ```typescript
   // Feature flags per module
   const FEATURE_FLAGS = {
     whaleswap: 'tanstack', // 'pinia' | 'tanstack' | 'hybrid'
     bank: 'pinia', // Not migrated yet
     scripts: 'hybrid', // Dual stack
   }
   ```

4. **Shared Infrastructure**
   ```typescript
   // Shared TanStack setup
   export const queryClient = new QueryClient({ ... })
   export const dbCollections = { ... }
   ```

### Benefits

- **Modular**: Each feature can be migrated independently
- **Flexible**: Mix and match approaches per feature
- **Scalable**: Easy to add new features with consistent patterns
- **Maintainable**: Clear separation of concerns

### Migration Timeline

- **Continuous**: Migrate features as needed
- **Parallel**: Multiple teams can work on different features
- **Staged**: Release migrated features incrementally
- **Flexible**: No fixed timeline, adapt to business needs

---

## Implementation Demo: Whaleswap Trades

### Current Implementation (Pinia ORM)

```vue
<script setup>
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'

const repo = useAxiosRepo(WhaleswapTrade)
const trades = computed(() => repo.repo().all())

async function load() {
  await repo.api().fetchTradesByOffer(offerId.value)
}
</script>
```

### Plan 1 Implementation (Dual Stack)

```vue
<script setup>
import {
  useWhaleswapTrades,
  useWhaleswapTradesLive,
} from '@/composables/useWhaleswapTradesTanStack'
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapTrade from '@/orm/models/whaleswap/Trade'

// TanStack (new)
const { tradesQuery } = useWhaleswapTrades(filters)
const { allTrades: liveTrades } = useWhaleswapTradesLive()

// Pinia (fallback)
const piniaRepo = useAxiosRepo(WhaleswapTrade)
const piniaTrades = computed(() => piniaRepo.repo().all())

// Use TanStack if available, fallback to Pinia
const trades = computed(() => tradesQuery.data.value?.trades || piniaTrades.value)
</script>
```

### Plan 2 Implementation (Full Migration)

```vue
<script setup>
import { useWhaleswapTrades, useWhaleswapTradesLive } from '@/features/whaleswap'

// Single source of truth
const { tradesQuery, createTradeMutation } = useWhaleswapTrades(filters)
const { allTrades: liveTrades, collection } = useWhaleswapTradesLive()

// Reactive data binding
const trades = computed(() => tradesQuery.data.value?.trades || [])
</script>
```

### Plan 3 Implementation (Feature Module)

```vue
<script setup>
// Feature-specific import
import { useTrades, useTradesLive } from '@/features/whaleswap/trades'

// Clean, focused API
const { trades, isLoading, error } = useTrades(filters)
const { liveTrades, addTrade, removeTrade } = useTradesLive()
</script>
```

---

## Technology Choices

### TanStack Query

- **Caching**: Intelligent caching with stale-while-revalidate
- **Background Updates**: Automatic refetching when window regains focus
- **Optimistic Updates**: UI updates before server confirmation
- **Error Handling**: Robust error boundaries and retry logic

### TanStack DB

- **Local Persistence**: Client-side data persistence
- **Live Queries**: Reactive queries that update automatically
- **Sync**: Event-driven synchronization with server state
- **Performance**: Efficient indexing and querying

### ConnectRPC

- **Type Safety**: Full TypeScript support with generated types
- **Performance**: Binary protobuf transport
- **Streaming**: Support for real-time data streams
- **Interoperability**: Works with any language that supports gRPC

---

## Migration Decision Framework

### Choose Plan 1 If:

- Team has limited TanStack experience
- Business requires high stability
- Budget for gradual migration
- Need to maintain production stability

### Choose Plan 2 If:

- Team has TanStack experience
- Business can tolerate some risk for big improvements
- Clear timeline and resources for big-bang migration
- Desire for clean, modern architecture

### Choose Plan 3 If:

- Team prefers modular, microservice approach
- Business needs flexibility in migration timeline
- Multiple teams working on different features
- Desire for composable, maintainable architecture

---

## Success Metrics

1. **Performance**: Faster load times, reduced bundle size
2. **Reliability**: Fewer data synchronization issues
3. **Developer Experience**: Easier to build new features
4. **User Experience**: More responsive UI with live updates
5. **Maintainability**: Cleaner, more testable code

---

## Next Steps

1. **Evaluate Current Team Skills**: Assess TanStack experience
2. **Business Requirements**: Determine acceptable risk level
3. **Timeline Constraints**: Evaluate migration timeline needs
4. **Choose Plan**: Select appropriate migration strategy
5. **Pilot Implementation**: Start with whaleswap trades demo
6. **Measure Results**: Track success metrics during migration
