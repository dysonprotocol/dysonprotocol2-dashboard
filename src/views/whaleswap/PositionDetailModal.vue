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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
}>()

const wallet = useWallet()

const collateralInput = ref({ amount: '', denom: props.position.collateral.denom })
const coverPaymentInput = ref({ amount: '', denom: props.position.borrowed.denom })
const closeFraction = ref('1')

const closePositionMutation = useClosePositionMutation()
const addCollateralMutation = useAddCollateralMutation()
const coverPositionMutation = useCoverPositionMutation()
const removeCollateralMutation = useRemoveCollateralMutation()

const closeFractionPresets = [
  { label: 'Max', value: '1' },
  { label: '50%', value: '0.5' },
  { label: '25%', value: '0.25' },
]

const health = computed(() => calculatePositionHealth(props.position))

const healthStyles = {
  safe: { color: 'bg-green-500', text: 'Safe' },
  medium: { color: 'bg-yellow-500', text: 'Medium Risk' },
  high: { color: 'bg-red-500', text: 'High Risk' },
}

const healthColor = computed(() => healthStyles[health.value.riskLevel]?.color || 'bg-gray-500')
const healthText = computed(() => healthStyles[health.value.riskLevel]?.text || 'Unknown')

const unlockedAddresses = computed(() =>
  (wallet.unlockedWallets.value as { address: string }[]).map((w) => w.address)
)

const isOwnPosition = computed(() => unlockedAddresses.value.includes(props.position.user))

const canManage = computed(
  () => isOwnPosition.value && props.position.status === 'POSITION_STATUS_OPEN'
)

const executorAddress = computed(() =>
  unlockedAddresses.value.includes(props.position.user) ? props.position.user : ''
)

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
  // Normalize amounts to account for different decimal exponents
  const normalizedHeld = wallet.normalizeCoin({
    amount: heldPoolCoin.value.amount,
    denom: heldPoolCoin.value.denom,
  })
  const normalizedBorrowed = wallet.normalizeCoin({
    amount: borrowedPoolCoin.value.amount,
    denom: borrowedPoolCoin.value.denom,
  })
  const heldAmt = parseFloat(normalizedHeld.display.amount)
  const borrowedAmt = parseFloat(normalizedBorrowed.display.amount)
  if (heldAmt === 0) return null
  return borrowedAmt / heldAmt
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

const validateAmount = (value: string) => {
  if (!value) return ''
  if (!/^\d+$/.test(value)) return 'Use whole numbers only'
  if (BigInt(value) <= 0n) return 'Enter an amount greater than zero'
  return ''
}

const getErrorMessage = (error: unknown) => {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unexpected error occurred'
}

const collateralError = computed(
  () =>
    validateAmount(collateralInput.value.amount) ||
    getErrorMessage(addCollateralMutation.error.value) ||
    getErrorMessage(removeCollateralMutation.error.value)
)

const coverError = computed(
  () =>
    validateAmount(coverPaymentInput.value.amount) ||
    getErrorMessage(coverPositionMutation.error.value)
)

const closeError = computed(() => getErrorMessage(closePositionMutation.error.value))

function resetDialogState() {
  resetAmountInputs()
  closeFraction.value = '1'
}

function handleDialogOpenChange(isOpen: boolean) {
  emit('update:open', isOpen)
}

async function submitClosePosition() {
  if (!executorAddress.value || !isCloseFractionValid.value) return

  await closePositionMutation.mutateAsync({
    positionId: props.position.position_id,
    executorAddress: executorAddress.value,
    fraction: closeFraction.value,
  })

  closeFraction.value = '1'
}

async function submitAddCollateral() {
  if (
    !executorAddress.value ||
    !collateralInput.value.amount ||
    validateAmount(collateralInput.value.amount)
  )
    return

  await addCollateralMutation.mutateAsync({
    positionId: props.position.position_id,
    poolId: props.poolId,
    collateral: collateralInput.value,
    executorAddress: executorAddress.value,
  })

  collateralInput.value.amount = ''
}

async function submitRemoveCollateral() {
  if (
    !executorAddress.value ||
    !collateralInput.value.amount ||
    validateAmount(collateralInput.value.amount)
  )
    return

  await removeCollateralMutation.mutateAsync({
    positionId: props.position.position_id,
    poolId: props.poolId,
    collateral: collateralInput.value,
    executorAddress: executorAddress.value,
  })

  collateralInput.value.amount = ''
}

async function submitCoverPosition() {
  if (
    !executorAddress.value ||
    !coverPaymentInput.value.amount ||
    validateAmount(coverPaymentInput.value.amount)
  )
    return

  await coverPositionMutation.mutateAsync({
    positionId: props.position.position_id,
    payment: coverPaymentInput.value,
    executorAddress: executorAddress.value,
  })

  coverPaymentInput.value.amount = ''
}

function resetAmountInputs() {
  collateralInput.value = { amount: '', denom: props.position.collateral.denom }
  coverPaymentInput.value = { amount: '', denom: props.position.borrowed.denom }
}

watch(
  () => props.open,
  (isOpen) => !isOpen && resetDialogState()
)

watch(
  () => props.position.collateral.denom,
  (denom, old) => {
    if (denom !== old) collateralInput.value.denom = denom
  }
)

watch(
  () => props.position.borrowed.denom,
  (denom, old) => {
    if (denom !== old) coverPaymentInput.value.denom = denom
  }
)

watch(
  () => collateralInput.value.amount,
  () => {
    addCollateralMutation.reset()
    removeCollateralMutation.reset()
  }
)

watch(
  () => coverPaymentInput.value.amount,
  () => coverPositionMutation.reset()
)
watch(closeFraction, () => closePositionMutation.reset())
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
            <Label class="text-xs text-muted-foreground">Realized Profit</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.total_realized_profit) }}</p>
          </div>
          <div>
            <Label class="text-xs text-muted-foreground">Realized Loss</Label>
            <p class="font-mono text-sm">{{ formatCoin(position.total_realized_loss) }}</p>
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
                {{ liquidationPrice.toFixed(6) }} {{ getDisplayDenom(position.borrowed.denom) }}/{{
                  getDisplayDenom(position.held.denom)
                }}
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

        <div v-if="canManage">
          <Tabs default-value="close" class="w-full">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="close">Close</TabsTrigger>
              <TabsTrigger value="collateral">Collateral</TabsTrigger>
              <TabsTrigger value="cover">Cover</TabsTrigger>
            </TabsList>

            <TabsContent value="close" class="space-y-4">
              <div>
                <Label class="text-xs text-muted-foreground"
                  >Fraction to close (0 &lt; f ≤ 1)</Label
                >
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
                    @click="closeFraction = preset.value"
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
                <p v-else-if="closeError" class="text-xs text-destructive">
                  {{ closeError }}
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
            </TabsContent>

            <TabsContent value="collateral" class="space-y-4">
              <div>
                <Label>Collateral Amount</Label>
                <AmountDenomSelector
                  v-model:base="collateralInput"
                  :base-denoms="[props.position.collateral.denom]"
                  :default-base-denom="props.position.collateral.denom"
                  :disabled="
                    addCollateralMutation.isPending.value ||
                    removeCollateralMutation.isPending.value
                  "
                />
                <p v-if="collateralError" class="text-xs text-destructive mt-1">
                  {{ collateralError }}
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <Button
                  @click="submitAddCollateral"
                  :disabled="
                    !!collateralError || addCollateralMutation.isPending.value || !executorAddress
                  "
                  class="w-full"
                >
                  <Spinner v-if="addCollateralMutation.isPending.value" class="mr-2 size-4" />
                  Confirm Add
                </Button>
                <Button
                  @click="submitRemoveCollateral"
                  :disabled="
                    !!collateralError ||
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
            </TabsContent>

            <TabsContent value="cover" class="space-y-4">
              <div>
                <Label>Cover Amount ({{ getDisplayDenom(position.borrowed.denom) }})</Label>
                <AmountDenomSelector
                  v-model:base="coverPaymentInput"
                  :base-denoms="[props.position.borrowed.denom]"
                  :default-base-denom="props.position.borrowed.denom"
                  :disabled="coverPositionMutation.isPending.value"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  Total debt: {{ formatCoin(totalDebt) }}
                </p>
                <p v-if="coverError" class="text-xs text-destructive mt-1">
                  {{ coverError }}
                </p>
              </div>
              <Button
                @click="submitCoverPosition"
                :disabled="
                  !!coverError || coverPositionMutation.isPending.value || !executorAddress
                "
                class="w-full"
              >
                <Spinner v-if="coverPositionMutation.isPending.value" class="mr-2 size-4" />
                Confirm Cover
              </Button>
            </TabsContent>
          </Tabs>
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
        <Button @click="handleDialogOpenChange(false)" variant="outline">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
