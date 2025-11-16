<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import type { Pool } from '@/whaleswap/utils/types'

const props = defineProps<{
  pool: Pool
  base: string
  quote: string
}>()

const wallet = useWallet()
const swapIn = ref({ amount: '', denom: '' })
const swapOut = ref({ amount: '', denom: '' })
const isPending = ref(false)
const swapError = ref('')
const updatingFromSwapIn = ref(false)
const updatingFromSwapOut = ref(false)
const lastEdited = ref<'in' | 'out' | null>(null)

console.log('[SwapPanel] pool:', props.pool)
console.log('[SwapPanel] base:', props.base, 'quote:', props.quote)

// Persisted wallet selection per pool
const selectedExecutor = useLocalStorage(`whaleswap:pool:swap:executor`, '')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)

const baseDenoms = computed(() => {
  const denoms: string[] = []
  if (props.base) denoms.push(props.base)
  if (props.quote) denoms.push(props.quote)
  return denoms
})

const coins = computed(() => props.pool.coins || [])
const baseCoin = computed(() => coins.value.find((c) => c.denom === props.base))
const quoteCoin = computed(() => coins.value.find((c) => c.denom === props.quote))

function getFeeRate(outputDenom: string): number {
  // Use fee_rate if available (per-denom), fallback to fee_pct (deprecated)
  if (props.pool.fee_rate && Array.isArray(props.pool.fee_rate)) {
    const feeCoin = props.pool.fee_rate.find((f) => f.denom === outputDenom)
    if (feeCoin) {
      return parseFloat(feeCoin.amount)
    }
  }
  // Fallback to deprecated fee_pct
  if (props.pool.fee_pct) {
    return parseFloat(props.pool.fee_pct)
  }
  return 0
}

function calculateSwapOutput(inputAmount: string, inputDenom: string): string {
  if (!inputAmount || inputDenom === '') return ''
  if (!baseCoin.value || !quoteCoin.value) return ''

  const inputCoin = inputDenom === props.base ? baseCoin.value : quoteCoin.value
  const outputCoin = inputDenom === props.base ? quoteCoin.value : baseCoin.value

  const inputReserve = BigInt(inputCoin.amount)
  const outputReserve = BigInt(outputCoin.amount)

  if (inputReserve === 0n || outputReserve === 0n) return ''

  const inputAmt = BigInt(inputAmount)
  if (inputAmt === 0n) return ''

  // Fee is applied to output denom
  const outputDenom = outputCoin.denom
  const feeRate = getFeeRate(outputDenom)
  const feeMultiplier = 1 - feeRate
  const feeMultiplierInt = BigInt(Math.floor(feeMultiplier * 1000000))

  const numerator = inputAmt * outputReserve * feeMultiplierInt
  const denominator = inputReserve * BigInt(1000000) + inputAmt * feeMultiplierInt

  if (denominator === 0n) return ''

  const outputAmt = numerator / denominator
  return String(outputAmt)
}

function calculateSwapInput(outputAmount: string, outputDenom: string): string {
  if (!outputAmount || outputDenom === '') return ''
  if (!baseCoin.value || !quoteCoin.value) return ''

  const outputCoin = outputDenom === props.base ? baseCoin.value : quoteCoin.value
  const inputCoin = outputDenom === props.base ? quoteCoin.value : baseCoin.value

  const inputReserve = BigInt(inputCoin.amount)
  const outputReserve = BigInt(outputCoin.amount)

  if (inputReserve === 0n || outputReserve === 0n) return ''

  const outputAmt = BigInt(outputAmount)
  if (outputAmt === 0n) return ''

  // For exact-out with output-side fees:
  // outputAmt is what user wants to receive (after fee)
  // We need to calculate rawOutputAmt (amount removed from pool before fee)
  const feeRate = getFeeRate(outputDenom)
  const feeMultiplier = 1 - feeRate
  const feeMultiplierInt = BigInt(Math.floor(feeMultiplier * 1000000))

  // rawOutputAmt = outputAmt / feeMultiplier
  const rawOutputAmt = (outputAmt * BigInt(1000000)) / feeMultiplierInt

  if (rawOutputAmt >= outputReserve) return ''

  // Constant product formula: inputAmt = (rawOutputAmt * inputReserve) / (outputReserve - rawOutputAmt)
  const numerator = rawOutputAmt * inputReserve
  const denominator = outputReserve - rawOutputAmt

  if (denominator === 0n) return ''

  const inputAmt = numerator / denominator
  return String(inputAmt)
}

// Slippage tolerance: user-configurable from 0-10%, persisted per pool
const slippagePercent = useLocalStorage(`whaleswap:pool:${props.pool.pool_id}:slippage`, [0.5])
const slippageTolerance = computed(() => slippagePercent.value[0] / 100)

// Fee is applied to the OUTPUT denom of each swap leg
// This means the fee rate depends on which direction you're swapping
const swapFeeRate = computed(() => {
  if (!swapOut.value.denom) return null
  return getFeeRate(swapOut.value.denom)
})

const swapFeeDisplay = computed(() => {
  if (swapFeeRate.value === null || !swapOut.value.denom) return null
  try {
    const normalized = wallet.normalizeCoin({ amount: '0', denom: swapOut.value.denom })
    return {
      rate: swapFeeRate.value,
      percentage: (swapFeeRate.value * 100).toFixed(3),
      denom: swapOut.value.denom,
      displayDenom: normalized.display.denom,
    }
  } catch (e) {
    console.error('[SwapPanel] Failed to normalize fee denom:', e)
    return {
      rate: swapFeeRate.value,
      percentage: (swapFeeRate.value * 100).toFixed(3),
      denom: swapOut.value.denom,
      displayDenom: swapOut.value.denom,
    }
  }
})

const expectedOutput = computed(() => {
  if (lastEdited.value === 'in' && swapIn.value.amount && swapIn.value.denom) {
    // Recalculate expected output (before slippage)
    return calculateSwapOutput(swapIn.value.amount, swapIn.value.denom)
  }
  if (lastEdited.value === 'out' && swapOut.value.amount && swapOut.value.denom) {
    // swapOut is exact output, no slippage calculation needed
    return swapOut.value.amount
  }
  return null
})

const minOutput = computed(() => {
  if (lastEdited.value === 'in' && swapOut.value.amount) {
    // swapOut already contains the minimum (expected - slippage)
    return BigInt(swapOut.value.amount)
  }
  if (lastEdited.value === 'out' && swapOut.value.amount) {
    // Exact-out: minimum equals exact output
    return BigInt(swapOut.value.amount)
  }
  if (!expectedOutput.value) return null
  const expected = BigInt(expectedOutput.value)
  return BigInt(Math.floor(Number(expected) * (1 - slippageTolerance.value)))
})

const maxInput = computed(() => {
  if (lastEdited.value === 'out' && swapIn.value.amount) {
    // swapIn already contains the maximum (expected + slippage)
    return BigInt(swapIn.value.amount)
  }
  if (lastEdited.value === 'in' && swapIn.value.amount) {
    // Exact-in: maximum equals exact input
    return BigInt(swapIn.value.amount)
  }
  return null
})

const slippageInfo = computed(() => {
  if (!swapOut.value.denom) return null

  const isExactIn = lastEdited.value === 'in'
  const isExactOut = lastEdited.value === 'out'

  if (isExactIn) {
    // Exact-in: show expected output and min output with slippage protection
    if (!expectedOutput.value) return null

    const expected = BigInt(expectedOutput.value)
    const min = minOutput.value

    if (!min) return null

    const slippagePct = Number(((expected - min) * 10000n) / expected) / 100

    try {
      const expectedNormalized = wallet.normalizeCoin({
        amount: expected.toString(),
        denom: swapOut.value.denom,
      })
      const minNormalized = wallet.normalizeCoin({
        amount: min.toString(),
        denom: swapOut.value.denom,
      })
      const displayDenom = expectedNormalized.display.denom

      return {
        mode: 'exact-in',
        expected: expected.toString(),
        min: min.toString(),
        expectedDisplay: expectedNormalized.display.amount,
        minDisplay: minNormalized.display.amount,
        displayDenom,
        slippagePct,
      }
    } catch (e) {
      console.error('[SwapPanel] Failed to normalize slippage info:', e)
      return {
        mode: 'exact-in',
        expected: expected.toString(),
        min: min.toString(),
        expectedDisplay: expected.toString(),
        minDisplay: min.toString(),
        displayDenom: swapOut.value.denom,
        slippagePct,
      }
    }
  } else if (isExactOut) {
    // Exact-out: show exact output and max input with slippage
    if (!swapIn.value.amount || !swapOut.value.amount) return null

    const exactOutput = BigInt(swapOut.value.amount)
    // Recalculate expected input (before slippage)
    const expectedInputStr = calculateSwapInput(swapOut.value.amount, swapOut.value.denom)
    if (!expectedInputStr) return null
    const expectedInput = BigInt(expectedInputStr)
    // swapIn already contains the maximum (expected + slippage)
    const max = BigInt(swapIn.value.amount)
    const bufferPct = Number(((max - expectedInput) * 10000n) / expectedInput) / 100

    try {
      const outputNormalized = wallet.normalizeCoin({
        amount: exactOutput.toString(),
        denom: swapOut.value.denom,
      })
      const expectedInputNormalized = wallet.normalizeCoin({
        amount: expectedInput.toString(),
        denom: swapIn.value.denom,
      })
      const maxNormalized = wallet.normalizeCoin({
        amount: max.toString(),
        denom: swapIn.value.denom,
      })

      return {
        mode: 'exact-out',
        exactOutput: exactOutput.toString(),
        calculatedInput: expectedInput.toString(),
        maxInput: max.toString(),
        exactOutputDisplay: outputNormalized.display.amount,
        calculatedInputDisplay: expectedInputNormalized.display.amount,
        maxInputDisplay: maxNormalized.display.amount,
        outputDisplayDenom: outputNormalized.display.denom,
        inputDisplayDenom: expectedInputNormalized.display.denom,
        bufferPct,
      }
    } catch (e) {
      console.error('[SwapPanel] Failed to normalize slippage info:', e)
      return {
        mode: 'exact-out',
        exactOutput: exactOutput.toString(),
        calculatedInput: expectedInput.toString(),
        maxInput: max.toString(),
        exactOutputDisplay: exactOutput.toString(),
        calculatedInputDisplay: expectedInput.toString(),
        maxInputDisplay: max.toString(),
        outputDisplayDenom: swapOut.value.denom,
        inputDisplayDenom: swapIn.value.denom,
        bufferPct,
      }
    }
  }

  return null
})

watch(
  () => [swapIn.value.amount, swapIn.value.denom],
  (newVal, oldVal) => {
    if (updatingFromSwapOut.value) return
    if (!oldVal) return
    if (newVal[0] === oldVal[0] && newVal[1] === oldVal[1]) return

    updatingFromSwapIn.value = true
    lastEdited.value = 'in'
    swapError.value = ''

    try {
      const outputDenom = swapIn.value.denom === props.base ? props.quote : props.base

      if (!swapIn.value.amount || swapIn.value.denom === '') {
        // Clear amount but set opposite denom if input denom is selected
        if (swapIn.value.denom && outputDenom) {
          if (swapOut.value.denom !== outputDenom || swapOut.value.amount !== '') {
            swapOut.value = { amount: '', denom: outputDenom }
          }
        } else {
          if (swapOut.value.amount || swapOut.value.denom) {
            swapOut.value = { amount: '', denom: '' }
          }
        }
        lastEdited.value = null
        return
      }

      const expectedOutput = calculateSwapOutput(swapIn.value.amount, swapIn.value.denom)

      if (!expectedOutput) {
        return
      }

      // Apply slippage: show minimum output (expected - slippage%)
      const minOutputAmount = BigInt(
        Math.floor(Number(expectedOutput) * (1 - slippageTolerance.value))
      )

      const newOutput = {
        amount: String(minOutputAmount),
        denom: outputDenom,
      }

      if (swapOut.value.amount === newOutput.amount && swapOut.value.denom === newOutput.denom) {
        return
      }

      console.log('[SwapPanel] Updating swapOut from swapIn:', {
        input: swapIn.value,
        outputDenom,
        expectedOutput,
        minOutputAmount: String(minOutputAmount),
        slippage: slippageTolerance.value,
      })

      swapOut.value = newOutput
    } finally {
      nextTick(() => {
        updatingFromSwapIn.value = false
      })
    }
  },
  { flush: 'post' }
)

watch(
  () => [swapOut.value.amount, swapOut.value.denom],
  (newVal, oldVal) => {
    if (updatingFromSwapIn.value) return
    if (!oldVal) return
    if (newVal[0] === oldVal[0] && newVal[1] === oldVal[1]) return

    updatingFromSwapOut.value = true
    lastEdited.value = 'out'
    swapError.value = ''

    try {
      const inputDenom = swapOut.value.denom === props.base ? props.quote : props.base

      if (!swapOut.value.amount || swapOut.value.denom === '') {
        // Clear amount but set opposite denom if output denom is selected
        if (swapOut.value.denom && inputDenom) {
          if (swapIn.value.denom !== inputDenom || swapIn.value.amount !== '') {
            swapIn.value = { amount: '', denom: inputDenom }
          }
        } else {
          if (swapIn.value.amount || swapIn.value.denom) {
            swapIn.value = { amount: '', denom: '' }
          }
        }
        lastEdited.value = null
        return
      }

      const expectedInput = calculateSwapInput(swapOut.value.amount, swapOut.value.denom)

      if (!expectedInput) {
        return
      }

      // Apply slippage: show maximum input (expected + slippage%)
      const maxInputAmount = BigInt(
        Math.ceil(Number(expectedInput) * (1 + slippageTolerance.value))
      )

      const newInput = {
        amount: String(maxInputAmount),
        denom: inputDenom,
      }

      if (swapIn.value.amount === newInput.amount && swapIn.value.denom === newInput.denom) {
        return
      }

      console.log('[SwapPanel] Updating swapIn from swapOut:', {
        output: swapOut.value,
        inputDenom,
        expectedInput,
        maxInputAmount: String(maxInputAmount),
        slippage: slippageTolerance.value,
      })

      swapIn.value = newInput
    } finally {
      nextTick(() => {
        updatingFromSwapOut.value = false
      })
    }
  },
  { flush: 'post' }
)

// Watch slippage changes and update the corresponding field
watch(
  slippagePercent,
  () => {
    if (updatingFromSwapIn.value || updatingFromSwapOut.value) return

    if (lastEdited.value === 'in' && swapIn.value.amount && swapIn.value.denom) {
      // Recalculate minimum output with new slippage
      const expectedOutput = calculateSwapOutput(swapIn.value.amount, swapIn.value.denom)
      if (expectedOutput) {
        const minOutputAmount = BigInt(
          Math.floor(Number(expectedOutput) * (1 - slippageTolerance.value))
        )
        const outputDenom = swapIn.value.denom === props.base ? props.quote : props.base
        updatingFromSwapIn.value = true
        swapOut.value = { amount: String(minOutputAmount), denom: outputDenom }
        nextTick(() => {
          updatingFromSwapIn.value = false
        })
      }
    } else if (lastEdited.value === 'out' && swapOut.value.amount && swapOut.value.denom) {
      // Recalculate maximum input with new slippage
      const expectedInput = calculateSwapInput(swapOut.value.amount, swapOut.value.denom)
      if (expectedInput) {
        const maxInputAmount = BigInt(
          Math.ceil(Number(expectedInput) * (1 + slippageTolerance.value))
        )
        const inputDenom = swapOut.value.denom === props.base ? props.quote : props.base
        updatingFromSwapOut.value = true
        swapIn.value = { amount: String(maxInputAmount), denom: inputDenom }
        nextTick(() => {
          updatingFromSwapOut.value = false
        })
      }
    }
  },
  { deep: true }
)

const canSwap = computed(() => {
  return (
    selectedExecutorAddress.value &&
    swapIn.value.amount &&
    swapIn.value.denom &&
    swapOut.value.amount &&
    swapOut.value.denom &&
    props.base &&
    props.quote
  )
})

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.whaleswap.v1.MsgPoolSwap'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgPoolSwap' : 'Wrong msg' }
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

async function executeSwap() {
  swapError.value = ''
  if (!canSwap.value) return

  isPending.value = true
  console.log('[SwapPanel] Executing swap:', {
    swapIn: swapIn.value,
    swapOut: swapOut.value,
    lastEdited: lastEdited.value,
    poolId: props.pool.pool_id,
    executorAddress: selectedExecutorAddress.value,
    granteeAddress: selectedGranteeAddress.value,
    isAuthz: isAuthz.value,
  })

  try {
    if (!props.base || !props.quote) {
      swapError.value = 'Invalid pool pair'
      return
    }

    const isExactIn = lastEdited.value === 'in'
    const isExactOut = lastEdited.value === 'out'

    let msg: any

    if (isExactIn) {
      // Exact-in: swap_in is exact, min_output has slippage protection
      const expected = expectedOutput.value
        ? BigInt(expectedOutput.value)
        : BigInt(swapOut.value.amount)
      const min =
        minOutput.value || BigInt(Math.floor(Number(expected) * (1 - slippageTolerance.value)))

      msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgPoolSwap',
        trader: selectedExecutorAddress.value,
        max_input: [{ denom: swapIn.value.denom, amount: swapIn.value.amount }],
        legs: [
          {
            pool_id: props.pool.pool_id,
            swap_in: { denom: swapIn.value.denom, amount: swapIn.value.amount },
          },
        ],
        min_output: [{ denom: swapOut.value.denom, amount: String(min) }],
      }
    } else if (isExactOut) {
      // Exact-out: swap_out is exact, max_input has slippage tolerance
      const max =
        maxInput.value ||
        BigInt(Math.ceil(Number(swapIn.value.amount) * (1 + slippageTolerance.value)))

      msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgPoolSwap',
        trader: selectedExecutorAddress.value,
        max_input: [{ denom: swapIn.value.denom, amount: String(max) }],
        legs: [
          {
            pool_id: props.pool.pool_id,
            swap_out: { denom: swapOut.value.denom, amount: swapOut.value.amount },
          },
        ],
        min_output: [{ denom: swapOut.value.denom, amount: swapOut.value.amount }],
      }
    } else {
      // Fallback: default to exact-in if neither was edited
      const expected = expectedOutput.value
        ? BigInt(expectedOutput.value)
        : BigInt(swapOut.value.amount)
      const min =
        minOutput.value || BigInt(Math.floor(Number(expected) * (1 - slippageTolerance.value)))

      msg = {
        '@type': '/dysonprotocol.whaleswap.v1.MsgPoolSwap',
        trader: selectedExecutorAddress.value,
        max_input: [{ denom: swapIn.value.denom, amount: swapIn.value.amount }],
        legs: [
          {
            pool_id: props.pool.pool_id,
            swap_in: { denom: swapIn.value.denom, amount: swapIn.value.amount },
          },
        ],
        min_output: [{ denom: swapOut.value.denom, amount: String(min) }],
      }
    }

    console.log('[SwapPanel] Swap message:', msg)

    const executor = selectedExecutorAddress.value
    const result = await wallet.sendMsg({
      msg,
      executorAddress: executor,
      grantee: (isAuthz.value && selectedGranteeAddress.value) || undefined,
      gasLimit: 'auto',
    } as any)

    console.log('[SwapPanel] Swap result:', result)

    if (result?.success) {
      swapIn.value = { amount: '', denom: '' }
      swapOut.value = { amount: '', denom: '' }
      swapError.value = ''
    } else {
      swapError.value = result?.rawLog || 'Swap failed'
    }
  } catch (e: any) {
    console.error('[SwapPanel] Swap error:', e)
    swapError.value = e?.message || String(e)
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <h3 class="text-lg font-semibold mb-4">Swap</h3>
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

      <div class="space-y-2">
        <Label>
          <span v-if="lastEdited === 'in'">Exact swap in</span>
          <span v-else-if="lastEdited === 'out'">Maximum swap in</span>
          <span v-else>Swap In</span>
        </Label>
        <AmountDenomSelector
          v-model:base="swapIn"
          :base-denoms="baseDenoms"
          :default-base-denom="base"
          :disabled="isPending"
        />
      </div>

      <div class="space-y-2">
        <Label>
          <span v-if="lastEdited === 'out'">Exact swap out</span>
          <span v-else-if="lastEdited === 'in'">Minimum swap out</span>
          <span v-else>Swap Out</span>
        </Label>
        <AmountDenomSelector
          v-model:base="swapOut"
          :base-denoms="baseDenoms"
          :default-base-denom="quote"
          :disabled="isPending"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Slippage Tolerance</Label>
          <span class="text-sm text-muted-foreground">{{ slippagePercent[0].toFixed(2) }}%</span>
        </div>
        <Slider
          v-model="slippagePercent"
          :min="0"
          :max="10"
          :step="0.1"
          :disabled="isPending"
          class="w-full"
        />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>10%</span>
        </div>
      </div>

      <div v-if="swapFeeDisplay" class="text-sm space-y-1 p-2 bg-muted rounded">
        <div class="text-muted-foreground">
          Swap fee: {{ swapFeeDisplay.percentage }}% (applied to
          {{ swapFeeDisplay.displayDenom }} output)
        </div>
        <div class="text-xs text-muted-foreground">
          Note: Fee is charged on the output denom, so the rate may vary depending on swap direction
        </div>
      </div>

      <div v-if="slippageInfo" class="text-sm space-y-1 p-2 bg-muted rounded">
        <template v-if="slippageInfo.mode === 'exact-in'">
          <div class="text-muted-foreground">
            Expected: ~{{ slippageInfo.expectedDisplay }} {{ slippageInfo.displayDenom }}
          </div>
          <div class="text-muted-foreground">
            Protected minimum: {{ slippageInfo.minDisplay }} {{ slippageInfo.displayDenom }}
          </div>
          <div class="text-xs text-muted-foreground">
            The swap will fail if you'd receive less than {{ slippageInfo.minDisplay }}
            {{ slippageInfo.displayDenom }}
          </div>
        </template>
        <template v-else-if="slippageInfo.mode === 'exact-out'">
          <div class="text-muted-foreground">
            Required input: ~{{ slippageInfo.calculatedInputDisplay }}
            {{ slippageInfo.inputDisplayDenom }}
          </div>
          <div class="text-muted-foreground">
            Protected maximum: {{ slippageInfo.maxInputDisplay }}
            {{ slippageInfo.inputDisplayDenom }}
          </div>
          <div class="text-xs text-muted-foreground">
            You'll send at most {{ slippageInfo.maxInputDisplay }}
            {{ slippageInfo.inputDisplayDenom }} to receive exactly
            {{ slippageInfo.exactOutputDisplay }} {{ slippageInfo.outputDisplayDenom }}
          </div>
        </template>
      </div>

      <div v-if="swapError" class="text-sm text-destructive">
        {{ swapError }}
      </div>

      <Button @click="executeSwap" :disabled="!canSwap || isPending" class="w-full">
        <span v-if="isPending">Swapping...</span>
        <span v-else>Swap</span>
      </Button>
    </div>
  </div>
</template>
