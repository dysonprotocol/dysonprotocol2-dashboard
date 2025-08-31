<template>
  <TransitionRoot
    as="template"
    :show="open"
  >
    <Dialog
      class="relative z-50"
      @close="$emit('close')"
    >
      <TransitionChild
        as="template"
        enter="ease-in-out duration-500"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in-out duration-500"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-base-content/25 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-2xl pl-10 sm:pl-16">
            <TransitionChild
              as="template"
              enter="transform transition ease-in-out duration-500 sm:duration-700"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-500 sm:duration-700"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel class="pointer-events-auto w-screen max-w-md">
                <div class="h-full flex flex-col bg-base-100 shadow-xl">
                  <!-- Header -->
                  <div class="flex items-center justify-between p-4 border-b border-base-300">
                    <div class="flex items-center gap-2">
                      <h2 class="text-lg font-semibold text-base-content">
                        Wallet Manager
                      </h2>
                      <div
                        v-if="authzInfo?.enabled"
                        class="badge badge-info gap-1"
                      >
                        <span>Authz:</span>
                        <span>
                          signing as {{ (authzInfo.grantee || '').slice(0, 8) }}… for
                          {{ (authzInfo.granter || '').slice(0, 8) }}…
                        </span>
                      </div>
                    </div>
                    <button
                      class="btn btn-ghost btn-sm btn-circle"
                      data-testid="close-drawer"
                      @click="$emit('close')"
                    >
                      <XMarkIcon class="h-5 w-5" />
                    </button>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <!-- Keplr -->
                    <div class="space-y-2">
                      <div
                        v-if="hasKeplrWallet"
                        class="transition-colors border"
                        :class="
                          isKeplrSelected
                            ? 'border-success bg-success/10'
                            : 'border-base-300 hover:bg-base-50'
                        "
                        data-testid="keplr-wallet-row"
                      >
                        <div class="p-3 flex-1">
                          <!-- Wallet Name and Actions -->
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <img
                                :src="keplrLogo"
                                alt="Keplr"
                                class="w-5 h-5"
                              >
                              <div class="font-medium text-base text-base-content">
                                {{ keplrWallet?.name }} (Keplr)
                              </div>
                            </div>
                            <div class="flex items-center gap-1">
                              <button
                                class="btn btn-ghost btn-xs"
                                data-testid="view-keplr-address"
                                @click.stop="router.push(`/address/${keplrWallet?.address}`)"
                              >
                                Go to address
                              </button>
                            </div>
                          </div>

                          <!-- Address Header -->
                          <div class="text-xs text-base-content/80 mb-2">
                            <AddressDisplay
                              :address="keplrWallet?.address"
                              :truncate="false"
                            />
                          </div>

                          <!-- Actions Row -->
                          <div class="flex items-center gap-2 mt-3">
                            <button
                              class="btn btn-primary btn-xs"
                              :class="{
                                'btn-disabled': isKeplrSelected,
                              }"
                              :disabled="isKeplrSelected"
                              data-testid="select-keplr-wallet"
                              @click="selectKeplrWallet"
                            >
                              {{ isKeplrSelected ? 'Selected' : 'Select' }}
                            </button>

                            <button
                              class="btn btn-outline btn-xs"
                              :disabled="loading"
                              data-testid="disconnect-keplr"
                              @click.stop="handleKeplr"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        v-else
                        class="space-y-2"
                      >
                        <button
                          class="btn btn-lg flex items-center justify-between p-3 border-base-300 w-full text-left hover:bg-base-50 transition-colors"
                          :disabled="loading"
                          data-testid="connect-keplr"
                          @click="handleKeplr"
                        >
                          <div class="flex items-center gap-3">
                            <img
                              :src="keplrLogo"
                              alt="Keplr"
                              class="w-6 h-6"
                            >
                            <span class="font-medium text-base-content">Keplr Wallet</span>
                          </div>
                          <span class="text-primary text-sm font-medium"> Connect </span>
                        </button>

                        <div
                          v-if="keplrError"
                          class="text-error text-xs mt-1 px-3"
                          data-testid="keplr-error"
                        >
                          {{ keplrError }}
                        </div>
                      </div>
                    </div>

                    <!-- All Wallets -->
                    <div class="space-y-2">
                      <div
                        v-for="wallet in localCosmJsWallets"
                        :key="wallet.name"
                        class="transition-colors border"
                        :class="
                          isWalletSelected(wallet)
                            ? 'border-success bg-success/10'
                            : 'border-base-300 hover:bg-base-50'
                        "
                        :data-testid="`wallet-row-${wallet.name}`"
                      >
                        <!-- Wallet Card Content -->
                        <div class="p-3 flex-1">
                          <!-- Wallet Name and Actions -->
                          <div class="flex items-center justify-between">
                            <div
                              class="font-medium text-base text-base-content"
                              :data-testid="`wallet-name-${wallet.name}`"
                            >
                              {{ wallet.name }}
                            </div>
                            <div class="flex items-center gap-1">
                              <button
                                class="btn btn-ghost btn-xs"
                                :data-testid="`view-address-${wallet.name}`"
                                @click.stop="router.push(`/address/${wallet.address}`)"
                              >
                                Go to address
                              </button>
                            </div>
                          </div>

                          <!-- Address Header -->
                          <div
                            class="text-xs text-base-content/80 mb-2"
                            :data-testid="`wallet-address-${wallet.name}`"
                          >
                            <AddressDisplay
                              :address="wallet.address"
                              :truncate="false"
                            />
                          </div>

                          <!-- Actions Row -->
                          <div class="flex items-center gap-2 mt-3">
                            <!-- Select button - only visible when unlocked, disabled when selected -->
                            <!-- Selection removed: explicit selection happens per action via WalletSelector -->

                            <!-- Lock/Unlock button - always visible, switches based on state -->
                            <button
                              v-if="isWalletUnlocked(wallet)"
                              class="btn btn-outline btn-xs"
                              :data-testid="`lock-wallet-${wallet.name}`"
                              @click.stop="lockWallet(wallet.name)"
                            >
                              Lock
                            </button>

                            <div
                              v-else
                              class="flex flex-col gap-1"
                            >
                              <div class="flex items-center gap-1">
                                <input
                                  type="password"
                                  placeholder="Password"
                                  class="input input-xs w-20 text-xs"
                                  :class="{
                                    'input-error': unlockErrors[wallet.name],
                                    'input-disabled': unlockLoading[wallet.name],
                                  }"
                                  :data-testid="`unlock-password-${wallet.name}`"
                                  :disabled="unlockLoading[wallet.name]"
                                  @click.stop
                                  @input="clearUnlockError(wallet.name)"
                                  @keyup.enter="
                                    (e) =>
                                      !unlockLoading[wallet.name] &&
                                      handleInlineUnlock(wallet, e.target.value)
                                  "
                                >
                                <button
                                  class="btn btn-primary btn-xs"
                                  :disabled="unlockLoading[wallet.name]"
                                  :data-testid="`unlock-wallet-${wallet.name}`"
                                  @click.stop="() => handleUnlockClick(wallet)"
                                >
                                  <span
                                    v-if="unlockLoading[wallet.name]"
                                    class="loading loading-spinner loading-xs mr-1"
                                  />
                                  {{ unlockLoading[wallet.name] ? 'Unlocking...' : 'Unlock' }}
                                </button>
                              </div>
                              <!-- Error message -->
                              <div
                                v-if="unlockErrors[wallet.name]"
                                class="text-xs text-error"
                                :data-testid="`unlock-error-${wallet.name}`"
                              >
                                {{ unlockErrors[wallet.name] }}
                              </div>
                            </div>

                            <button
                              class="btn btn-ghost btn-xs text-error ml-auto"
                              :data-testid="`wallet-remove-${wallet.name}`"
                              @click.stop="handleRemoveWallet(wallet.name)"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="localCosmJsWallets.length === 0"
                        class="text-center text-base-content/60 text-sm py-4"
                      >
                        No wallets imported yet
                      </div>
                    </div>

                    <!-- Compact Import -->
                    <div class="p-3 border border-base-300">
                      <div class="text-sm font-medium mb-2 text-base-content">
                        Import New Wallet
                      </div>
                      <form
                        data-testid="import-wallet-form"
                        @submit.prevent="handleImport"
                      >
                        <div class="space-y-3">
                          <!-- Wallet Name -->
                          <input
                            v-model="newWalletName"
                            placeholder="Wallet name"
                            class="input input-sm w-full text-xs"
                            data-testid="wallet-name-input"
                            required
                          >

                          <!-- Recovery Phrase -->
                          <div class="space-y-2">
                            <textarea
                              v-model="mnemonic"
                              placeholder="Enter recovery phrase..."
                              class="textarea textarea-sm w-full text-xs resize-none"
                              rows="2"
                              data-testid="mnemonic-input"
                              required
                            />
                            <div class="flex gap-1">
                              <button
                                type="button"
                                class="btn btn-xs btn-outline"
                                data-testid="generate-12-words"
                                :disabled="loading"
                                @click="generateSeed(12)"
                              >
                                12W
                              </button>
                              <button
                                type="button"
                                class="btn btn-xs btn-outline"
                                data-testid="generate-24-words"
                                :disabled="loading"
                                @click="generateSeed(24)"
                              >
                                24W
                              </button>
                            </div>
                          </div>

                          <!-- Security Confirmation -->
                          <label class="flex items-start gap-2 text-xs">
                            <input
                              v-model="seedBackedUp"
                              type="checkbox"
                              class="checkbox checkbox-xs mt-0.5"
                              data-testid="security-confirmation"
                              required
                            >
                            <span class="text-base-content/80">I've backed up my recovery phrase</span>
                          </label>

                          <!-- Password -->
                          <input
                            v-model="newWalletPassword"
                            type="password"
                            placeholder="Password"
                            class="input input-sm w-full text-xs mb-4"
                            data-testid="wallet-password-input"
                            :disabled="!seedBackedUp"
                            required
                          >
                        </div>

                        <!-- Error Message -->
                        <div
                          v-if="importError"
                          class="text-error text-xs p-2 bg-error/10 border border-error/20"
                          data-testid="import-error"
                        >
                          {{ importError }}
                        </div>

                        <!-- Import Button - Full Width -->
                        <button
                          type="submit"
                          class="btn btn-primary w-full"
                          :disabled="!canImport || loading"
                          data-testid="import-wallet-submit"
                        >
                          <span
                            v-if="loading"
                            class="loading loading-spinner loading-sm"
                          />
                          <span v-else>Import Wallet</span>
                        </button>
                      </form>
                    </div>

                    <!-- Disconnect All -->
                    <button
                      class="btn btn-error btn-outline w-full"
                      data-testid="disconnect-all"
                      :disabled="unlockedWallets.length === 0"
                      @click="handleDisconnectAll"
                    >
                      Disconnect All
                    </button>

                    <!-- Remove All -->
                    <button
                      class="btn btn-error w-full"
                      data-testid="remove-all"
                      :disabled="localCosmJsWallets.length === 0"
                      @click="handleRemoveAll"
                    >
                      Remove All Wallets
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, computed, nextTick, watch, reactive } from 'vue'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useWallet } from '@/composables/useWallet'
import { useRouter } from 'vue-router'
import AddressDisplay from '@/components/AddressDisplay.vue'
import keplrLogo from '@/assets/images/keplr-logo-256.png'

// Props & Emits
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  authzInfo: {
    type: Object,
    default: null,
  },
})

defineEmits(['close'])

// Composables
const {
  unlockedWallets,
  localCosmJsWallets,
  connectExtension,
  importNamedCosmJsWallet,
  connectNamedCosmJsWallet,
  lockWallet,
  unlockWallet,
  removeNamedCosmJsWallet,
  generateMnemonic,
  disconnectWallet,
  selectWallet,
} = useWallet()

const router = useRouter()

// Form state
const mnemonic = ref('')
const newWalletName = ref('')
const newWalletPassword = ref('')
const seedBackedUp = ref(false)
const loading = ref(false)
const importError = ref('')
const keplrError = ref('')

// Unlock state per wallet - use reactive for better reactivity
const unlockLoading = reactive({})
const unlockErrors = reactive({})

// Computed
// Removed global selected wallet concept for signing; drawer remains for connect/unlock/remove only

const canImport = computed(
  () =>
    newWalletName.value.trim() &&
    newWalletPassword.value.trim() &&
    mnemonic.value.trim() &&
    seedBackedUp.value
)

const hasKeplrWallet = computed(() => {
  return unlockedWallets.value.some((w) => w.type === 'keplr')
})

const keplrWallet = computed(() => {
  return unlockedWallets.value.find((w) => w.type === 'keplr')
})

const isKeplrSelected = computed(() => false)

// Watchers to reset form validation when inputs change
watch([newWalletName, mnemonic], () => {
  // Clear password and uncheck confirmation when name or mnemonic changes
  if (newWalletPassword.value || seedBackedUp.value) {
    newWalletPassword.value = ''
    seedBackedUp.value = false
  }
})

// Clear errors when form inputs change
watch([mnemonic, newWalletName, newWalletPassword, seedBackedUp], () => {
  if (importError.value) {
    importError.value = ''
  }
})

// Add function to clear unlock error when user starts typing
const clearUnlockError = (walletName) => {
  if (unlockErrors[walletName]) {
    delete unlockErrors[walletName]
  }
}

// Handle unlock button click by finding the password input
const handleUnlockClick = (wallet) => {
  if (unlockLoading[wallet.name]) return // Prevent multiple clicks while loading

  const input = document.querySelector(`[data-testid="unlock-password-${wallet.name}"]`)
  if (input && input.value && input.value.trim()) {
    handleInlineUnlock(wallet, input.value)
  }
}

// Helper functions

const isWalletSelected = () => false

const isWalletUnlocked = (wallet) => {
  return unlockedWallets.value.some((w) => w.address === wallet.address)
}

const selectWalletByName = () => {}

const handleRemoveWallet = (walletName) => {
  const confirmed = confirm(
    `Are you sure you want to remove wallet "${walletName}"?\n\nThis action cannot be undone. You will need to re-import this wallet using your recovery phrase.`
  )

  if (confirmed) {
    removeNamedCosmJsWallet(walletName)
  }
}

const handleRemoveAll = () => {
  if (localCosmJsWallets.value.length === 0) return

  const walletCount = localCosmJsWallets.value.length
  const confirmed = confirm(
    `Are you sure you want to remove ALL ${walletCount} wallet${
      walletCount > 1 ? 's' : ''
    }?\n\nThis action cannot be undone. You will need to re-import all wallets using their recovery phrases.`
  )

  if (confirmed) {
    // Disconnect first to clear active wallet
    disconnectWallet()

    // Remove all local wallets
    const walletsToRemove = [...localCosmJsWallets.value]
    walletsToRemove.forEach((wallet) => {
      removeNamedCosmJsWallet(wallet.name)
    })
  }
}

// Actions

const selectKeplrWallet = () => {}

const handleDisconnectAll = () => {
  disconnectWallet()
  // Clear unlocked wallets array
  unlockedWallets.value.length = 0
}

const generateSeed = async (wordCount) => {
  try {
    loading.value = true
    mnemonic.value = await generateMnemonic(wordCount)
  } catch (err) {
    console.error('Failed to generate mnemonic:', err)
  } finally {
    loading.value = false
  }
}

const handleKeplr = async () => {
  loading.value = true
  keplrError.value = ''
  try {
    if (hasKeplrWallet.value) {
      // Disconnect Keplr wallet
      const keplrWallet = unlockedWallets.value.find((w) => w.type === 'keplr')
      if (keplrWallet) {
        lockWallet(keplrWallet.name)
      }
    } else {
      // Connect Keplr
      await connectExtension('keplr')
    }
  } catch (err) {
    console.error('Keplr operation failed:', err)
    keplrError.value = err.message || 'Failed to connect to Keplr'
  } finally {
    loading.value = false
  }
}

const handleImport = async () => {
  loading.value = true
  importError.value = ''
  try {
    await importNamedCosmJsWallet(
      newWalletName.value.trim(),
      mnemonic.value.trim(),
      newWalletPassword.value
    )
    await connectNamedCosmJsWallet(newWalletName.value.trim(), newWalletPassword.value)
    // Reset form
    mnemonic.value = ''
    newWalletName.value = ''
    newWalletPassword.value = ''
    seedBackedUp.value = false
  } catch (err) {
    console.error('Wallet import failed:', err)
    importError.value = err.message || 'Failed to import wallet'
  } finally {
    loading.value = false
  }
}

const handleInlineUnlock = (wallet, password) => {
  if (!password.trim()) return

  // Set loading state for this specific wallet
  unlockLoading[wallet.name] = true
  unlockErrors[wallet.name] = ''

  nextTick(() => {
    unlockWallet(wallet.name, password)
      .then(() => {
        // Clear password input on success
        const input = document.querySelector(`[data-testid="unlock-password-${wallet.name}"]`)
        if (input) input.value = ''

        // Clear any previous error
        delete unlockErrors[wallet.name]
      })
      .catch((err) => {
        console.error('Unlock failed:', err)
        unlockErrors[wallet.name] = err.message || 'Invalid password'
      })
      .finally(() => {
        unlockLoading[wallet.name] = false
      })
  })
}
</script>
