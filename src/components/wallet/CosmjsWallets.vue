<template>
  <div class="space-y-2">
    <div v-for="wallet in localCosmJsWallets" :key="wallet.name" class="collapse collapse-arrow">
      <input type="checkbox" />
      <div class="collapse-title">
        <div class="text-base" :class="{ 'font-bold': route.params.address === wallet.address }">
          {{ wallet.name }}
        </div>
      </div>
      <div class="collapse-content text-sm">
        <div class="text-xs text-base-content/80 mb-2 break-all">
          <AddressDisplay :address="wallet.address" :truncate="10" />
        </div>
        <div class="mt-1 text-xs grid grid-cols-3 gap-2">
          <RouterLink v-for="item in linkItems(wallet.address)" :key="item.text" :to="item.to">
            {{ item.text }}
          </RouterLink>
        </div>
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
              <input
                v-model="unlockPassword[wallet.name]"
                type="password"
                placeholder="Password"
                class="input input-xs w-24 text-xs"
                :class="{ 'input-error': unlockErrors[wallet.name] }"
              />
              <button class="btn btn-primary btn-xs" @click="doUnlock(wallet.name)">Unlock</button>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-xs text-error"
            @click="handleRemoveWallet(wallet.name)"
            aria-label="Remove wallet"
          >
            X
          </button>
        </div>
        <div v-if="unlockErrors[wallet.name]" class="text-xs text-error mt-1">
          {{ unlockErrors[wallet.name] }}
        </div>
      </div>
    </div>

    <div class="collapse collapse-arrow" data-testid="cosmjs-add-collapse">
      <input type="checkbox" data-testid="cosmjs-add-toggle" />
      <div class="collapse-title font-medium">+ Add CosmJS wallet</div>
      <div class="collapse-content flex flex-col gap-2">
        <input
          v-model="newWalletName"
          placeholder="Wallet name"
          class="input input-xs w-full"
          data-testid="cosmjs-name-input"
        />
        <textarea
          v-model="mnemonic"
          placeholder="Enter recovery phrase..."
          class="textarea textarea-xs w-full resize-none"
          rows="4"
          data-testid="cosmjs-mnemonic-input"
        ></textarea>

        <button type="button" class="btn btn-outline btn-xs" @click="generateSeed(24)">
          Generate Seed
        </button>
        <label class="flex items-start gap-2 text-xs"
          ><input
            v-model="seedBackedUp"
            type="checkbox"
            class="checkbox checkbox-xs mt-0.5"
            data-testid="cosmjs-seed-confirm"
          /><span class="opacity-80 text-xs"
            >I have backed up my seed phrase and understand the risks. I take full responsibility
            for my actions.</span
          ></label
        >

        <input
          v-model="newWalletPassword"
          type="password"
          placeholder="Password"
          class="input input-xs w-full"
          :disabled="!seedBackedUp"
          data-testid="cosmjs-password-input"
        />
        <div v-if="importError" class="text-error text-xs">{{ importError }}</div>
        <button
          class="btn btn-primary w-full btn-sm"
          :disabled="!canImport || importLoading"
          @click="handleImport"
          data-testid="cosmjs-add-button"
        >
          <span v-if="importLoading" class="loading loading-spinner loading-xs mr-1"></span>
          Add Wallet
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { RouterLink, useRoute } from 'vue-router'

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
  const confirmed = confirm(`Remove wallet "${walletName}"?`)
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

function linkItems(address) {
  if (!address) return []
  return [
    { text: 'Summary', to: { name: 'AddressSummary', params: { address } } },
    { text: 'Coins', to: { name: 'AddressCoins', params: { address } } },
    { text: 'NFTs', to: { name: 'AddressNFTs', params: { address } } },
    { text: 'Staking', to: { name: 'AddressStaking', params: { address } } },
    { text: 'Names', to: { name: 'AddressNames', params: { address } } },
    { text: 'Script', to: { name: 'AddressScript', params: { address } } },
    { text: 'Storage', to: { name: 'AddressStorage', params: { address } } },
    { text: 'Tasks', to: { name: 'AddressTasks', params: { address } } },
    { text: 'Authz', to: { name: 'AddressAuthz', params: { address } } },
  ]
}
</script>

<style scoped>
@import '@/style.css';

.router-link-exact-active {
  @apply font-bold;
}
</style>
