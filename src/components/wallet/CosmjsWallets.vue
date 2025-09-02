<template>
  <Accordion type="multiple" collapsible class="">
    <WalletAccordian
      v-for="wallet in localCosmJsWallets"
      :key="wallet.name"
      :value="wallet.name"
      :title="wallet.name"
      :is-active="route.params.address === wallet.address"
      :unlocked-active="isWalletUnlocked(wallet)"
      :address="wallet.address"
      :data-test-id="`wallet-item-${wallet.name}`"
    >
      <template #default>
        <div class="flex items-center justify-between gap-2 mt-2">
          <div class="">
            <button
              v-if="isWalletUnlocked(wallet)"
              class="btn btn-outline btn-xs"
              @click="lockWallet(wallet.name)"
            >
              Lock
            </button>

            <div v-else class="flex items-center gap-1">
              <Input
                v-model="unlockPassword[wallet.name]"
                type="password"
                placeholder="Password"
                :class="['h-8 w-24', { 'border-destructive': unlockErrors[wallet.name] }]"
              />
              <button class="btn btn-primary btn-xs" @click="doUnlock(wallet.name)">Unlock</button>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-xs text-error"
            aria-label="Remove wallet"
            @click="handleRemoveWallet(wallet.name)"
          >
            X
          </button>
        </div>
        <div v-if="unlockErrors[wallet.name]" class="text-error mt-1">
          {{ unlockErrors[wallet.name] }}
        </div>
      </template>
    </WalletAccordian>

    <WalletAccordian
      value="add-cosmjs"
      title="Add web wallet"
      :is-active="false"
      :unlocked-active="false"
      data-test-id="cosmjs-add-collapse"
      :item-class="''"
      :address="undefined"
      :trigger-test-id="'cosmjs-add-toggle'"
    >
      <template #default>
        <div class="flex flex-col gap-2">
          <Input
            v-model="newWalletName"
            placeholder="Wallet name"
            class="h-8 w-full"
            data-testid="cosmjs-name-input"
          />
          <Textarea
            v-model="mnemonic"
            placeholder="Enter recovery phrase..."
            class="w-full resize-none min-h-24"
            data-testid="cosmjs-mnemonic-input"
          />

          <button type="button" class="btn btn-outline btn-xs" @click="generateSeed(24)">
            Generate Seed
          </button>
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              v-model="seedBackedUp"
              class="mt-0.5"
              data-testid="cosmjs-seed-confirm"
              aria-label="Confirm seed backup"
            />
            <span class="opacity-80">
              I have backed up my seed phrase and understand the risks. I take full responsibility
              for my actions.
            </span>
          </label>

          <Input
            v-model="newWalletPassword"
            type="password"
            placeholder="Password"
            class="h-8 w-full"
            :disabled="!seedBackedUp"
            data-testid="cosmjs-password-input"
          />
          <div v-if="importError" class="text-error">
            {{ importError }}
          </div>
          <button
            class="btn btn-primary w-full btn-sm"
            :disabled="!canImport || importLoading"
            data-testid="cosmjs-add-button"
            @click="handleImport"
          >
            <span v-if="importLoading" class="loading loading-spinner loading-xs mr-1" />
            Add Wallet
          </button>
        </div>
      </template>
    </WalletAccordian>
  </Accordion>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useRoute } from 'vue-router'
import { Accordion } from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import WalletAccordian from '@/components/wallet/WalletAccordian.vue'

const {
  unlockedWallets,
  localCosmJsWallets,
  lockWallet,
  unlockWallet,
  removeNamedCosmJsWallet,
  generateMnemonic,
  importNamedCosmJsWallet,
  connectNamedCosmJsWallet,
} = useWallet()

const route = useRoute()

const unlockPassword = reactive({})
const unlockErrors = reactive({})

function isWalletUnlocked(wallet) {
  return unlockedWallets.value.some((w) => w.address === wallet.address)
}

async function doUnlock(name) {
  unlockErrors[name] = ''
  try {
    await unlockWallet(name, unlockPassword[name] || '')
    unlockPassword[name] = ''
  } catch (e) {
    unlockErrors[name] = e?.message || 'Invalid password'
  }
}

function handleRemoveWallet(walletName) {
  const confirmed = window.confirm(`Remove wallet "${walletName}"?`)
  if (confirmed) removeNamedCosmJsWallet(walletName)
}

const newWalletName = ref('')
const mnemonic = ref('')
const seedBackedUp = ref(false)
const newWalletPassword = ref('')
const importLoading = ref(false)
const importError = ref('')

const canImport = computed(
  () =>
    newWalletName.value.trim() &&
    mnemonic.value.trim() &&
    seedBackedUp.value &&
    newWalletPassword.value.trim()
)

const generateSeed = async (wordCount) => {
  importLoading.value = true
  try {
    mnemonic.value = await generateMnemonic(wordCount)
  } finally {
    importLoading.value = false
  }
}

const handleImport = async () => {
  importError.value = ''
  if (!canImport.value) return
  importLoading.value = true
  try {
    const name = newWalletName.value.trim()
    await importNamedCosmJsWallet(name, mnemonic.value.trim(), newWalletPassword.value)
    await connectNamedCosmJsWallet(name, newWalletPassword.value)
    newWalletName.value = ''
    mnemonic.value = ''
    seedBackedUp.value = false
    newWalletPassword.value = ''
  } catch (e) {
    importError.value = e?.message || 'Failed to import wallet'
  } finally {
    importLoading.value = false
  }
}

watch([newWalletName, mnemonic], () => {
  if (newWalletPassword.value || seedBackedUp.value) {
    newWalletPassword.value = ''
    seedBackedUp.value = false
  }
  if (importError.value) importError.value = ''
})

// links are now provided by WalletAccordian
</script>

<style scoped>
@import '@/style.css';

.router-link-exact-active {
  @apply font-bold;
}
</style>
