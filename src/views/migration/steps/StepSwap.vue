<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Convert to Native DYS2</CardTitle>
      <CardDescription> Swap your old IBC/DYS for new native DYS2 </CardDescription>
    </CardHeader>

    <CardContent class="space-y-5">
      <!-- Not connected warning -->
      <Alert v-if="!newChainConnected" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertTitle>New Chain Not Connected</AlertTitle>
        <AlertDescription>
          Connect to the new chain in the Connect tab to swap tokens.
        </AlertDescription>
      </Alert>

      <template v-else>
        <!-- IBC Balance -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">IBC/DYS Balance</div>
            <div class="text-2xl font-bold tabular-nums">
              {{ formattedBalance }}
              <span class="text-lg font-medium text-muted-foreground">IBC/DYS</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" @click="$emit('refresh')">
            <RefreshCw class="size-4" />
          </Button>
        </div>

        <!-- Conversion Preview -->
        <div v-if="numericBalance > 0" class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">You'll receive</div>
            <div class="text-2xl font-bold tabular-nums text-emerald-600">
              {{ formattedNewBalance }}
              <span class="text-lg font-medium text-emerald-600/70">DYS2</span>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">{{ formattedBalance }} udys</div>
        </div>

        <!-- Convert Button -->
        <Button
          class="w-full"
          size="lg"
          :disabled="numericBalance === 0 || status === 'pending'"
          @click="$emit('swap')"
        >
          <template v-if="status === 'pending'">
            <Spinner class="size-4 mr-2" />
            Converting...
          </template>
          <template v-else>
            <span class="iconify lucide--repeat mr-2" />
            Convert to DYS2
          </template>
        </Button>

        <p v-if="numericBalance === 0" class="text-xs text-center text-muted-foreground">
          No IBC tokens to convert. Transfer tokens first or wait for IBC relay.
        </p>

        <!-- Current DYS2 Balance -->
        <div v-if="numericNativeBalance > 0" class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">Current DYS2 Balance</div>
            <div class="text-2xl font-bold tabular-nums text-emerald-600">
              {{ formattedNativeBalance }}
              <span class="text-lg font-medium text-emerald-600/70">DYS2</span>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">{{ nativeBalance }} udys</div>
        </div>

        <!-- Success Message -->
        <Alert v-if="status === 'success'" class="border-green-500/50 bg-green-500/10">
          <CheckCircle class="size-4 text-green-500" />
          <AlertTitle class="text-green-700 dark:text-green-400">Conversion Complete!</AlertTitle>
          <AlertDescription class="text-green-600 dark:text-green-500 space-y-2">
            <p>Your tokens have been converted to native DYS2.</p>
            <div v-if="txHash" class="flex items-center gap-2 text-xs">
              <span class="opacity-75">TX:</span>
              <TxHashDisplay :hash="txHash" :truncate="8" />
            </div>
            <Button
              v-if="newAddress"
              class="w-full mt-2"
              @click="router.push(`/address/${newAddress}/coins`)"
            >
              View All Balances
            </Button>
          </AlertDescription>
        </Alert>

        <!-- Error State -->
        <Alert v-if="status === 'error'" variant="destructive">
          <XCircle class="size-4" />
          <AlertTitle>Conversion Failed</AlertTitle>
          <AlertDescription>
            {{ error || 'Something went wrong with the conversion.' }}
          </AlertDescription>
        </Alert>
      </template>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, XCircle, CheckCircle, RefreshCw } from 'lucide-vue-next'
import TxHashDisplay from '@/components/TxHashDisplay.vue'

const router = useRouter()

const props = defineProps<{
  ibcBalance: string
  status: 'idle' | 'pending' | 'success' | 'error'
  nativeBalance: string
  newChainConnected: boolean
  newAddress: string
  error?: string
  txHash?: string
}>()

defineEmits<{
  swap: []
  refresh: []
}>()

// Navigate to address coins page after successful swap
watch(
  () => props.status,
  (newStatus) => {
    if (newStatus === 'success' && props.newAddress) {
      setTimeout(() => {
        router.push(`/address/${props.newAddress}/coins`)
      }, 2000)
    }
  }
)

const numericBalance = computed(() => Number(props.ibcBalance) || 0)
const formattedBalance = computed(() => numericBalance.value.toLocaleString())

// 1,000,000 IBC/DYS = 1 DYS2
const formattedNewBalance = computed(() => {
  const dys2 = numericBalance.value / 1_000_000
  return dys2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
})

const numericNativeBalance = computed(() => Number(props.nativeBalance) || 0)
const formattedNativeBalance = computed(() => {
  const dys2 = numericNativeBalance.value / 1_000_000
  return dys2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
})
</script>
