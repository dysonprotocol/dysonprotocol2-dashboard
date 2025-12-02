<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold tracking-tight">Convert old DYS to DYS2</h1>
        <p class="text-muted-foreground mt-2">
          Transfer your tokens from the old chain and swap for native DYS2
        </p>
        <p class="text-muted-foreground mt-2 text-sm">
          Rate: 1,000,000 DYS = 1 DYS2
          <span class="text-xs text-muted-foreground">(1,000,000 udys)</span>
        </p>
      </div>

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
          :from-address="oldAddress"
          :to-address="newAddress"
          :status="transferStatus"
          :tx-hash="transferTxHash"
          :error="transferError"
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
const migrateAmount = useStorage('migration:amount', '')

// Connection state (persisted)
const oldChainConnected = useStorage('migration:oldChainConnected', false)
const newChainConnected = useStorage('migration:newChainConnected', false)
const oldAddress = useStorage('migration:oldAddress', '')
const newAddress = useStorage('migration:newAddress', '')

// Balance state (persisted)
const oldChainBalance = useStorage('migration:oldChainBalance', '0')
const balanceLoading = useStorage('migration:balanceLoading', false)

// Transfer state (persisted)
const transferStatus = useStorage<'idle' | 'pending' | 'success' | 'error'>(
  'migration:transferStatus',
  'idle'
)
const transferTxHash = useStorage('migration:transferTxHash', '')
const transferError = useStorage('migration:transferError', '')

// Swap state (persisted)
const ibcBalance = useStorage('migration:ibcBalance', '0')
const swapStatus = useStorage<'idle' | 'pending' | 'success' | 'error'>(
  'migration:swapStatus',
  'idle'
)
const swapTxHash = useStorage('migration:swapTxHash', '')
const swapError = useStorage('migration:swapError', '')
const finalNativeBalance = useStorage('migration:finalNativeBalance', '0')

// Reset status alerts when navigating between steps
watch(currentStep, () => {
  transferStatus.value = 'idle'
  transferError.value = ''
  swapStatus.value = 'idle'
  swapError.value = ''
})

// Handle Keplr account changes
async function handleKeplrAccountChange() {
  console.log('[Migration] Keplr account changed, re-validating connections...')

  if (oldChainConnected.value) {
    await validateOldChainConnection()
  }
  if (newChainConnected.value) {
    await validateNewChainConnection()
  }
}

// On mount, validate persisted connections and set up listeners
onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keplr_keystorechange', handleKeplrAccountChange)
  }

  if (oldChainConnected.value && oldAddress.value) {
    await validateOldChainConnection()
  }
  if (newChainConnected.value && newAddress.value) {
    await validateNewChainConnection()
  }
})

// Clean up listener on unmount
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keplr_keystorechange', handleKeplrAccountChange)
  }
})

// Validate old chain connection is still active
async function validateOldChainConnection() {
  if (!window.keplr) {
    oldChainConnected.value = false
    oldAddress.value = ''
    return
  }
  try {
    await window.keplr.enable('dyson-mainnet-01')
    const key = await window.keplr.getKey('dyson-mainnet-01')
    if (key.bech32Address !== oldAddress.value) {
      oldAddress.value = key.bech32Address
      await fetchOldChainBalance()
    }
  } catch {
    oldChainConnected.value = false
    oldAddress.value = ''
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
          newAddress.value = updatedWallet.address
        } else {
          newChainConnected.value = false
          newAddress.value = ''
        }
      } else {
        newChainConnected.value = false
        newAddress.value = ''
      }
    }
  } catch {
    newChainConnected.value = false
    newAddress.value = ''
  }
}

function resetWizard() {
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
  ibcBalance.value = '0'
  swapStatus.value = 'idle'
  swapTxHash.value = ''
  swapError.value = ''
  finalNativeBalance.value = '0'
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

async function executeTransfer() {
  transferStatus.value = 'pending'
  transferError.value = ''

  try {
    const { transferFromOldChain } = await import('@/utils/oldChainTransfer')

    const result = await transferFromOldChain({
      sender: oldAddress.value,
      receiver: newAddress.value,
      amount: migrateAmount.value,
      memo: 'Migration to DYS2',
      timeoutSeconds: 600,
    })

    if (result.success) {
      console.log('[Migration] Transfer successful:', result.txHash)
      transferStatus.value = 'success'
      transferTxHash.value = result.txHash || ''
      ibcBalance.value = migrateAmount.value
      await fetchOldChainBalance()
      setTimeout(() => fetchIbcBalance(), 5000)
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
