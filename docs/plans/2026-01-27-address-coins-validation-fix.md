# Fix AddressCoins.vue Validation and Clearing Bugs

**Date:** 2026-01-27
**Status:** Approved
**Scope:** `src/views/address/AddressCoins.vue`

## Problem

When sending multiple coins in a row, the form exhibits buggy behavior:

1. **Stale amount** — After successful send, the AmountDenomSelector retains the previous amount because `selectorBaseAmount` is not cleared
2. **Unexpected checkbox uncheck** — The watcher includes `balances` in dependencies, so balance refreshes uncheck the confirmation checkbox
3. **Stale recipient text** — `sendToText` (display input) is not cleared, only `sendTo` (resolved address)

## Design Decisions

- **Full form reset** after each send (clear recipient, amount, confirmation)
- **Keep selected denom** so repeat sends of the same token are faster
- **Require re-confirmation** for any field change (recipient, amount, or denom)
- **Remove balance-refresh side effect** from the confirmation watcher

## Implementation

### Change 1: Fix the watcher dependencies

Remove `balances` from the watcher array. Only user-controlled fields should trigger validation and confirmation reset.

```typescript
// Before
watch([sendTo, sendAmount, sendDenom, balances], () => {

// After
watch([sendTo, sendAmount, sendDenom], () => {
```

### Change 2: Clear all form fields after successful send

In `submitSend()`, after the transaction succeeds:

```typescript
await refresh()
sendTo.value = ''
sendToText.value = ''           // ADD: clear display text
sendAmount.value = ''
selectorBaseAmount.value = ''   // ADD: sync with AmountDenomSelector
// Keep sendDenom and selectorBaseDenom (user preference)
confirm.value = false
runValidation()
```

## Testing

1. Send coins successfully → form clears completely except denom
2. Send again with same denom → no stale amount in input
3. Balance refresh (via other tab or polling) → checkbox stays checked if user checked it
4. Change recipient/amount/denom → checkbox unchecks (expected)
