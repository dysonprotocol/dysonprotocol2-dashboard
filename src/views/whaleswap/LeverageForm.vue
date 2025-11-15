<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import type { Pool, DecCoin, Coin } from '@/whaleswap/utils/types'

const props = defineProps<{
  pool: Pool
  base: string
  quote: string
}>()

const wallet = useWallet()

// Direction: 'long' or 'short'
const direction = ref<'long' | 'short'>('long')
// Target asset to long/short
const targetAsset = ref('')
// Leverage multiplier (e.g., 2x, 3x, 5x)
const leverageMultiplier = ref('')
// Collateral amount
const collateralAmount = ref('')

const isPending = ref(false)
const leverageError = ref('')

console.log('[LeverageForm] pool:', props.pool)
console.log('[LeverageForm] base:', props.base, 'quote:', props.quote)

// Persisted wallet selection per pool
const selectedExecutor = useLocalStorage(
  `whaleswap:pool:${props.pool.pool_id}:leverage:executor`,
  ''
)
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const baseDenoms = computed(() => {
  const denoms: string[] = []
  if (props.base) denoms.push(props.base)
  if (props.quote) denoms.push(props.quote)
  return denoms
})

// Initialize target asset to base
watch(
  () => props.base,
  (newBase) => {
    if (newBase && !targetAsset.value) {
      targetAsset.value = newBase
    }
  },
  { immediate: true }
)

const coins = computed(() => props.pool.coins || [])
const baseCoin = computed(() => coins.value.find((c) => c.denom === props.base))
const quoteCoin = computed(() => coins.value.find((c) => c.denom === props.quote))

// Get pool leverage parameters
const minCollateralRatio = computed(() => {
  if (
    !props.pool.min_initial_collateral_ratio ||
    !Array.isArray(props.pool.min_initial_collateral_ratio)
  ) {
    return null
  }
  return props.pool.min_initial_collateral_ratio
})

const maxBorrowPercent = computed(() => {
  if (!props.pool.max_borrow_percent || !Array.isArray(props.pool.max_borrow_percent)) {
    return null
  }
  return props.pool.max_borrow_percent
})

const liquidationThreshold = computed(() => {
  if (!props.pool.liquidation_threshold || !Array.isArray(props.pool.liquidation_threshold)) {
    return null
  }
  return props.pool.liquidation_threshold
})

const interestRate = computed(() => {
  if (!props.pool.interest_rate || !Array.isArray(props.pool.interest_rate)) {
    return null
  }
  return props.pool.interest_rate
})

// Calculate current pool price (quote/base)
const poolPrice = computed(() => {
  if (!baseCoin.value || !quoteCoin.value) return null
  const baseAmt = BigInt(baseCoin.value.amount)
  const quoteAmt = BigInt(quoteCoin.value.amount)
  if (baseAmt === 0n) return null
  const p = Number(quoteAmt) / Number(baseAmt)
  if (props.base === baseCoin.value?.denom && props.quote === quoteCoin.value?.denom) {
    return p
  }
  if (p === 0) return null
  return 1 / p
})

// Determine collateral and borrow denoms based on direction and target asset
// Key: held_denom = pool denom NOT matching borrow_denom
// Long target: want held = target, so borrow = opposite
// Short target: want held = opposite, so borrow = target
const borrowDenom = computed(() => {
  if (!targetAsset.value) return ''
  if (direction.value === 'long') {
    // To go LONG target, borrow the OTHER denom so held = target
    return targetAsset.value === props.base ? props.quote : props.base
  } else {
    // To go SHORT target, borrow target so held = other
    return targetAsset.value
  }
})

const collateralDenom = computed(() => {
  if (!targetAsset.value) return ''
  // Collateral can be either pool denom. For UX simplicity, use held denom
  // (the asset user wants exposure to)
  // For long: collateral = target (held); for short: collateral = opposite (held)
  return direction.value === 'long'
    ? targetAsset.value
    : targetAsset.value === props.base
      ? props.quote
      : props.base
})

// Calculate borrow amount from leverage multiplier
const calculatedBorrowAmount = computed(() => {
  if (!collateralAmount.value || !leverageMultiplier.value || !poolPrice.value) return null

  const collateralAmt = parseFloat(collateralAmount.value)
  if (isNaN(collateralAmt) || collateralAmt <= 0) return null

  const leverage = parseFloat(leverageMultiplier.value)
  if (isNaN(leverage) || leverage < 1) return null

  // Leverage = (collateral + borrowed) / collateral
  // So: borrowed = collateral * (leverage - 1)
  // But we need to account for price conversion if denoms differ
  if (collateralDenom.value === borrowDenom.value) {
    // Same denom: simple calculation
    const borrowAmt = collateralAmt * (leverage - 1)
    return String(Math.floor(borrowAmt))
  }

  // Different denoms: need price conversion
  // Validate denoms are in pool first
  if (
    !baseDenoms.value.includes(collateralDenom.value) ||
    !baseDenoms.value.includes(borrowDenom.value)
  ) {
    return null
  }

  // Convert collateral to borrow denom value
  let collateralValueInBorrowDenom: number
  if (collateralDenom.value === props.base && borrowDenom.value === props.quote) {
    collateralValueInBorrowDenom = collateralAmt * poolPrice.value
  } else if (collateralDenom.value === props.quote && borrowDenom.value === props.base) {
    collateralValueInBorrowDenom = collateralAmt / poolPrice.value
  } else {
    return null
  }

  // Calculate borrow amount in borrow denom
  const borrowAmt = collateralValueInBorrowDenom * (leverage - 1)
  return String(Math.floor(borrowAmt))
})

// Computed refs for AmountDenomSelector components
const collateral = computed({
  get: () => ({
    amount: collateralAmount.value,
    denom: collateralDenom.value,
  }),
  set: (val: { amount: string; denom: string }) => {
    collateralAmount.value = val.amount
  },
})

const borrow = computed({
  get: () => ({
    amount: calculatedBorrowAmount.value || '',
    denom: borrowDenom.value,
  }),
  set: (val: { amount: string; denom: string }) => {
    // If user manually edits borrow, recalculate leverage
    if (val.amount && collateralAmount.value && poolPrice.value) {
      const borrowAmt = parseFloat(val.amount)
      const collateralAmt = parseFloat(collateralAmount.value)
      if (!isNaN(borrowAmt) && !isNaN(collateralAmt) && collateralAmt > 0) {
        let calculatedLeverage: number
        if (collateralDenom.value === borrowDenom.value) {
          calculatedLeverage = (collateralAmt + borrowAmt) / collateralAmt
        } else {
          // Convert collateral to borrow denom
          let collateralValueInBorrowDenom: number
          if (collateralDenom.value === props.base && borrowDenom.value === props.quote) {
            collateralValueInBorrowDenom = collateralAmt * poolPrice.value
          } else {
            collateralValueInBorrowDenom = collateralAmt / poolPrice.value
          }
          calculatedLeverage =
            (collateralValueInBorrowDenom + borrowAmt) / collateralValueInBorrowDenom
        }
        leverageMultiplier.value = calculatedLeverage.toFixed(2)
      }
    }
  },
})

// Calculate collateral value in borrow denom terms
const collateralValueInBorrowDenom = computed(() => {
  if (!collateralAmount.value || !borrowDenom.value || !poolPrice.value) return null

  const collateralAmt = parseFloat(collateralAmount.value)
  if (isNaN(collateralAmt)) return null

  if (collateralDenom.value === borrowDenom.value) {
    return collateralAmt
  }

  // Convert collateral value to borrow denom using pool price
  if (collateralDenom.value === props.base && borrowDenom.value === props.quote) {
    return collateralAmt * poolPrice.value
  } else if (collateralDenom.value === props.quote && borrowDenom.value === props.base) {
    return collateralAmt / poolPrice.value
  }

  return null
})

// Calculate collateral ratio: CR = collateral_value / debt_value
const collateralRatio = computed(() => {
  if (!calculatedBorrowAmount.value || !collateralValueInBorrowDenom.value) return null

  const debtValue = parseFloat(calculatedBorrowAmount.value)
  if (debtValue === 0) return null

  return collateralValueInBorrowDenom.value / debtValue
})

// Calculate leverage ratio
const leverageRatio = computed(() => {
  if (!collateralAmount.value || !calculatedBorrowAmount.value) return null

  const collateralAmt = parseFloat(collateralAmount.value)
  const borrowAmt = parseFloat(calculatedBorrowAmount.value || '0')
  if (isNaN(collateralAmt) || collateralAmt === 0) return null
  if (isNaN(borrowAmt)) return null

  // Convert both to same denom for calculation
  if (collateralDenom.value === borrowDenom.value) {
    return (collateralAmt + borrowAmt) / collateralAmt
  }

  // Use collateral value in borrow denom
  if (collateralValueInBorrowDenom.value) {
    return (collateralValueInBorrowDenom.value + borrowAmt) / collateralValueInBorrowDenom.value
  }

  return null
})

// Calculate liquidation price (approximate)
// NOTE: This is a simplified calculation. Actual liquidation depends on:
// - Which denom is collateral vs borrowed
// - Current pool price definition (quote/base)
// - Accrued interest over time
// - For cross-denom collateral, collateral value changes with price
// - For same-denom collateral/borrow, liquidation only occurs from interest accrual
const liquidationPrice = computed(() => {
  if (
    !collateralRatio.value ||
    !borrowDenomLimits.value?.liquidationThreshold ||
    !poolPrice.value
  ) {
    return null
  }

  const liqThreshold = borrowDenomLimits.value.liquidationThreshold
  const currentCR = collateralRatio.value

  if (currentCR <= liqThreshold) {
    // Already liquidatable
    return poolPrice.value
  }

  // Simplified calculation: assumes price movement affects collateral value
  // This is approximate and may not be accurate for all scenarios
  const priceChangeFactor = currentCR / liqThreshold

  // For long positions: if price drops, collateral value (in borrow denom) may drop
  // For short positions: if price rises, collateral value (in borrow denom) may drop
  // This is simplified and doesn't account for all edge cases
  if (direction.value === 'long') {
    return poolPrice.value / priceChangeFactor
  } else {
    return poolPrice.value * priceChangeFactor
  }
})

// Get relevant pool limits for the borrow denom
const borrowDenomLimits = computed(() => {
  if (!borrowDenom.value || !minCollateralRatio.value) {
    return null
  }

  const minCR = minCollateralRatio.value.find((c: DecCoin) => c.denom === borrowDenom.value)
  const maxBorrow = maxBorrowPercent.value?.find((c: DecCoin) => c.denom === borrowDenom.value)
  const liqThreshold = liquidationThreshold.value?.find(
    (c: DecCoin) => c.denom === borrowDenom.value
  )
  const interest = interestRate.value?.find((c: DecCoin) => c.denom === borrowDenom.value)

  // Calculate max leverage from min collateral ratio
  // CR = collateral_value / debt_value
  // At minimum CR: debt_value = collateral_value / min_CR
  // Leverage = (collateral_value + debt_value) / collateral_value
  // Leverage = 1 + debt_value / collateral_value = 1 + 1/min_CR
  const minCRValue = minCR ? parseFloat(minCR.amount) : null
  const calculatedMaxLeverage = minCRValue ? 1 + 1 / minCRValue : null

  return {
    minCollateralRatio: minCRValue,
    maxLeverageRatio: calculatedMaxLeverage,
    maxBorrowPercent: maxBorrow ? parseFloat(maxBorrow.amount) : null,
    liquidationThreshold: liqThreshold ? parseFloat(liqThreshold.amount) : null,
    interestRate: interest ? parseFloat(interest.amount) : null,
  }
})

// Get max leverage for quick selection
const maxLeverage = computed(() => {
  return borrowDenomLimits.value?.maxLeverageRatio || null
})

// Validation
const validationErrors = computed(() => {
  const errors: string[] = []

  if (!targetAsset.value) {
    return errors
  }

  if (!collateralAmount.value || !collateralDenom.value) {
    return errors
  }

  if (!leverageMultiplier.value || !calculatedBorrowAmount.value) {
    return errors
  }

  if (!borrowDenomLimits.value) {
    errors.push('Pool leverage parameters not configured')
    return errors
  }

  const limits = borrowDenomLimits.value

  if (collateralRatio.value !== null && limits.minCollateralRatio !== null) {
    if (collateralRatio.value < limits.minCollateralRatio) {
      errors.push(
        `Collateral ratio ${collateralRatio.value.toFixed(2)}x is below minimum ${limits.minCollateralRatio.toFixed(2)}x`
      )
    }
  }

  if (leverageRatio.value !== null && limits.maxLeverageRatio !== null) {
    if (leverageRatio.value > limits.maxLeverageRatio) {
      errors.push(
        `Leverage ${leverageRatio.value.toFixed(2)}x exceeds maximum ${limits.maxLeverageRatio.toFixed(2)}x`
      )
    }
  }

  if (limits.maxBorrowPercent !== null && baseCoin.value && quoteCoin.value) {
    const borrowReserve = borrowDenom.value === props.base ? baseCoin.value : quoteCoin.value
    const reserveAmount = BigInt(borrowReserve.amount)

    // Account for outstanding borrows: effectiveAvailable = reserve - total_borrowed
    const totalBorrowed = props.pool.total_borrowed?.find(
      (tb: Coin) => tb.denom === borrowDenom.value
    )
    const outstandingBorrow = totalBorrowed ? BigInt(totalBorrowed.amount) : 0n
    const effectiveAvailable =
      reserveAmount > outstandingBorrow ? reserveAmount - outstandingBorrow : 0n

    const maxBorrowAmount = BigInt(Math.floor(Number(effectiveAvailable) * limits.maxBorrowPercent))
    const borrowAmt = BigInt(calculatedBorrowAmount.value || '0')

    if (borrowAmt > maxBorrowAmount) {
      errors.push(
        `Borrow amount exceeds pool's maximum borrow capacity (${(limits.maxBorrowPercent * 100).toFixed(1)}% of available reserves)`
      )
    }
  }

  return errors
})

const canOpenPosition = computed(() => {
  return (
    selectedExecutorAddress.value &&
    targetAsset.value &&
    collateralAmount.value &&
    collateralDenom.value &&
    leverageMultiplier.value &&
    calculatedBorrowAmount.value &&
    borrowDenom.value &&
    validationErrors.value.length === 0
  )
})

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.whaleswap.v1.MsgOpenPosition'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgOpenPosition' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

function onExecutorAddress(addr: string) {
  selectedExecutorAddress.value = addr || ''
}

function onGranteeAddress(addr: string | null) {
  selectedGranteeAddress.value = addr || ''
}

function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}

async function executeOpenPosition() {
  leverageError.value = ''
  if (!canOpenPosition.value) return

  isPending.value = true
  console.log('[LeverageForm] Opening position:', {
    direction: direction.value,
    targetAsset: targetAsset.value,
    collateral: collateral.value,
    borrow: borrow.value,
    leverage: leverageMultiplier.value,
    poolId: props.pool.pool_id,
    executorAddress: selectedExecutorAddress.value,
    granteeAddress: selectedGranteeAddress.value,
    isAuthz: isAuthz.value,
  })

  try {
    if (!props.base || !props.quote) {
      leverageError.value = 'Invalid pool pair'
      return
    }

    if (!calculatedBorrowAmount.value) {
      leverageError.value = 'Invalid borrow amount calculation'
      return
    }

    const msg = {
      '@type': '/dysonprotocol.whaleswap.v1.MsgOpenPosition',
      trader: selectedExecutorAddress.value,
      pool_id: props.pool.pool_id,
      collateral: {
        denom: collateralDenom.value,
        amount: collateralAmount.value,
      },
      borrow: {
        denom: borrowDenom.value,
        amount: calculatedBorrowAmount.value,
      },
    }

    console.log('[LeverageForm] Open position message:', msg)

    const executor = selectedExecutorAddress.value
    const result = await wallet.sendMsg({
      msg,
      executorAddress: executor,
      grantee: (isAuthz.value && selectedGranteeAddress.value) || undefined,
      gasLimit: 'auto',
    } as any)

    console.log('[LeverageForm] Open position result:', result)

    if (result?.success) {
      collateralAmount.value = ''
      leverageMultiplier.value = ''
      leverageError.value = ''
    } else {
      leverageError.value = result?.rawLog || 'Failed to open position'
    }
  } catch (e: any) {
    console.error('[LeverageForm] Open position error:', e)
    leverageError.value = e?.message || String(e)
  } finally {
    isPending.value = false
  }
}

// Helper to get display denom
function getDisplayDenom(denom: string): string {
  if (!denom) return denom
  try {
    const normalized = wallet.normalizeCoin({ amount: '0', denom })
    return normalized.display.denom
  } catch (e) {
    console.error('[LeverageForm] Failed to get display denom:', e)
    return denom
  }
}

// Extract display denoms to reduce AST nodes
const displayBase = computed(() => getDisplayDenom(props.base))
const displayQuote = computed(() => getDisplayDenom(props.quote))

// Extract click handlers per user preference
function handleLongClick() {
  direction.value = 'long'
}

function handleShortClick() {
  direction.value = 'short'
}
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <h3 class="text-lg font-semibold mb-4">Open Leverage Position</h3>
    <div class="flex-1 space-y-4">
      <div class="space-y-2">
        <Label>Signer</Label>
        <WalletSelector
          v-model="selectedExecutor"
          :button-class="''"
          :msg-type-filter="msgTypeFilter"
          :show-locked="false"
          @update:executor-address="onExecutorAddress"
          @update:grantee-address="onGranteeAddress"
          @update:is-authz="onIsAuthz"
        />
      </div>

      <!-- Direction Selector -->
      <div class="space-y-2">
        <Label>Direction</Label>
        <div class="flex gap-2">
          <Button
            :variant="direction === 'long' ? 'default' : 'outline'"
            class="flex-1"
            :class="direction === 'long' ? 'bg-green-600 hover:bg-green-700' : ''"
            @click="handleLongClick"
            :disabled="isPending"
          >
            Long
          </Button>
          <Button
            :variant="direction === 'short' ? 'default' : 'outline'"
            class="flex-1"
            :class="direction === 'short' ? 'bg-red-600 hover:bg-red-700' : ''"
            @click="handleShortClick"
            :disabled="isPending"
          >
            Short
          </Button>
        </div>
      </div>

      <!-- Target Asset Selector -->
      <div class="space-y-2">
        <Label>Asset to {{ direction === 'long' ? 'Long' : 'Short' }}</Label>
        <div class="flex gap-2">
          <Button
            v-for="denom in baseDenoms"
            :key="denom"
            :variant="targetAsset === denom ? 'default' : 'outline'"
            class="flex-1"
            @click="targetAsset = denom"
            :disabled="isPending"
          >
            {{ getDisplayDenom(denom) }}
          </Button>
        </div>
      </div>

      <!-- Collateral Input -->
      <div class="space-y-2">
        <Label>
          Collateral
          <span class="text-xs text-muted-foreground ml-2">
            ({{ getDisplayDenom(collateralDenom) }})
          </span>
        </Label>
        <AmountDenomSelector
          v-if="collateralDenom"
          v-model:base="collateral"
          :base-denoms="baseDenoms"
          :default-base-denom="collateralDenom"
          :disabled="isPending"
        />
        <div v-else class="text-sm text-muted-foreground p-2 bg-muted rounded">
          Select direction and asset first
        </div>
      </div>

      <!-- Leverage Input -->
      <div class="space-y-2">
        <Label>
          Leverage
          <span v-if="maxLeverage" class="text-xs text-muted-foreground ml-2">
            (Max: {{ maxLeverage.toFixed(2) }}x)
          </span>
        </Label>
        <Input
          v-model="leverageMultiplier"
          type="number"
          step="0.1"
          min="1"
          :max="maxLeverage?.toString()"
          placeholder="2.0"
          :disabled="isPending"
        />
      </div>

      <!-- Borrow Amount Display (Read-only) -->
      <div v-if="calculatedBorrowAmount && borrowDenom" class="space-y-2">
        <div class="text-muted-foreground">
          Borrow Amount (calculated)
          <span class="text-xs text-muted-foreground ml-2">
            ({{ getDisplayDenom(borrowDenom) }})
          </span>
        </div>
        <div class="p-2 bg-muted rounded text-sm font-mono">
          {{ calculatedBorrowAmount }} {{ getDisplayDenom(borrowDenom) }}
        </div>
      </div>

      <!-- Position Preview -->
      <div
        v-if="collateralRatio !== null && leverageRatio !== null && poolPrice !== null"
        class="text-sm space-y-2 p-3 bg-muted rounded border"
      >
        <div class="font-semibold text-foreground">Position Preview</div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="text-muted-foreground">Direction:</div>
          <div
            class="font-semibold"
            :class="direction === 'long' ? 'text-green-600' : 'text-red-600'"
          >
            {{ direction === 'long' ? 'Long' : 'Short' }} {{ getDisplayDenom(targetAsset) }}
          </div>

          <div class="text-muted-foreground">Leverage:</div>
          <div
            class="font-semibold"
            :class="
              borrowDenomLimits?.maxLeverageRatio &&
              leverageRatio <= borrowDenomLimits.maxLeverageRatio
                ? 'text-green-600'
                : 'text-destructive'
            "
          >
            {{ leverageRatio.toFixed(2) }}x
          </div>

          <div class="text-muted-foreground">Collateral Ratio:</div>
          <div
            class="font-semibold"
            :class="
              borrowDenomLimits?.minCollateralRatio &&
              collateralRatio >= borrowDenomLimits.minCollateralRatio
                ? 'text-green-600'
                : 'text-destructive'
            "
          >
            {{ collateralRatio.toFixed(2) }}x
          </div>
          <div class="text-muted-foreground">Entry Price:</div>
          <div class="font-mono">
            {{ poolPrice.toFixed(6) }} {{ displayQuote }}/{{ displayBase }}
          </div>

          <div v-if="liquidationPrice !== null" class="text-muted-foreground">
            Liquidation Price (approx):
          </div>
          <div v-if="liquidationPrice !== null" class="font-mono font-semibold">
            {{ liquidationPrice.toFixed(6) }} {{ displayQuote }}/{{ displayBase }}
          </div>

          <div v-if="borrowDenomLimits?.interestRate" class="text-muted-foreground">
            Interest Rate:
          </div>
          <div v-if="borrowDenomLimits?.interestRate" class="font-mono">
            {{ (borrowDenomLimits.interestRate * 100).toFixed(2) }}% APR
          </div>
        </div>
      </div>

      <!-- Pool Limits Info -->
      <div v-if="borrowDenomLimits" class="text-xs space-y-1 p-2 bg-muted/50 rounded">
        <div class="text-muted-foreground">
          <strong>Pool Limits:</strong>
        </div>
        <div v-if="borrowDenomLimits.minCollateralRatio" class="text-muted-foreground">
          Min Collateral Ratio: {{ borrowDenomLimits.minCollateralRatio.toFixed(2) }}x
        </div>
        <div v-if="borrowDenomLimits.liquidationThreshold" class="text-muted-foreground">
          Liquidation Threshold: {{ borrowDenomLimits.liquidationThreshold.toFixed(2) }}x
        </div>
      </div>

      <div v-if="validationErrors.length > 0" class="text-sm text-destructive space-y-1">
        <div v-for="(error, idx) in validationErrors" :key="idx">{{ error }}</div>
      </div>

      <div v-if="leverageError" class="text-sm text-destructive">
        {{ leverageError }}
      </div>

      <Button @click="executeOpenPosition" :disabled="!canOpenPosition || isPending" class="w-full">
        <span v-if="isPending">Opening Position...</span>
        <span v-else>Open {{ direction === 'long' ? 'Long' : 'Short' }} Position</span>
      </Button>
    </div>
  </div>
</template>
