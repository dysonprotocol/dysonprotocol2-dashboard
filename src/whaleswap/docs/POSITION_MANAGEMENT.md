# Position Management Guide

This guide explains how to manage leverage positions in the Whaleswap dashboard.

## Overview

The position management system allows users to:

- View detailed position information
- Monitor position health and liquidation risk
- Close positions
- Add collateral to improve health
- Cover debt (partial or full)

## Components

### 1. PositionsTable (`src/views/whaleswap/PositionsTable.vue`)

Enhanced table displaying all positions with:

- Position ID and owner
- Collateral, borrowed, and interest amounts
- Health indicator (🟢 Safe, 🟡 Medium Risk, 🔴 High Risk)
- Status badge
- "Manage" button for owned positions

**Features:**

- Highlights user's own positions with "(You)" label
- Disables management for positions not owned by connected wallets
- Opens detail modal on click

### 2. PositionDetailModal (`src/views/whaleswap/PositionDetailModal.vue`)

Comprehensive modal for managing individual positions:

**Display Information:**

- Collateral, borrowed, held, accrued interest
- Total debt calculation
- Current collateral ratio
- Health metrics (min ratio, liquidation threshold, distance to liquidation)
- Risk level with color-coded badge
- Creation and update timestamps

**Management Actions:**

#### Close Position

- Fully closes the position
- Swaps held assets back to borrowed denom
- Repays principal + interest
- Returns remaining collateral + profit
- Requires confirmation dialog
- Shows loading spinner during transaction

#### Add Collateral

- Adds additional collateral to position
- Improves collateral ratio
- Clears liquidation markers
- Input field for amount in collateral denom
- Real-time validation

#### Cover Position

- Pays down debt without closing
- Can be partial (reduce principal) or full (auto-close)
- Input field for payment amount in borrowed denom
- Shows total debt for reference
- Clears liquidation markers on partial cover

### 3. Position Mutations (`src/whaleswap/composables/usePositionMutations.ts`)

Transaction hooks using TanStack Query mutations:

#### `useClosePositionMutation()`

```typescript
const closePosition = useClosePositionMutation()

await closePosition.mutateAsync({
  positionId: '1',
  executorAddress: 'dys2...',
  note: 'Optional note',
})
```

#### `useAddCollateralMutation()`

```typescript
const addCollateral = useAddCollateralMutation()

await addCollateral.mutateAsync({
  positionId: '1',
  poolId: '1',
  collateral: { denom: 'udys', amount: '1000000' },
  executorAddress: 'dys2...',
})
```

#### `useCoverPositionMutation()`

```typescript
const coverPosition = useCoverPositionMutation()

await coverPosition.mutateAsync({
  positionId: '1',
  payment: { denom: 'udys', amount: '500000' },
  executorAddress: 'dys2...',
  note: 'Partial cover',
})
```

**Features:**

- Automatic gas estimation with `gasLimit: 'auto'`
- Success/error toast notifications
- Automatic query invalidation (refetches positions)
- Error handling with user-friendly messages

### 4. Health Calculation (`calculatePositionHealth()`)

Utility function for position risk assessment:

```typescript
const health = calculatePositionHealth(position)

// Returns:
{
  ratio: number,              // Current collateral ratio
  riskLevel: 'safe' | 'medium' | 'high',
  distanceToLiquidation: number,
  minRatio: number,           // From pool config
  liqThreshold: number        // From pool config
}
```

**Risk Levels:**

- **Safe (🟢)**: Ratio >= min collateral ratio
- **Medium (🟡)**: Ratio between liquidation threshold and min ratio
- **High (🔴)**: Ratio close to liquidation threshold

## User Flow

### Viewing Positions

1. Navigate to Pool Detail page
2. Click "Positions" tab
3. Select "All" or specific wallet address filter
4. View positions in table with health indicators

### Managing a Position

1. Click "Manage" button on owned position
2. Modal opens with detailed information
3. Choose action:

#### To Close Position:

1. Click "Close Position" button
2. Review confirmation dialog
3. Click "Confirm Close"
4. Wait for transaction
5. Position is closed, funds returned

#### To Add Collateral:

1. Click "Add Collateral" button
2. Enter amount in input field
3. Click "Confirm Add Collateral"
4. Wait for transaction
5. Position health improves

#### To Cover Debt:

1. Click "Cover Debt" button
2. Enter payment amount
3. Click "Confirm Cover"
4. Wait for transaction
5. Debt reduced or position closed (if full payment)

## Technical Details

### Transaction Messages

All operations use Cosmos SDK messages:

**Close Position:**

```json
{
  "@type": "/dysonprotocol.whaleswap.v1.MsgClosePosition",
  "user": "dys2...",
  "position_id": "1",
  "note": ""
}
```

**Add Collateral:**

```json
{
  "@type": "/dysonprotocol.whaleswap.v1.MsgAddCollateral",
  "user": "dys2...",
  "pool_id": "1",
  "position_id": "1",
  "collateral": {
    "denom": "udys",
    "amount": "1000000"
  }
}
```

**Cover Position:**

```json
{
  "@type": "/dysonprotocol.whaleswap.v1.MsgCoverPosition",
  "user": "dys2...",
  "position_id": "1",
  "payment": {
    "denom": "udys",
    "amount": "500000"
  },
  "note": ""
}
```

### Query Invalidation

After any mutation, the following queries are invalidated:

- `whaleswapKeys.positions()` - All position queries
- This triggers automatic refetch of positions data
- UI updates reactively with fresh data

### Error Handling

Errors are caught at multiple levels:

1. **Mutation level**: TanStack Query `onError` callback
2. **Toast notifications**: User-friendly error messages
3. **UI state**: Loading spinners, disabled buttons
4. **Validation**: Input validation before submission

### State Management

- **Local state**: Modal open/close, active action, input values
- **Reactive state**: Position data from TanStack Query
- **Wallet state**: Connected wallets from `useWallet()`
- **Mutation state**: Loading, error, success from TanStack Query

## Best Practices

1. **Always check position health** before taking action
2. **Add collateral early** when approaching medium risk
3. **Monitor accrued interest** - it compounds over time
4. **Use cover for partial payments** to avoid full close
5. **Confirm transactions** carefully - they're irreversible

## Future Enhancements

Potential improvements:

- [ ] Real-time price feeds for accurate health calculation
- [ ] Liquidation price calculator
- [ ] Position history and PnL tracking
- [ ] Batch operations (close multiple positions)
- [ ] Automated health monitoring with alerts
- [ ] Position analytics and charts
- [ ] Export position data

## Related Files

- `/src/views/whaleswap/PoolDetail.vue` - Main pool page with positions tab
- `/src/whaleswap/composables/useWhaleswapPositions.ts` - Position queries
- `/src/whaleswap/composables/useWhaleswapClient.ts` - REST API client
- `/src/whaleswap/utils/queryKeys.ts` - Query key factory
- `/src/whaleswap/utils/types.ts` - TypeScript types
- `/src/composables/useWallet.js` - Wallet connection and transactions

## References

- [Whaleswap Guide](./whaleswap_guide.md) - End-to-end usage examples
- [TanStack Query Docs](https://tanstack.com/query/latest) - Data fetching
- [Shadcn Vue](https://www.shadcn-vue.com/) - UI components
- [Cosmos SDK](https://docs.cosmos.network/) - Blockchain framework
