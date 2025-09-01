<template>
  <div class="space-y-2">
    <div
      v-for="wallet in localCosmJsWallets"
      :key="wallet.name"
      class="collapse collapse-arrow border border-primary/20"
      :class="{
        'border-success': route.params.address === wallet.address && isWalletUnlocked(wallet),
        'border-warning': route.params.address === wallet.address && !isWalletUnlocked(wallet),
      }"
      :data-testid="`wallet-item-${wallet.name}`"
    >
      <input type="checkbox" />
      <div class="collapse-title">
        <div class="text-base" :class="{ 'font-bold': route.params.address === wallet.address }">
          {{ wallet.name }}
        </div>
      </div>
      <div class="collapse-content">
        <div class="mb-2 break-all">
          <AddressDisplay :address="wallet.address" :truncate="10" />
        </div>
        <div class="mt-1 grid grid-cols-3 gap-2 text-xs">
          <RouterLink v-for="item in linkItems(wallet.address)" :key="item.text" :to="item.to">
            <span class="iconify size-3 mr-1" :class="item.iconClass" />
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
                class="input input-xs w-24"
                :class="{ 'input-error': unlockErrors[wallet.name] }"
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
      </div>
    </div>

    <div class="collapse collapse-arrow border border-primary/20" data-testid="cosmjs-add-collapse">
      <input type="checkbox" data-testid="cosmjs-add-toggle" />
      <div class="collapse-title">Add web wallet</div>
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
        />

        <button type="button" class="btn btn-outline btn-xs" @click="generateSeed(24)">
          Generate Seed
        </button>
        <label class="flex items-start gap-2">
          <Checkbox
            v-model:checked="seedBackedUp"
            class="mt-0.5"
            data-testid="cosmjs-seed-confirm"
            aria-label="Confirm seed backup"
          />
          <span class="opacity-80">
            I have backed up my seed phrase and understand the risks. I take full responsibility for
            my actions.
          </span>
        </label>

        <input
          v-model="newWalletPassword"
          type="password"
          placeholder="Password"
          class="input input-xs w-full"
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { RouterLink, useRoute } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'

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

function linkItems(address) {
  if (!address) return []
  return [
    {
      text: 'Summary',
      iconClass: 'lucide--scroll-text',
      to: { name: 'AddressSummary', params: { address } },
    },
    {
      text: 'Coins',
      iconClass: 'lucide--coins',
      to: { name: 'AddressCoins', params: { address } },
    },
    {
      text: 'NFTs',
      iconClass: 'lucide--file-badge-2',
      to: { name: 'AddressNFTs', params: { address } },
    },
    {
      text: 'Staking',
      iconClass: 'lucide--landmark',
      to: { name: 'AddressStaking', params: { address } },
    },
    {
      text: 'Names',
      iconClass: 'lucide--shield-check',
      to: { name: 'AddressNames', params: { address } },
    },
    {
      text: 'Script',
      iconClass: 'lucide--file-json',
      to: { name: 'AddressScript', params: { address } },
    },
    {
      text: 'Storage',
      iconClass: 'lucide--table',
      to: { name: 'AddressStorage', params: { address } },
    },
    {
      text: 'Tasks',
      iconClass: 'lucide--clock',
      to: { name: 'AddressTasks', params: { address } },
    },
    {
      text: 'Authz',
      iconClass: 'lucide--key-round',
      to: { name: 'AddressAuthz', params: { address } },
    },
  ]
}
</script>

<style scoped>
@import '@/style.css';

.router-link-exact-active {
  @apply font-bold;
}
</style>
