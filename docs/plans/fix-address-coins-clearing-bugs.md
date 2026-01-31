# Fix AddressCoins.vue Clearing Bugs

**Type:** fix
**Scope:** `src/views/address/AddressCoins.vue`
**Status:** Ready for implementation

## Enhancement Summary

**Deepened on:** 2026-01-27
**Research:** Vue 3 watcher patterns, project UI skill, existing form patterns

### Validation
- Native HTML checkbox is correct per project UI skill (shadcn-vue Checkbox is buggy)
- Watcher pattern matches Vue 3 best practices (explicit sources, no store-derived data)
- Clearing pattern matches existing address-change watcher (lines 588-604)

## Problem

When sending multiple coins in a row, the form exhibits buggy behavior:
1. Stale amount in input (AmountDenomSelector retains previous amount)
2. Checkbox unchecks unexpectedly on balance refresh
3. Recipient display text not cleared

## Acceptance Criteria

- [ ] After successful send, amount input is empty
- [ ] After successful send, recipient input is empty (both resolved address and display text)
- [ ] Selected denom is preserved for repeat sends
- [ ] Balance refresh does not uncheck confirmation checkbox
- [ ] Changing recipient/amount/denom still unchecks confirmation (expected behavior)

## Implementation

### Change 1: Remove `balances` from watcher (line 413)

**File:** `src/views/address/AddressCoins.vue:413`

```typescript
// Before
watch([sendTo, sendAmount, sendDenom, balances], () => {

// After
watch([sendTo, sendAmount, sendDenom], () => {
```

**Rationale:** `balances` is store-derived data, not user input. Including it causes the watcher to fire on data refresh, unexpectedly unchecking the confirmation.

### Change 2: Clear missing fields in submitSend (around line 455)

**File:** `src/views/address/AddressCoins.vue:454-458`

```typescript
// Before
await refresh()
sendTo.value = ''
sendAmount.value = ''
confirm.value = false
runValidation()

// After
await refresh()
sendTo.value = ''
sendToText.value = ''           // ADD: clear display text
sendAmount.value = ''
selectorBaseAmount.value = ''   // ADD: sync with AmountDenomSelector
// Keep sendDenom and selectorBaseDenom (user preference for repeat sends)
confirm.value = false
runValidation()
```

**Rationale:** The address-change watcher (lines 588-604) already clears all these fields. The post-submit clearing should match, except keeping the denom selection.

## References

- Address-change watcher pattern: `src/views/address/AddressCoins.vue:588-604`
- AmountDenomSelector sync: `src/components/AmountDenomSelector.vue:177-213`
- Design doc: `docs/plans/2026-01-27-address-coins-validation-fix.md`
