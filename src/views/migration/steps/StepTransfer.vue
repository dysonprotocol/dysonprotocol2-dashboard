<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Transfer DYS via IBC</CardTitle>
      <CardDescription>Send tokens from the old chain to the new chain</CardDescription>
    </CardHeader>

    <CardContent class="space-y-5">
      <!-- Prerequisites check -->
      <Alert v-if="!oldChainConnected || !newChainConnected" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertTitle>Wallets Not Connected</AlertTitle>
        <AlertDescription>
          <span v-if="!oldChainConnected && !newChainConnected"
            >Connect both chains in the Connect tab.</span
          >
          <span v-else-if="!oldChainConnected">Connect to the old chain in the Connect tab.</span>
          <span v-else>Connect to the new chain in the Connect tab.</span>
        </AlertDescription>
      </Alert>

      <template v-else>
        <!-- Balance -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">Old Chain Balance</div>
            <div v-if="loading" class="flex items-center gap-2 mt-1">
              <Spinner class="size-4" />
              <span class="text-muted-foreground">Loading...</span>
            </div>
            <div v-else class="text-2xl font-bold tabular-nums">
              {{ formattedBalance }}
              <span class="text-lg font-medium text-muted-foreground">DYS</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" @click="$emit('refresh')">
            <RefreshCw class="size-4" />
          </Button>
        </div>

        <!-- Zero balance warning -->
        <Alert v-if="!loading && numericBalance === 0">
          <AlertCircle class="size-4" />
          <AlertDescription>No DYS on the old chain to transfer.</AlertDescription>
        </Alert>

        <!-- Amount Input -->
        <div v-if="numericBalance > 0" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="amount">Amount to transfer</Label>
            <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="setMax">
              Max
            </Button>
          </div>
          <Input
            id="amount"
            type="text"
            inputmode="numeric"
            :model-value="amount"
            placeholder="0"
            class="text-lg font-mono tabular-nums"
            @update:model-value="$emit('update:amount', String($event))"
          />
          <p v-if="validationError" class="text-sm text-destructive">{{ validationError }}</p>
        </div>

        <!-- Transfer Summary -->
        <div v-if="numericAmount > 0 && !validationError" class="rounded-lg border p-4 space-y-3">
          <div class="flex items-center justify-between text-sm gap-2">
            <span class="text-muted-foreground shrink-0">From</span>
            <AddressDisplay :address="fromAddress" :truncate="8" />
          </div>
          <div class="flex items-center justify-between text-sm gap-2">
            <span class="text-muted-foreground shrink-0">To</span>
            <AddressDisplay :address="toAddress" :truncate="8" />
          </div>
          <div class="border-t pt-3 flex items-center justify-between">
            <span class="text-muted-foreground">You'll receive</span>
            <span class="font-semibold tabular-nums">{{ formattedAmount }} IBC/DYS</span>
          </div>
        </div>

        <!-- Transfer Button -->
        <Button
          v-if="numericBalance > 0"
          class="w-full"
          size="lg"
          :disabled="!canTransfer || status === 'pending'"
          @click="$emit('transfer')"
        >
          <template v-if="status === 'pending'">
            <Spinner class="size-4 mr-2" />
            Transferring...
          </template>
          <template v-else>
            <span class="iconify lucide--send mr-2" />
            Send to New Chain
          </template>
        </Button>

        <!-- Success State -->
        <Alert v-if="status === 'success'" class="border-green-500/50 bg-green-500/10">
          <CheckCircle class="size-4 text-green-500" />
          <AlertTitle class="text-green-700 dark:text-green-400">Transfer Complete!</AlertTitle>
          <AlertDescription class="text-green-600 dark:text-green-500 space-y-3">
            <div>{{ formattedAmount }} DYS sent. Convert to native DYS2 now.</div>
            <div v-if="txHash" class="flex items-center gap-2 text-xs">
              <span class="opacity-75">TX:</span>
              <TxHashDisplay :hash="txHash" :truncate="8" />
            </div>
            <Button class="w-full mt-2" @click="$emit('go-to-swap')">
              <span class="iconify lucide--repeat mr-2" />
              Swap for DYS2
            </Button>
          </AlertDescription>
        </Alert>

        <!-- Error State -->
        <Alert v-if="status === 'error'" variant="destructive">
          <XCircle class="size-4" />
          <AlertTitle>Transfer Failed</AlertTitle>
          <AlertDescription>{{
            error || 'Something went wrong. Please try again.'
          }}</AlertDescription>
        </Alert>
      </template>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-vue-next'
import AddressDisplay from '@/components/AddressDisplay.vue'
import TxHashDisplay from '@/components/TxHashDisplay.vue'

const props = defineProps<{
  oldChainConnected: boolean
  newChainConnected: boolean
  balance: string
  loading: boolean
  amount: string
  fromAddress: string
  toAddress: string
  status: 'idle' | 'pending' | 'success' | 'error'
  txHash?: string
  error?: string
}>()

const emit = defineEmits<{
  'update:amount': [value: string]
  refresh: []
  transfer: []
  'go-to-swap': []
}>()

const numericBalance = computed(() => Number(props.balance) || 0)
const formattedBalance = computed(() => numericBalance.value.toLocaleString())

const numericAmount = computed(() => Number(props.amount) || 0)
const formattedAmount = computed(() => numericAmount.value.toLocaleString())

const validationError = computed(() => {
  if (!props.amount) return ''
  if (isNaN(Number(props.amount))) return 'Enter a valid number'
  if (numericAmount.value <= 0) return 'Amount must be greater than 0'
  if (numericAmount.value > numericBalance.value) return 'Exceeds available balance'
  return ''
})

const canTransfer = computed(
  () =>
    numericAmount.value > 0 &&
    numericAmount.value <= numericBalance.value &&
    !validationError.value &&
    props.status !== 'pending'
)

function setMax() {
  emit('update:amount', props.balance)
}
</script>
