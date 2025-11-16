# DEX Pool Frontend Specification

## High-Level Plan

### 1. **Route & Data Fetching**

- Route: `/pools/:poolId?base={denom}&quote={denom}`
- Fetch pool: `GET /dysonprotocol/whaleswap/v1/pools/{poolId}`
- Fetch trades: `GET /dysonprotocol/whaleswap/v1/trades/pool/{poolId}?pagination.limit=100&pagination.reverse=true`
- Use TanStack Query for caching/refetching (existing pattern)

### 2. **Price Calculation (Reactive)**

- Pool has `coins[0]` and `coins[1]` (canonical order: `coins[0].denom < coins[1].denom`)
- Price formula: `P = coins[1].amount / coins[0].amount`
- Map to user's base/quote:
  - If `base === coins[0].denom && quote === coins[1].denom`: price = `coins[1].amount / coins[0].amount`
  - If reversed: price = `coins[0].amount / coins[1].amount`
- Use Vue `computed()` to react to pool updates

### 3. **Swap UI**

- Input fields: amount in/out, base/quote selector
- Show current price, estimated output, fee
- Execute via `MsgMakeTrade`:
  - `operations: [{ swap: { pool_id, swap_in: { denom, amount } } }]`
  - `max_input: [{ denom, amount }]`
  - `min_output: [{ denom, amount }]` (slippage protection)
  - `note: ""` (optional metadata)

### 4. **Historical Trades Chart**

- Transform trades: extract price from each trade's `operations[].swap` (sent/received coins)
- Calculate price per trade: `price = received.amount / sent.amount` (normalized to base/quote)
- Use TradingView Lightweight Charts:
  - `createChart()` with transparent background
  - `addCandlestickSeries()` or `addLineSeries()` for price
  - X-axis: trade `timestamp`
  - Y-axis: computed price
  - Update on new trades (polling or WebSocket if available)

### 5. **Component Structure**

```
PoolDetailPage.vue
├── PoolHeader (pool ID, reserves, TVL)
├── PriceDisplay (current price, 24h change)
├── SwapPanel (input/output, execute button)
└── ChartContainer (Lightweight Charts)
    └── TradeHistoryChart (process trades → chart data)
```

### 6. **Key Implementation Notes**

- Use existing `useWhaleswapClient()` for API calls
- Use `useWhaleswapTradesByPool()` composable for trades
- Price computation: handle denom ordering (canonical vs user-specified)
- Chart: aggregate trades by time window (1m/5m/1h) for candlesticks
- Reactive updates: watch pool data, auto-refetch trades periodically

### 6.1. **Coding Practices**

- **Always let errors bubble up**: Never catch errors silently. Allow errors to propagate to the UI layer where they can be displayed to users or logged appropriately.

- **Never use broad error catching**: Avoid `catch {}` or `catch (e) {}` without specific error handling. If catching is necessary, catch specific error types and handle them explicitly, or re-throw with context.

- **Intersperse logging for debugging**: Add `console.log()` statements when setting variables or calling functions during development. These will be removed later but help with debugging:

  ```typescript
  const poolId = computed(() => String(route.params.poolId))
  console.log('[PoolDetail] poolId:', poolId.value)

  const poolData = await client.pool({ poolId: poolId.value })
  console.log('[PoolDetail] poolData:', poolData)
  ```

- **Don't add validation**: The node will validate all inputs. Don't duplicate validation logic in the frontend - let invalid inputs reach the API and show the error response.

- **Show responses and errors near forms**: Display API responses and errors directly adjacent to the form/component that triggered them. Don't hide errors in console or separate error panels.

- **Use proper Vue pending states logic**: Use Vue's `ref()` for pending state, `computed()` for derived state, and proper reactive patterns. Don't mix imperative state management with reactive patterns.

- **Keep code minimal and flat**: Prefer small, flat functions over nested abstractions. Avoid premature optimization and over-engineering. Code should be straightforward and easy to follow.

### 7. **Dependencies**

- `lightweight-charts` (npm install)
- Existing: TanStack Query, Vue 3 composables
- Transaction signing: use existing wallet integration

This follows existing patterns and keeps the UI minimal and reactive.

## Edge Cases & Undefined Behaviors

### Route & Query Parameters

1. **Missing base/quote params**
   - **Behavior**: Auto-detect from pool coins (use `coins[0]` as base, `coins[1]` as quote)
   - **Fallback**: If pool has exactly 2 coins, default to canonical order

2. **Invalid poolId**
   - **Validation**: Must be numeric string, non-negative
   - **Error**: Show 404 page if pool doesn't exist (API returns 404)
   - **Edge**: Handle non-numeric strings gracefully (redirect or error message)

3. **base/quote don't match pool coins**
   - **Validation**: Check that both base and quote exist in `pool.coins[]`
   - **Error**: Show warning "Invalid pair: pool contains {denom1}/{denom2}"
   - **Fallback**: Auto-correct to pool's actual denoms

4. **base/quote provided in wrong order**
   - **Behavior**: Accept either order, normalize internally to match pool's canonical order
   - **Note**: Price calculation must account for order reversal

### Price Calculation

5. **Zero reserves (division by zero)**
   - **Check**: `coins[0].amount === "0" || coins[1].amount === "0"`
   - **Error**: Show "Pool has zero reserves" or "Price unavailable"
   - **Prevent**: Disable swap UI if reserves are zero

6. **Pool coins array length != 2**
   - **Validation**: Pool must have exactly 2 coins (per proto spec)
   - **Error**: Show "Invalid pool structure" if `coins.length !== 2`
   - **Edge**: Handle malformed API responses gracefully

7. **Invalid amount strings**
   - **Parse**: Use `BigInt()` - let parse errors bubble up if string is invalid
   - **Edge**: Empty strings, null, undefined → treat as "0" (handle before parsing)

8. **Price calculation with reversed denoms**
   - **Logic**: If user specifies `base=coins[1].denom, quote=coins[0].denom`:
     - Price = `coins[0].amount / coins[1].amount` (inverse)
   - **Display**: Always show price as "quote/base" regardless of order

### Trade History & Chart

9. **No trades exist**
   - **Behavior**: Show empty state "No trades yet" instead of empty chart
   - **Chart**: Don't initialize chart if trades array is empty

10. **Trades with multiple operations**
    - **Filter**: Only use operations where `operation.swap?.pool_id === poolId`
    - **Price**: Use `operation.sent` and `operation.received` for price calculation
    - **Edge**: If trade has multiple swaps for same pool, use first matching operation

11. **Trades without swap operations**
    - **Filter**: Skip trades where no operation has `swap.pool_id === poolId`
    - **Note**: Trades may have `take` or `auction` operations only → exclude from chart

12. **Missing or invalid timestamps**
    - **Validation**: Check `trade.timestamp` exists and is valid ISO string
    - **Fallback**: Use `trade.height` to estimate time (if available)
    - **Error**: Skip trades with invalid timestamps, log warning

13. **Price calculation from operations**
    - **Logic**: `price = operation.received.amount / operation.sent.amount`
    - **Normalize**: Must match base/quote orientation (handle denom order)
    - **Edge**: If `sent.denom !== base` or `received.denom !== quote`, skip or recalculate

14. **Only one trade (can't draw candlesticks)**
    - **Fallback**: Use `addLineSeries()` instead of `addCandlestickSeries()`
    - **Threshold**: If trades.length < 2, use line chart; if >= 2, use candlesticks

15. **Trades span very long time periods**
    - **Aggregation**: Group trades by time window (1m/5m/1h/1d) for candlesticks
    - **Chart**: Auto-adjust time scale based on data range
    - **Performance**: Limit displayed trades (e.g., last 1000) for performance

16. **Zero amounts in trade operations**
    - **Validation**: Skip operations where `sent.amount === "0" || received.amount === "0"`
    - **Error**: Log warning, exclude from price calculation

### Swap UI

17. **User doesn't have balance**

- **Behavior**: Let swap attempt proceed, show API error response
- **UI**: Display balance below input field for reference
- **Error**: Show "Insufficient balance" error from API near swap button

18. **Invalid amount input**

- **Behavior**: Let user enter any value, send to API
- **Error**: Show API error response near the input field when swap fails
- **Note**: Node validates format - don't duplicate validation in frontend

19. **Pool reserves insufficient for swap**
    - **Check**: Estimate output amount before swap (simulate)
    - **Error**: Show "Insufficient liquidity" if swap would fail
    - **Edge**: Handle exact-out swaps that exceed pool capacity

20. **Slippage calculation**
    - **Logic**: `min_output = estimated_output * (1 - slippage_tolerance)`
    - **Default**: Use 0.5% slippage tolerance
    - **Edge**: Handle very large swaps that cause high slippage

21. **Fee calculation**
    - **Source**: Use `pool.fee_rate` (new field) if available, fallback to deprecated `fee_pct`
    - **Format**: `fee_rate` is array of DecCoins (one per denom), `fee_pct` is single Dec string
    - **Apply**: Fee is output-side (deducted from received amount)

22. **Swap with mismatched denoms**

- **Behavior**: Let swap attempt proceed with any denom
- **Error**: Show API error response if denom doesn't match pool

### Data Fetching & State

23. **API errors (404, 500, network)**
    - **Handle**: Show error message, allow retry
    - **TanStack Query**: Use `error` state, show user-friendly message
    - **Fallback**: Cache last known good state if available

24. **Stale pool data**
    - **Refresh**: Poll pool data every 5-10 seconds (or use WebSocket if available)
    - **TanStack Query**: Set `staleTime: 5000` for pool queries
    - **UI**: Show "Last updated" timestamp

25. **Race conditions (pool updates during swap)**
    - **Handle**: Re-fetch pool after swap transaction confirms
    - **Optimistic**: Update local state immediately, reconcile on confirm
    - **Error**: If swap fails, revert optimistic update

26. **Trades pagination**
    - **Limit**: Fetch trades in batches (e.g., 100 at a time)
    - **Load more**: Implement "Load more" button for historical trades
    - **Chart**: Only display most recent N trades (e.g., 1000) for performance

### Chart-Specific

27. **Chart initialization before data ready**
    - **Wait**: Don't create chart until trades data is loaded
    - **Loading**: Show skeleton/spinner while fetching
    - **Error**: Show error state if chart fails to initialize

28. **Chart resize/container issues**
    - **Handle**: Use ResizeObserver or window resize listener
    - **Lightweight Charts**: Call `chart.applyOptions({ width, height })` on resize
    - **Edge**: Handle container with zero dimensions gracefully

29. **Price data normalization**
    - **Issue**: Prices may vary wildly (e.g., 0.0001 vs 1000000)
    - **Solution**: Use log scale for Y-axis if price range is extreme
    - **Auto-detect**: Calculate price range, choose linear vs log scale

30. **Missing price data points**
    - **Interpolation**: Don't interpolate missing data (show gaps)
    - **Aggregation**: For candlesticks, only create candle if trades exist in time window
    - **Edge**: Handle sparse data (few trades over long period)

### System Denoms

31. **whaleswap.dys/\* system denoms**
    - **Filter**: Exclude pools/operations involving `whaleswap.dys/*` denoms (per simulate_trades.py)
    - **Reason**: These are internal system denoms, not user-tradeable
    - **Check**: Skip if `coin.denom.startsWith("whaleswap.dys/")`

### Transaction Execution

32. **Swap transaction failure**
    - **Handle**: Show transaction error message from chain
    - **Common causes**: Slippage exceeded, insufficient liquidity, invalid amount
    - **Recovery**: Allow user to adjust amount/slippage and retry

33. **Transaction pending state**
    - **UI**: Show "Transaction pending..." with spinner
    - **Poll**: Poll for transaction confirmation (or use WebSocket)
    - **Update**: Refresh pool data after confirmation

34. **Multiple simultaneous swaps**
    - **Prevent**: Disable swap button while transaction is pending
    - **Queue**: Or allow queueing (advanced feature)
    - **State**: Track pending transaction state separately from form state
