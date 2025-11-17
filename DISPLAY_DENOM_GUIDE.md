Based on my research of the `bank.proto` file and the implementation in this Dyson Protocol dashboard, here's a comprehensive outline on denom metadata concepts and implementations:

## Denom Metadata Concepts

### Core Data Structures

**DenomMetadata** (from `bank.proto`):
- `base`: The fundamental denomination unit (exponent = 0)
- `display`: Suggested denomination for client display
- `denom_units[]`: Array of units with denom names, exponents, and aliases
- `name`, `symbol`, `description`: Human-readable metadata

**DenomUnit**:
- `denom`: String name (e.g., "uatom", "atom")
- `exponent`: Power of 10 for conversion (e.g., 6 for atom ↔ uatom)
- `aliases[]`: Alternative names for the same unit

### Base Amount vs Display Amount

**Base Amount/Denom**:
- **Definition**: Raw, fundamental unit stored on-chain (always exponent = 0)
- **Example**: `1500000000000000000 uatom`
- **Use Cases**:
  - Blockchain storage and transactions
  - All protocol-level operations (swaps, transfers, etc.)
  - Backend calculations and validations
  - Gas-efficient (minimal digits)

**Display Amount/Denom**:
- **Definition**: Human-readable unit for UI presentation
- **Example**: `1.5 ATOM`
- **Use Cases**:
  - User interfaces and input forms
  - Client-side display and formatting
  - User input validation and feedback
  - Improved UX (fewer zeros, familiar units)

### Conversion Logic

```
display_amount = base_amount / (10 ^ exponent)
base_amount = display_amount * (10 ^ exponent)
```

**Example with ATOM metadata**:
- Base: `uatom` (exponent = 0)
- Display: `atom` (exponent = 6)
- Conversion: `1 atom = 1,000,000 uatom`

## Implementation Patterns

### Frontend Normalization (useDenomMetadata)

**Key Functions**:
- `normalize({amount, denom})`: Converts any denom/amount to both base and display formats
- `resolveDisplayDenom(baseDenom)`: Maps base denom to display denom
- `resolveBaseDenom(anyDenom)`: Resolves aliases/any form to base denom

**Usage Pattern**:
```typescript
const normalized = metadata.normalize({
  amount: "1500000000000000000",
  denom: "uatom"
})
// Returns:
// {
//   base: { amount: "1500000000000000000", denom: "uatom" },
//   display: { amount: "1.5", denom: "atom" },
//   metadata: {...}
// }
```

### Input Handling (AmountDenomSelector)

**Input Flow**:
1. User types `1.5` in display format
2. Component converts to base: `1500000000000000000 uatom`
3. Emits base amount for transaction processing
4. UI shows display format for readability

**Display Flow**:
1. Receives base amount from backend/queries
2. Converts to display format for UI rendering
3. Shows `1.5 ATOM` instead of raw uatom amount

### Query/Transaction Patterns

**Queries**: Backend returns base amounts → Frontend normalizes for display
**Transactions**: Frontend converts user input to base amounts → Sends to blockchain
**Storage**: All on-chain data uses base denominations

### Use Case Examples

**AMM Pool Display**:
- Pool stores: `[1000000000000 uatom, 5000000000000000000 uusdc]`
- UI shows: `[1,000 ATOM, 5,000 USDC]`

**User Input for Swap**:
- User enters: `1.5 ATOM`
- Transaction sends: `1500000000000000000 uatom`

**Orderbook Offers**:
- Stored as: `have: 1000000000000 uatom, want: 5000000000 uusdc`
- Displayed as: `Have: 1,000 ATOM, Want: 5,000 USDC`

This system enables the blockchain to operate efficiently with minimal base units while providing users with intuitive, human-readable interfaces for all denom-related operations.
