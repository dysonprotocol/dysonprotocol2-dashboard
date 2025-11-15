<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import type { LeveragePosition } from '@/whaleswap/utils/types'
import { formatCoin, formatTimestamp, getDisplayDenom } from '@/whaleswap/utils/formatters'
import {
  useClosePositionMutation,
  useAddCollateralMutation,
  useCoverPositionMutation,
  useRemoveCollateralMutation,
  calculatePositionHealth,
} from '@/whaleswap/composables/usePositionMutations'
import { useWhaleswapPool } from '@/whaleswap/composables/useWhaleswapPool'
import { useWallet } from '@/composables/useWallet'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
const props = defineProps<{
  position: LeveragePosition
  poolId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  refresh: []
}>()

const wallet = useWallet()
type WalletAddressEntry = { address: string }
const unlockedWalletEntries = computed(() => wallet.unlockedWallets.value as WalletAddressEntry[])

const collateralInput = ref({ amount: '', denom: props.position.collateral.denom })
const coverPaymentInput = ref({ amount: '', denom: props.position.borrowed.denom })
const closeFraction = ref('1')

// Mutations
const closePositionMutation = useClosePositionMutation()
const addCollateralMutation = useAddCollateralMutation()
const coverPositionMutation = useCoverPositionMutation()
const removeCollateralMutation = useRemoveCollateralMutation()

const closeFractionPresets: Array<{ label: string; value: string }> = [
  { label: 'Max', value: '1' },
  { label: '50%', value: '0.5' },
  { label: '25%', value: '0.25' },
]

// Position health calculation
const health = computed(() => calculatePositionHealth(props.position))

const healthColor = computed(() => {
  switch (health.value.riskLevel) {
    case 'safe':
      return 'bg-green-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'high':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
})

const healthText = computed(() => {
  switch (health.value.riskLevel) {
    case 'safe':
      return 'Safe'
    case 'medium':
      return 'Medium Risk'
    case 'high':
      return 'High Risk'
    default:
      return 'Unknown'
  }
})

const isOwnPosition = computed(() => {
  const unlockedAddresses = unlockedWalletEntries.value.map((walletEntry) => walletEntry.address)
  return unlockedAddresses.includes(props.position.user)
})

const canManage = computed(() => {
  return isOwnPosition.value && props.position.status === 'POSITION_STATUS_OPEN'
})

const executorAddress = computed(() => {
  const unlocked = unlockedWalletEntries.value.find(
    (walletEntry) => walletEntry.address === props.position.user
  )
  return unlocked?.address || ''
})

const borrowedDisplayDenom = computed(() => getDisplayDenom(props.position.borrowed.denom))
const heldDisplayDenom = computed(() => getDisplayDenom(props.position.held.denom))
const collateralBaseDenoms = computed(() => [props.position.collateral.denom])
const borrowedBaseDenoms = computed(() => [props.position.borrowed.denom])

const poolQuery = useWhaleswapPool(() => props.poolId)
const poolCoins = computed(() => poolQuery.data.value?.pool?.coins ?? [])
const heldPoolCoin = computed(() =>
  poolCoins.value.find((coin) => coin.denom === props.position.held.denom)
)
const borrowedPoolCoin = computed(() =>
  poolCoins.value.find((coin) => coin.denom === props.position.borrowed.denom)
)
const heldPriceInBorrowed = computed(() => {
  if (!heldPoolCoin.value || !borrowedPoolCoin.value) return null
  const heldAmt = BigInt(heldPoolCoin.value.amount)
  const borrowedAmt = BigInt(borrowedPoolCoin.value.amount)
  if (heldAmt === 0n) return null
  return Number(borrowedAmt) / Number(heldAmt)
})

const totalDebt = computed(() => {
  const borrowed = BigInt(props.position.borrowed.amount)
  const interest = BigInt(props.position.accrued_interest.amount)
  return {
    denom: props.position.borrowed.denom,
    amount: String(borrowed + interest),
  }
})

const isCloseFractionValid = computed(() => {
  const value = Number(closeFraction.value)
  if (!Number.isFinite(value)) return false
  return value > 0 && value <= 1
})

const distanceToLiquidationPercent = computed(() => {
  if (!Number.isFinite(health.value.distanceToLiquidation)) return Infinity
  if (!Number.isFinite(health.value.liqThreshold) || health.value.liqThreshold <= 0) return Infinity
  return (health.value.distanceToLiquidation / health.value.liqThreshold) * 100
})

const liquidationPrice = computed(() => {
  if (!heldPriceInBorrowed.value) return null
  if (!Number.isFinite(health.value.ratio) || health.value.ratio <= 0) return null
  if (!Number.isFinite(health.value.liqThreshold) || health.value.liqThreshold <= 0) return null
  if (health.value.ratio <= health.value.liqThreshold) return heldPriceInBorrowed.value
  const priceFactor = health.value.liqThreshold / health.value.ratio
  if (priceFactor <= 0) return null
  return heldPriceInBorrowed.value * priceFactor
})

const collateralAmountValidationMessage = computed(() =>
  validatePositiveWholeAmount(collateralInput.value.amount)
)
const coverPaymentValidationMessage = computed(() =>
  validatePositiveWholeAmount(coverPaymentInput.value.amount)
)

const addCollateralActionError = computed(() =>
  extractErrorMessage(addCollateralMutation.error.value)
)
const removeCollateralActionError = computed(() =>
  extractErrorMessage(removeCollateralMutation.error.value)
)
const coverPositionActionError = computed(() =>
  extractErrorMessage(coverPositionMutation.error.value)
)
const closePositionActionError = computed(() =>
  extractErrorMessage(closePositionMutation.error.value)
)

function resetDialogState() {
  emit('close')
  resetAmountInputs()
  closeFraction.value = '1'
}

function handleDialogOpenChange(nextOpen: boolean) {
  emit('update:open', nextOpen)
}

function handleCloseRequest() {
  emit('update:open', false)
}

async function submitClosePosition() {
  if (!executorAddress.value || !isCloseFractionValid.value) return

  const fraction = closeFraction.value

  await closePositionMutation.mutateAsync({
    positionId: props.position.position_id,
    executorAddress: executorAddress.value,
    fraction,
  })

  emit('refresh')
  handleCloseRequest()
}

async function submitAddCollateral() {
  if (!executorAddress.value) return
  if (!collateralInput.value.amount || collateralAmountValidationMessage.value) return

  const positionId = props.position.position_id
  const poolId = props.poolId
  const denom = collateralInput.value.denom
  const amount = collateralInput.value.amount

  await addCollateralMutation.mutateAsync({
    positionId,
    poolId,
    collateral: { denom, amount },
    executorAddress: executorAddress.value,
  })

  emit('refresh')
  collateralInput.value = { amount: '', denom }
}

async function submitRemoveCollateral() {
  if (!executorAddress.value) return
  if (!collateralInput.value.amount || collateralAmountValidationMessage.value) return

  const positionId = props.position.position_id
  const poolId = props.poolId
  const denom = collateralInput.value.denom
  const amount = collateralInput.value.amount

  await removeCollateralMutation.mutateAsync({
    positionId,
    poolId,
    collateral: { denom, amount },
    executorAddress: executorAddress.value,
  })

  emit('refresh')
  collateralInput.value = { amount: '', denom }
}

async function submitCoverPosition() {
  if (!executorAddress.value) return
  if (!coverPaymentInput.value.amount || coverPaymentValidationMessage.value) return

  const positionId = props.position.position_id
  const denom = coverPaymentInput.value.denom
  const amount = coverPaymentInput.value.amount

  await coverPositionMutation.mutateAsync({
    positionId,
    payment: { denom, amount },
    executorAddress: executorAddress.value,
  })

  emit('refresh')
  coverPaymentInput.value = { amount: '', denom }
}

function resetAmountInputs() {
  collateralInput.value = { amount: '', denom: props.position.collateral.denom }
  coverPaymentInput.value = { amount: '', denom: props.position.borrowed.denom }
}

function selectCloseFraction(value: string) {
  closeFraction.value = value
}

function validatePositiveWholeAmount(value: string) {
  if (!value) return ''
  if (!/^\d+$/.test(value)) return 'Use whole numbers only'
  if (BigInt(value) <= 0n) return 'Enter an amount greater than zero'
  return ''
}

function extractErrorMessage(error: unknown) {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unexpected error occurred'
}

watch(
  () => props.position.collateral.denom,
  (denom) => {
    collateralInput.value = { amount: '', denom }
  }
)

watch(
  () => props.position.borrowed.denom,
  (denom) => {
    coverPaymentInput.value = { amount: '', denom }
  }
)

watch(
  () => props.open,
  (next) => {
    if (!next) resetDialogState()
  }
)

watch(
  () => collateralInput.value.amount,
  () => {
    if (addCollateralMutation.error.value) addCollateralMutation.reset()
    if (removeCollateralMutation.error.value) removeCollateralMutation.reset()
  }
)

watch(
  () => coverPaymentInput.value.amount,
  () => {
    if (coverPositionMutation.error.value) coverPositionMutation.reset()
  }
)

watch(closeFraction, () => {
  if (closePositionMutation.error.value) closePositionMutation.reset()
})
</script>

<template>
  <Dialog :open="props.open" @update:open="handleDialogOpenChange">
    <DialogContent class="max-w-2xl w-3xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          Position #{{ position.position_id }}
          <Badge :class="healthColor">{{ healthText }}</Badge>
        </DialogTitle>
        <DialogDescription> Manage your leverage position </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Position Details -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="text-xs text-muted-foreground">Collateral</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.collateral) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Borrowed</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.borrowed) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Held</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.held) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Accrued Interest</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.accrued_interest) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Total Debt</Label>
            <p class="font-mono text-sm">{{ formatCoin(totalDebt) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Collateral Ratio</Label>
            <p class="font-mono text-sm">
              {{ health.ratio === Infinity ? '∞' : health.ratio.toFixed(2) }}
            </p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Distance to Liquidation</Label>
            <p class="font-mono text-sm" :class="health.riskLevel === 'high' ? 'text-red-500' : ''">
              <span v-if="Number.isFinite(distanceToLiquidationPercent)">
                {{ distanceToLiquidationPercent.toFixed(2) }}%
              </span>
              <span v-else>∞</span>
            </p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Liquidation Price</Label>
            <p class="font-mono text-sm">
              <span v-if="liquidationPrice !== null">
                {{ liquidationPrice.toFixed(6) }} {{ borrowedDisplayDenom }}/{{ heldDisplayDenom }}
              </span>
              <span v-else class="text-muted-foreground">Unavailable</span>
            </p>
          </div>
          <div v-if="position.initial_borrowed">
            <Label class="text-xs text-muted-foreground">Initial Borrowed</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.initial_borrowed) }}</p>
          </div>
          <div v-if="position.total_interest_paid">
            <Label class="text-xs text-muted-foreground">Total Interest Paid</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.total_interest_paid) }}</p>
          </div>
          <div v-if="position.last_interest_settlement_time">
            <Label class="text-xs text-muted-foreground">Last Interest Settlement</Label>
            <p class="font-mono text-sm">
              {{ formatTimestamp(position.last_interest_settlement_time) }}
            </p>
          </div>
        </div>

        <div v-if="canManage" class="space-y-4">
          <section class="space-y-4 rounded-lg border p-4">
            <div>
              <Label class="text-xs text-muted-foreground">Fraction to close (0 &lt; f ≤ 1)</Label>
              <Input
                v-model="closeFraction"
                type="number"
                step="0.01"
                min="0"
                max="1"
                :disabled="closePositionMutation.isPending.value"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="preset in closeFractionPresets"
                  :key="preset.value"
                  size="sm"
                  variant="secondary"
                  :disabled="closePositionMutation.isPending.value"
                  @click="selectCloseFraction(preset.value)"
                  :class="
                    closeFraction === preset.value ? 'bg-primary text-primary-foreground' : ''
                  "
                >
                  {{ preset.label }}
                </Button>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Use 1 to close fully, 0.5 for half, 0.25 for a quarter, etc.
              </p>
              <p v-if="!isCloseFractionValid" class="text-xs text-destructive">
                Enter a valid fraction between 0 and 1.
              </p>
              <p v-else-if="closePositionActionError" class="text-xs text-destructive">
                {{ closePositionActionError }}
              </p>
            </div>
            <Button
              @click="submitClosePosition"
              :disabled="
                !isCloseFractionValid || closePositionMutation.isPending.value || !executorAddress
              "
              class="w-full"
            >
              <Spinner v-if="closePositionMutation.isPending.value" class="mr-2 size-4" />
              Confirm Close
            </Button>
          </section>

          <section class="space-y-4 rounded-lg border p-4">
            <div>
              <Label>Collateral Amount</Label>
              <AmountDenomSelector
                v-model:base="collateralInput"
                :base-denoms="collateralBaseDenoms"
                :default-base-denom="props.position.collateral.denom"
                :disabled="
                  addCollateralMutation.isPending.value || removeCollateralMutation.isPending.value
                "
              />
              <p v-if="collateralAmountValidationMessage" class="text-xs text-destructive mt-1">
                {{ collateralAmountValidationMessage }}
              </p>
              <p v-else-if="addCollateralActionError" class="text-xs text-destructive mt-1">
                {{ addCollateralActionError }}
              </p>
              <p v-else-if="removeCollateralActionError" class="text-xs text-destructive mt-1">
                {{ removeCollateralActionError }}
              </p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <Button
                @click="submitAddCollateral"
                :disabled="
                  !collateralInput.amount ||
                  !!collateralAmountValidationMessage ||
                  addCollateralMutation.isPending.value ||
                  !executorAddress
                "
                class="w-full"
              >
                <Spinner v-if="addCollateralMutation.isPending.value" class="mr-2 size-4" />
                Confirm Add
              </Button>
              <Button
                @click="submitRemoveCollateral"
                :disabled="
                  !collateralInput.amount ||
                  !!collateralAmountValidationMessage ||
                  removeCollateralMutation.isPending.value ||
                  !executorAddress
                "
                variant="secondary"
                class="w-full"
              >
                <Spinner v-if="removeCollateralMutation.isPending.value" class="mr-2 size-4" />
                Confirm Remove
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Withdraw only excess collateral—on-chain checks keep the position above its minimum
              ratio.
            </p>
          </section>

          <section class="space-y-4 rounded-lg border p-4">
            <div>
              <Label>Cover Amount ({{ borrowedDisplayDenom }})</Label>
              <AmountDenomSelector
                v-model:base="coverPaymentInput"
                :base-denoms="borrowedBaseDenoms"
                :default-base-denom="props.position.borrowed.denom"
                :disabled="coverPositionMutation.isPending.value"
              />
              <p class="text-xs text-muted-foreground mt-1">
                Total debt: {{ formatCoin(totalDebt) }}
              </p>
              <p v-if="coverPaymentValidationMessage" class="text-xs text-destructive mt-1">
                {{ coverPaymentValidationMessage }}
              </p>
              <p v-else-if="coverPositionActionError" class="text-xs text-destructive mt-1">
                {{ coverPositionActionError }}
              </p>
            </div>
            <Button
              @click="submitCoverPosition"
              :disabled="
                !coverPaymentInput.amount ||
                !!coverPaymentValidationMessage ||
                coverPositionMutation.isPending.value ||
                !executorAddress
              "
              class="w-full"
            >
              <Spinner v-if="coverPositionMutation.isPending.value" class="mr-2 size-4" />
              Confirm Cover
            </Button>
          </section>
        </div>

        <div v-else-if="!isOwnPosition" class="text-center text-sm text-muted-foreground py-4">
          You can only manage your own positions
        </div>

        <div v-else class="text-center text-sm text-muted-foreground py-4">
          This position cannot be managed (status: {{ position.status }})
        </div>

        <!-- Timestamps -->
        <div class="text-xs text-muted-foreground space-y-1">
          <div>Created: {{ formatTimestamp(position.created_time) }}</div>
          <div>Updated: {{ formatTimestamp(position.updated_time) }}</div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleCloseRequest" variant="outline">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
