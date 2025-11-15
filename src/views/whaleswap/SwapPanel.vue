<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
const selectedExecutor = useLocalStorage(`whaleswap:pool:${props.pool.pool_id}:swap:executor`, '')
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
  if (outputAmt >= outputReserve) return ''

  // Fee is applied to output denom
  const feeRate = getFeeRate(outputDenom)
  const feeMultiplier = 1 - feeRate
  const feeMultiplierInt = BigInt(Math.floor(feeMultiplier * 1000000))

  const numerator = outputAmt * inputReserve * BigInt(1000000)
  const denominator = (outputReserve - outputAmt) * feeMultiplierInt

  if (denominator === 0n) return ''

  const inputAmt = numerator / denominator
  return String(inputAmt)
}

const slippageTolerance = 0.005

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
    return calculateSwapOutput(swapIn.value.amount, swapIn.value.denom)
  }
  if (lastEdited.value === 'out' && swapOut.value.amount && swapOut.value.denom) {
    return swapOut.value.amount
  }
  return null
})

const minOutput = computed(() => {
  if (!expectedOutput.value) return null
  const expected = BigInt(expectedOutput.value)
  return BigInt(Math.floor(Number(expected) * (1 - slippageTolerance)))
})

const maxInput = computed(() => {
  if (lastEdited.value === 'out' && swapIn.value.amount) {
    const calculated = BigInt(swapIn.value.amount)
    // Add 5% buffer for exact-out swaps
    return BigInt(Math.ceil(Number(calculated) * 1.05))
  }
  if (lastEdited.value === 'in' && swapIn.value.amount) {
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
    // Exact-out: show exact output and max input with buffer
    if (!swapIn.value.amount || !swapOut.value.amount) return null

    const exactOutput = BigInt(swapOut.value.amount)
    const calculatedInput = BigInt(swapIn.value.amount)
    const max = maxInput.value || BigInt(Math.ceil(Number(calculatedInput) * 1.05))
    const bufferPct = Number(((max - calculatedInput) * 10000n) / calculatedInput) / 100

    try {
      const outputNormalized = wallet.normalizeCoin({
        amount: exactOutput.toString(),
        denom: swapOut.value.denom,
      })
      const inputNormalized = wallet.normalizeCoin({
        amount: calculatedInput.toString(),
        denom: swapIn.value.denom,
      })
      const maxNormalized = wallet.normalizeCoin({
        amount: max.toString(),
        denom: swapIn.value.denom,
      })

      return {
        mode: 'exact-out',
        exactOutput: exactOutput.toString(),
        calculatedInput: calculatedInput.toString(),
        maxInput: max.toString(),
        exactOutputDisplay: outputNormalized.display.amount,
        calculatedInputDisplay: inputNormalized.display.amount,
        maxInputDisplay: maxNormalized.display.amount,
        outputDisplayDenom: outputNormalized.display.denom,
        inputDisplayDenom: inputNormalized.display.denom,
        bufferPct,
      }
    } catch (e) {
      console.error('[SwapPanel] Failed to normalize slippage info:', e)
      return {
        mode: 'exact-out',
        exactOutput: exactOutput.toString(),
        calculatedInput: calculatedInput.toString(),
        maxInput: max.toString(),
        exactOutputDisplay: exactOutput.toString(),
        calculatedInputDisplay: calculatedInput.toString(),
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

    try {
      if (!swapIn.value.amount || swapIn.value.denom === '') {
        if (swapOut.value.amount || swapOut.value.denom) {
          swapOut.value = { amount: '', denom: '' }
        }
        lastEdited.value = null
        return
      }

      const outputDenom = swapIn.value.denom === props.base ? props.quote : props.base
      const outputAmount = calculateSwapOutput(swapIn.value.amount, swapIn.value.denom)

      if (!outputAmount) {
        return
      }

      const newOutput = {
        amount: outputAmount,
        denom: outputDenom,
      }

      if (swapOut.value.amount === newOutput.amount && swapOut.value.denom === newOutput.denom) {
        return
      }

      console.log('[SwapPanel] Updating swapOut from swapIn:', {
        input: swapIn.value,
        outputDenom,
        outputAmount,
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

    try {
      if (!swapOut.value.amount || swapOut.value.denom === '') {
        if (swapIn.value.amount || swapIn.value.denom) {
          swapIn.value = { amount: '', denom: '' }
        }
        lastEdited.value = null
        return
      }

      const inputDenom = swapOut.value.denom === props.base ? props.quote : props.base
      const inputAmount = calculateSwapInput(swapOut.value.amount, swapOut.value.denom)

      if (!inputAmount) {
        return
      }

      const newInput = {
        amount: inputAmount,
        denom: inputDenom,
      }

      if (swapIn.value.amount === newInput.amount && swapIn.value.denom === newInput.denom) {
        return
      }

      console.log('[SwapPanel] Updating swapIn from swapOut:', {
        output: swapOut.value,
        inputDenom,
        inputAmount,
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
      const min = minOutput.value || BigInt(Math.floor(Number(expected) * (1 - slippageTolerance)))

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
      // Exact-out: swap_out is exact, max_input has buffer
      const max = maxInput.value || BigInt(Math.ceil(Number(swapIn.value.amount) * 1.05))

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
      const min = minOutput.value || BigInt(Math.floor(Number(expected) * (1 - slippageTolerance)))

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
          Swap In
          <span v-if="lastEdited === 'in'" class="text-xs text-muted-foreground ml-2">(Exact)</span>
          <span v-else-if="lastEdited === 'out'" class="text-xs text-muted-foreground ml-2"
            >(Max)</span
          >
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
          Swap Out
          <span v-if="lastEdited === 'out'" class="text-xs text-muted-foreground ml-2"
            >(Exact)</span
          >
          <span v-else-if="lastEdited === 'in'" class="text-xs text-muted-foreground ml-2"
            >(Min)</span
          >
        </Label>
        <AmountDenomSelector
          v-model:base="swapOut"
          :base-denoms="baseDenoms"
          :default-base-denom="quote"
          :disabled="isPending"
        />
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
            Expected output: {{ slippageInfo.expectedDisplay }} {{ slippageInfo.displayDenom }}
          </div>
          <div class="text-muted-foreground">
            Minimum output ({{ (slippageTolerance * 100).toFixed(2) }}% slippage tolerance):
            {{ slippageInfo.minDisplay }} {{ slippageInfo.displayDenom }}
          </div>
          <div class="text-xs text-muted-foreground">
            You'll receive at least {{ slippageInfo.minDisplay }}
            {{ slippageInfo.displayDenom }} ({{ slippageInfo.slippagePct?.toFixed(2) || '0.00' }}%
            protection)
          </div>
        </template>
        <template v-else-if="slippageInfo.mode === 'exact-out'">
          <div class="text-muted-foreground">
            Exact output: {{ slippageInfo.exactOutputDisplay }}
            {{ slippageInfo.outputDisplayDenom }}
          </div>
          <div class="text-muted-foreground">
            Calculated input: {{ slippageInfo.calculatedInputDisplay }}
            {{ slippageInfo.inputDisplayDenom }}
          </div>
          <div class="text-muted-foreground">
            Maximum input ({{ slippageInfo.bufferPct?.toFixed(2) || '5.00' }}% buffer):
            {{ slippageInfo.maxInputDisplay }} {{ slippageInfo.inputDisplayDenom }}
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
