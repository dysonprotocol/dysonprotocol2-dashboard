# Denom Normalization Explanation for WhaleswapIndex.vue

## Understanding Base vs Display Denoms

### Base Denom

- The **smallest unit** stored on-chain
- Examples:
  - `"udys"` - base denom with exponent 6 (1,000,000 udys = 1 DYS2)
  - `"xxx.dys"` - base denom with exponent 0 (1 xxx.dys = 1 xxx.dys)
- All amounts in API responses and internal calculations use **base units**

### Display Denom

- The **human-readable unit** shown to users
- Examples:
  - `"DYS2"` - display denom for base `"udys"` (exponent 6)
  - `"xxx.dys"` - display denom might be `"XXX"` or the name from metadata
- Determined by querying `DenomMetadata` for the `display` field

### How Normalization Works

`DenomMetadata.normalize({ amount: string, denom: string })` converts amounts:

**Input:**

- `amount`: Amount in the given denom's units (can be base or any unit)
- `denom`: The denom identifier (base denom or any unit/alias)

**Output:**

```typescript
{
  base: { amount: string, denom: string },      // Always in base units
  display: { amount: string, denom: string },   // In display units
  metadata: DenomMetadata
}
```

**Example:**

```typescript
// Normalize 1,000,000 udys (base units)
const norm = DenomMetadata.normalize({ amount: '1000000', denom: 'udys' })
// Returns:
// {
//   base: { amount: '1000000', denom: 'udys' },
//   display: { amount: '1', denom: 'DYS2' },
//   metadata: { ... }
// }
```

## Current Issues in WhaleswapIndex.vue

### Problem 1: Manual Division Instead of Normalization

The code manually divides by 1,000,000:

```typescript
function formatUdys(value: string) {
  const units = Number(value) / 1_000_000 // ❌ WRONG: Assumes exponent 6
  // ...
}
```

**Why this is wrong:**

1. Assumes all denoms have exponent 6 (only true for `udys`)
2. Doesn't use `DenomMetadata` to find the correct exponent
3. Doesn't show the correct display denom name
4. Breaks for other denoms like `xxx.dys` (exponent 0)

### Problem 2: Amounts Are in Base Units But Not Normalized

All marketcap data fields are in **base units**:

- `row.price_udys` - price in base `udys` units
- `row.marketcap_udys` - market cap in base `udys` units
- `row.liquidity_udys` - liquidity in base `udys` units
- `row.supply` - supply in base units of `row.denom`

These must be normalized to display units before showing to users.

### Problem 3: Display Denom Not Shown Correctly

- `quoteDisplay` correctly resolves `'udys'` → `'DYS2'`
- But amounts are shown without proper normalization
- Supply column doesn't show the display denom at all

## Places That Need Normalization

### 1. Price Column (Line 34, 117)

**Current:**

```typescript
price: formatPrice(row.price_udys)
// Shows: "0.000001" (wrong - this is base unit price)
```

**Should be:**

```typescript
const priceNorm = DenomMetadata.normalize({
  amount: row.price_udys,
  denom: 'udys',
})
price: formatPrice(priceNorm.display.amount)
priceDenom: priceNorm.display.denom // "DYS2"
```

**Template:**

```vue
<TableCell>{{ row.price }} {{ row.priceDenom }}</TableCell>
```

### 2. Market Cap Column (Line 35, 118)

**Current:**

```typescript
marketcap: formatUdys(row.marketcap_udys, { notation: 'compact' })
// Shows: "1.23 DYS2" (denom correct, but amount wrong if not normalized)
```

**Should be:**

```typescript
const marketcapNorm = DenomMetadata.normalize({
  amount: row.marketcap_udys,
  denom: 'udys',
})
marketcap: formatAmount(marketcapNorm.display.amount, { notation: 'compact' })
marketcapDenom: marketcapNorm.display.denom // "DYS2"
```

**Template:**

```vue
<TableCell>{{ row.marketcap }} {{ row.marketcapDenom }}</TableCell>
```

### 3. Liquidity Column (Line 36, 119)

**Current:**

```typescript
liquidity: formatUdys(row.liquidity_udys, { notation: 'compact' })
// Shows: "1.23 DYS2" (denom correct, but amount wrong if not normalized)
```

**Should be:**

```typescript
const liquidityNorm = DenomMetadata.normalize({
  amount: row.liquidity_udys,
  denom: 'udys',
})
liquidity: formatAmount(liquidityNorm.display.amount, { notation: 'compact' })
liquidityDenom: liquidityNorm.display.denom // "DYS2"
```

**Template:**

```vue
<TableCell>{{ row.liquidity }} {{ row.liquidityDenom }}</TableCell>
```

### 4. Supply Column (Line 37, 120)

**Current:**

```typescript
supply: formatUdys(row.supply)
// Shows: "1234567" (wrong - assumes udys, doesn't show denom)
```

**Should be:**

```typescript
const supplyNorm = DenomMetadata.normalize({
  amount: row.supply,
  denom: row.denom, // Use the row's base denom
})
supply: formatAmount(supplyNorm.display.amount)
supplyDenom: supplyNorm.display.denom // e.g., "XXX" for "xxx.dys"
```

**Template:**

```vue
<TableCell>{{ row.supply }} {{ row.supplyDenom }}</TableCell>
```

### 5. Quote Display Variable (Line 22)

**Current:**

```typescript
const quoteDisplay = computed(() => resolveDisplayDenom('udys'))
// ✅ This is correct - resolves 'udys' → 'DYS2'
```

**But:** The amounts using this quote need to be normalized first (see #2 and #3 above).

## Implementation Pattern

Replace manual formatting functions with normalization:

```typescript
import { DenomMetadata } from '@/orm/models/bank/DenomMetadata'

// Replace formatUdys() and formatPrice() with:
function formatDisplayAmount(value: string, opts?: Intl.NumberFormatOptions) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  const maxDigits = opts?.notation === 'compact' ? 2 : num >= 1 ? 2 : 4
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDigits,
    ...opts,
  }).format(num)
}

// In rows computed:
.map((row, index) => {
  const display = resolveDisplayDenom(row.denom)

  // Normalize price (in base udys units)
  const priceNorm = DenomMetadata.normalize({
    amount: row.price_udys,
    denom: 'udys'
  })

  // Normalize marketcap (in base udys units)
  const marketcapNorm = DenomMetadata.normalize({
    amount: row.marketcap_udys,
    denom: 'udys'
  })

  // Normalize liquidity (in base udys units)
  const liquidityNorm = DenomMetadata.normalize({
    amount: row.liquidity_udys,
    denom: 'udys'
  })

  // Normalize supply (in base denom units)
  const supplyNorm = DenomMetadata.normalize({
    amount: row.supply,
    denom: row.denom
  })

  return {
    id: `${row.denom}-${row.config_hash}`,
    denom: row.denom,
    display,
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
```

## Summary

**All amounts must be normalized using `DenomMetadata.normalize()` before display:**

1. ✅ Price: Normalize `row.price_udys` with denom `'udys'` → show `display.amount` + `display.denom`
2. ✅ Market Cap: Normalize `row.marketcap_udys` with denom `'udys'` → show `display.amount` + `display.denom`
3. ✅ Liquidity: Normalize `row.liquidity_udys` with denom `'udys'` → show `display.amount` + `display.denom`
4. ✅ Supply: Normalize `row.supply` with denom `row.denom` → show `display.amount` + `display.denom`
5. ✅ Quote Display: Already correct (`resolveDisplayDenom('udys')` → `'DYS2'`)

**Key Principle:** Always use `DenomMetadata.normalize()` to convert base units to display units. Never manually divide by exponents.
