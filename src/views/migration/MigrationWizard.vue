<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold tracking-tight">Convert old DYS to DYS2</h1>
      </div>

      <!-- Important denomination info -->
      <Alert class="mb-6 border-blue-500/50">
        <Info class="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <AlertTitle class="text-blue-700 dark:text-blue-300"
          >Important: Token Denomination Change</AlertTitle
        >
        <AlertDescription class="text-blue-600 dark:text-blue-400 space-y-2 text-sm">
          <p class="font-medium">1,000,000 old DYS = 1 new DYS2</p>
          <ul class="list-disc list-inside space-y-1 text-xs opacity-90">
            <li><strong>Old DYS:</strong> No decimal places. What you saw was what you had.</li>
            <li><strong>New DYS2:</strong> 6 decimal places, like most Cosmos tokens.</li>
          </ul>
          <p class="text-xs opacity-80 pt-1">
            Example: 5,000,000 old DYS becomes 5.000000 DYS2. Your value is the same — just
            displayed differently.
          </p>
        </AlertDescription>
      </Alert>

      <!-- Stepper (tabs - all clickable) -->
      <MigrationStepper v-model:current-step="currentStep" :steps="steps" class="mb-8" />

      <!-- Step Content -->
      <div class="motion-preset-fade motion-duration-300">
        <StepConnect
          v-if="currentStep === 0"
          :old-chain-connected="oldChainConnected"
          :new-chain-connected="newChainConnected"
          :old-address="oldAddress"
          :new-address="newAddress"
          @connect-old="connectOldChain"
          @connect-new="connectNewChain"
          @disconnect-old="disconnectOldChain"
          @disconnect-new="disconnectNewChain"
          @go-to-transfer="currentStep = 1"
        />

        <StepTransfer
          v-else-if="currentStep === 1"
          :old-chain-connected="oldChainConnected"
          :new-chain-connected="newChainConnected"
          :balance="oldChainBalance"
          :loading="balanceLoading"
          :amount="migrateAmount"
          :transferred-amount="transferredAmount"
          :from-address="oldAddress"
          :to-address="newAddress"
          :status="transferStatus"
          :tx-hash="transferTxHash"
          :error="transferError"
          :relay-start-time="relayStartTime"
          @update:amount="migrateAmount = $event"
          @refresh="fetchOldChainBalance"
          @transfer="executeTransfer"
          @go-to-swap="currentStep = 2"
        />

        <StepSwap
          v-else-if="currentStep === 2"
          :ibc-balance="ibcBalance"
          :status="swapStatus"
          :native-balance="finalNativeBalance"
          :new-chain-connected="newChainConnected"
          :new-address="newAddress"
          :error="swapError"
          :tx-hash="swapTxHash"
          @swap="executeSwap"
          @refresh="refreshNewChainBalances"
        />
      </div>

      <!-- Reset button (for testing/starting over) -->
      <div
        v-if="currentStep > 0 || oldChainConnected || newChainConnected"
        class="mt-8 text-center"
      >
        <button
          class="text-sm text-muted-foreground hover:text-foreground underline"
          @click="resetWizard"
        >
          Start over
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-vue-next'
import MigrationStepper from './MigrationStepper.vue'
import StepConnect from './steps/StepConnect.vue'
import StepTransfer from './steps/StepTransfer.vue'
import StepSwap from './steps/StepSwap.vue'
import { IBC_OLD_DYS_DENOM, OLD_CHAIN_REST, NEW_CHAIN_DENOM } from '@/config/migration'

const steps = [
  { label: 'Connect', icon: 'lucide--wallet' },
  { label: 'Transfer', icon: 'lucide--send' },
  { label: 'Swap', icon: 'lucide--repeat' },
]

// Wizard state (step not persisted, resets on reload)
const currentStep = ref(0)
const migrateAmount = ref('')

// Connection state (persisted)
const oldChainConnected = useStorage('migration:oldChainConnected', false)
const newChainConnected = useStorage('migration:newChainConnected', false)
const oldAddress = useStorage('migration:oldAddress', '')
const newAddress = useStorage('migration:newAddress', '')

// Balances (not persisted - always fetched fresh)
const oldChainBalance = ref('0')
const balanceLoading = ref(false)
const ibcBalance = ref('0')
const finalNativeBalance = ref('0')

// Transfer state (not persisted)
const transferStatus = ref<'idle' | 'pending' | 'relaying' | 'success' | 'error'>('idle')
const transferTxHash = ref('')
const transferError = ref('')
const relayStartTime = ref(0)
const transferredAmount = ref('0') // Amount that was transferred (for success message)

// Swap state (not persisted)
const swapStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const swapTxHash = ref('')
const swapError = ref('')

// Reset status alerts when navigating between steps
watch(currentStep, () => {
  transferStatus.value = 'idle'
  transferError.value = ''
  swapStatus.value = 'idle'
  swapError.value = ''
})

// Event handlers for Keplr events (stored for proper cleanup)
let keystoreChangeHandler: (() => void) | null = null
let accountsChangedHandler: (() => void) | null = null
let chainChangedHandler: (() => void) | null = null

// Handle all Keplr events to keep UI in sync
async function handleKeplrEvent(eventType: string) {
  console.log(
    `[Migration] Keplr event: ${eventType}, re-validating connections and refreshing balances...`
  )

  // Validation functions already refresh balances, so we just need to call them
  if (oldChainConnected.value) {
    await validateOldChainConnection()
  }
  if (newChainConnected.value) {
    await validateNewChainConnection()
  }
}

// On mount, validate persisted connections and set up listeners for all Keplr events
onMounted(async () => {
  if (typeof window !== 'undefined') {
    // Create and store handlers for proper cleanup
    keystoreChangeHandler = () => handleKeplrEvent('keplr_keystorechange')
    accountsChangedHandler = () => handleKeplrEvent('keplr_accountsChanged')
    chainChangedHandler = () => handleKeplrEvent('keplr_chainChanged')

    // Listen to all Keplr events to keep UI in sync
    window.addEventListener('keplr_keystorechange', keystoreChangeHandler)
    window.addEventListener('keplr_accountsChanged', accountsChangedHandler)
    window.addEventListener('keplr_chainChanged', chainChangedHandler)
  }

  if (oldChainConnected.value && oldAddress.value) {
    await validateOldChainConnection()
  }
  if (newChainConnected.value && newAddress.value) {
    await validateNewChainConnection()
  }

  // Resume polling if still in relaying state
  if (transferStatus.value === 'relaying' && relayStartTime.value > 0) {
    // Always fetch actual current balance first
    await fetchIbcBalance()

    // Check if balance already increased (using stored initial balance from when transfer started)
    // Note: initialIbcBalance is in-memory only, so if page was reloaded, it will be '0'
    // In that case, we can't accurately detect increase, so we'll just resume polling
    const expectedAmount = Number(migrateAmount.value)
    const currentBalance = Number(ibcBalance.value)
    const initialBalance = Number(initialIbcBalance.value)

    // Only check increase if we have a valid initial balance (wasn't lost on page reload)
    if (initialBalance > 0) {
      const balanceIncrease = currentBalance - initialBalance
      if (balanceIncrease >= expectedAmount * 0.95) {
        transferStatus.value = 'success'
        return
      }
    }

    // Resume polling (will continue checking for increase)
    startBalancePolling()
  }
})

// Clean up listeners on unmount
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    if (keystoreChangeHandler) {
      window.removeEventListener('keplr_keystorechange', keystoreChangeHandler)
    }
    if (accountsChangedHandler) {
      window.removeEventListener('keplr_accountsChanged', accountsChangedHandler)
    }
    if (chainChangedHandler) {
      window.removeEventListener('keplr_chainChanged', chainChangedHandler)
    }
  }
})

// Validate old chain connection is still active
async function validateOldChainConnection() {
  if (!window.keplr) {
    oldChainConnected.value = false
    oldAddress.value = ''
    oldChainBalance.value = '0'
    return
  }
  try {
    await window.keplr.enable('dyson-mainnet-01')
    const key = await window.keplr.getKey('dyson-mainnet-01')
    const addressChanged = key.bech32Address !== oldAddress.value
    if (addressChanged) {
      oldAddress.value = key.bech32Address
    }
    // Always refresh balance after validation
    await fetchOldChainBalance()
  } catch {
    oldChainConnected.value = false
    oldAddress.value = ''
    oldChainBalance.value = '0'
  }
}

// Validate new chain connection is still active
async function validateNewChainConnection() {
  try {
    const { useWallet } = await import('@/composables/useWallet')
    const { unlockedWallets } = useWallet()
    const wallets = unlockedWallets.value as Array<{ type: string; address: string }>
    const keplrWallet = wallets.find((w) => w.type === 'keplr')
    if (!keplrWallet || keplrWallet.address !== newAddress.value) {
      if (window.keplr) {
        const { connectExtension } = useWallet()
        await connectExtension('keplr')
        const updatedWallets = unlockedWallets.value as Array<{ type: string; address: string }>
        const updatedWallet = updatedWallets.find((w) => w.type === 'keplr')
        if (updatedWallet) {
          const addressChanged = updatedWallet.address !== newAddress.value
          newAddress.value = updatedWallet.address
          // Refresh balances if address changed or always refresh after reconnection
          if (addressChanged || !keplrWallet) {
            await Promise.all([fetchIbcBalance(), fetchNativeBalance()])
          }
        } else {
          newChainConnected.value = false
          newAddress.value = ''
          ibcBalance.value = '0'
          finalNativeBalance.value = '0'
        }
      } else {
        newChainConnected.value = false
        newAddress.value = ''
        ibcBalance.value = '0'
        finalNativeBalance.value = '0'
      }
    } else {
      // Address matches, but refresh balances to ensure they're current
      await Promise.all([fetchIbcBalance(), fetchNativeBalance()])
    }
  } catch {
    newChainConnected.value = false
    newAddress.value = ''
    ibcBalance.value = '0'
    finalNativeBalance.value = '0'
  }
}

function resetWizard() {
  stopBalancePolling()
  currentStep.value = 0
  migrateAmount.value = ''
  oldChainConnected.value = false
  newChainConnected.value = false
  oldAddress.value = ''
  newAddress.value = ''
  oldChainBalance.value = '0'
  balanceLoading.value = false
  transferStatus.value = 'idle'
  transferTxHash.value = ''
  transferError.value = ''
  relayStartTime.value = 0
  transferredAmount.value = '0'
  // Balances are not persisted, just reset to 0
  ibcBalance.value = '0'
  finalNativeBalance.value = '0'
  swapStatus.value = 'idle'
  swapTxHash.value = ''
  swapError.value = ''
}

// Keplr connection handlers
async function connectOldChain() {
  if (!window.keplr) return
  try {
    await window.keplr.enable('dyson-mainnet-01')
    const key = await window.keplr.getKey('dyson-mainnet-01')
    oldAddress.value = key.bech32Address
    oldChainConnected.value = true
    await fetchOldChainBalance()
  } catch (e) {
    console.error('Failed to connect old chain:', e)
  }
}

async function connectNewChain() {
  if (!window.keplr) return
  try {
    const { useWallet } = await import('@/composables/useWallet')
    const { connectExtension, unlockedWallets } = useWallet()
    await connectExtension('keplr')
    const wallets = unlockedWallets.value as Array<{ type: string; address: string }>
    const keplrWallet = wallets.find((w) => w.type === 'keplr')
    if (keplrWallet) {
      newAddress.value = keplrWallet.address
      newChainConnected.value = true
      await Promise.all([fetchIbcBalance(), fetchNativeBalance()])
    }
  } catch (e) {
    console.error('Failed to connect new chain:', e)
  }
}

function disconnectOldChain() {
  oldChainConnected.value = false
  oldAddress.value = ''
  oldChainBalance.value = '0'
}

function disconnectNewChain() {
  newChainConnected.value = false
  newAddress.value = ''
}

async function fetchOldChainBalance() {
  if (!oldAddress.value) return
  balanceLoading.value = true
  try {
    const res = await fetch(`${OLD_CHAIN_REST}/cosmos/bank/v1beta1/balances/${oldAddress.value}`)
    const data = await res.json()
    const dys = data.balances?.find((b: { denom: string }) => b.denom === 'dys')
    oldChainBalance.value = dys?.amount || '0'
  } catch (e) {
    console.error('Failed to fetch old chain balance:', e)
  } finally {
    balanceLoading.value = false
  }
}

async function fetchIbcBalance() {
  if (!newAddress.value) return
  try {
    const res = await fetch(`/cosmos/bank/v1beta1/balances/${newAddress.value}`)
    const data = await res.json()
    const ibcDys = data.balances?.find((b: { denom: string }) => b.denom === IBC_OLD_DYS_DENOM)
    ibcBalance.value = ibcDys?.amount || '0'
  } catch (e) {
    console.error('Failed to fetch IBC balance:', e)
  }
}

async function fetchNativeBalance() {
  if (!newAddress.value) return
  try {
    const res = await fetch(`/cosmos/bank/v1beta1/balances/${newAddress.value}`)
    const data = await res.json()
    const native = data.balances?.find((b: { denom: string }) => b.denom === NEW_CHAIN_DENOM)
    finalNativeBalance.value = native?.amount || '0'
  } catch (e) {
    console.error('Failed to fetch native balance:', e)
  }
}

async function refreshNewChainBalances() {
  await Promise.all([fetchIbcBalance(), fetchNativeBalance()])
}

let balancePollInterval: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL_MS = 3000 // Poll every 3 seconds
const MAX_RELAY_WAIT_MS = 300000 // 5 minutes max wait
const initialIbcBalance = ref('0') // Balance before transfer (in-memory only, not persisted)

async function executeTransfer() {
  transferStatus.value = 'pending'
  transferError.value = ''

  try {
    // Always fetch actual current IBC balance before transfer to track increase
    await fetchIbcBalance()
    initialIbcBalance.value = ibcBalance.value

    // Store the amount being transferred for success message
    transferredAmount.value = migrateAmount.value

    const { transferFromOldChain } = await import('@/utils/oldChainTransfer')

    const result = await transferFromOldChain({
      sender: oldAddress.value,
      receiver: newAddress.value,
      amount: migrateAmount.value,
      memo: 'Migration to DYS2',
      timeoutSeconds: 600,
    })

    if (result.success) {
      console.log('[Migration] Transfer successful on old chain:', result.txHash)
      transferTxHash.value = result.txHash || ''
      await fetchOldChainBalance()

      // Transition to relaying state and start polling
      transferStatus.value = 'relaying'
      relayStartTime.value = Date.now()
      startBalancePolling()
    } else {
      console.error('[Migration] Transfer failed:', result.error)
      transferStatus.value = 'error'
      transferError.value = result.error || 'Transfer failed'
    }
  } catch (e: any) {
    console.error('Transfer failed:', e)
    transferStatus.value = 'error'
    transferError.value = e?.message || 'Transfer failed'
  }
}

function startBalancePolling() {
  // Clear any existing interval
  if (balancePollInterval) {
    clearInterval(balancePollInterval)
  }

  // Initial fetch after a short delay
  setTimeout(() => fetchIbcBalance(), 2000)

  // Poll periodically
  balancePollInterval = setInterval(async () => {
    const elapsed = Date.now() - relayStartTime.value

    // Timeout check
    if (elapsed > MAX_RELAY_WAIT_MS) {
      stopBalancePolling()
      transferStatus.value = 'error'
      transferError.value =
        'IBC relay timeout. The transfer may still be processing. Please check your balance manually.'
      return
    }

    await fetchIbcBalance()

    // Check if IBC balance increased by expected amount (allowing for small rounding differences)
    const expectedAmount = Number(migrateAmount.value)
    const initialBalance = Number(initialIbcBalance.value)
    const currentBalance = Number(ibcBalance.value)
    const balanceIncrease = currentBalance - initialBalance

    // Consider success if balance increased by at least 95% of expected (allowing for fees/rounding)
    if (balanceIncrease >= expectedAmount * 0.95) {
      console.log('[Migration] IBC tokens received on new chain')
      stopBalancePolling()
      transferStatus.value = 'success'
      migrateAmount.value = ''
    }
  }, POLL_INTERVAL_MS)
}

function stopBalancePolling() {
  if (balancePollInterval) {
    clearInterval(balancePollInterval)
    balancePollInterval = null
  }
}

// Clean up polling on unmount
onUnmounted(() => {
  stopBalancePolling()
})

async function executeSwap() {
  swapStatus.value = 'pending'
  swapError.value = ''
  swapTxHash.value = ''

  try {
    const { executeMigrationSwap } = await import('@/utils/migrationSwap')

    const result = await executeMigrationSwap(newAddress.value, ibcBalance.value)

    if (result.success) {
      console.log('[Migration] Swap successful:', result.txHash)
      swapStatus.value = 'success'
      swapTxHash.value = result.txHash || ''
      // Refresh actual balances from chain
      await Promise.all([fetchIbcBalance(), fetchNativeBalance()])
    } else {
      console.error('[Migration] Swap failed:', result.error)
      swapStatus.value = 'error'
      swapError.value = result.error || 'Swap failed'
    }
  } catch (e: any) {
    console.error('Swap failed:', e)
    swapStatus.value = 'error'
    swapError.value = e?.message || 'Swap failed'
  }
}
</script>
