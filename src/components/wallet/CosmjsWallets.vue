<template>
  <Accordion type="multiple" collapsible v-model="openValues" class="">
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
        <div class="pt-3 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <Button
                v-if="isWalletUnlocked(wallet)"
                variant="outline"
                size="sm"
                @click="lockWallet(wallet.name)"
              >
                Lock
              </Button>

              <div v-else class="flex items-center gap-2">
                <Input
                  v-model="unlockPassword[wallet.name]"
                  type="password"
                  placeholder="Password"
                  :class="[{ 'border-destructive': unlockErrors[wallet.name] }]"
                />
                <Button size="sm" @click="doUnlock(wallet.name)">Unlock</Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove wallet"
              @click="openRemoveDialog(wallet.name)"
              :data-test-id="`remove-wallet-${wallet.name}`"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <p v-if="unlockErrors[wallet.name]" class="text-destructive text-sm">
            {{ unlockErrors[wallet.name] }}
          </p>
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
        <div class="space-y-3">
          <div class="space-y-2">
            <Input
              v-model="newWalletName"
              placeholder="Wallet name"
              class="w-full"
              data-testid="cosmjs-name-input"
            />
            <Textarea
              v-model="mnemonic"
              placeholder="Enter recovery phrase..."
              class="w-full resize-none min-h-24"
              data-testid="cosmjs-mnemonic-input"
            />
            <Button type="button" variant="outline" size="sm" @click="generateSeed(24)">
              Generate Seed
            </Button>
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
              class="w-full"
              :disabled="!seedBackedUp"
              data-testid="cosmjs-password-input"
            />
          </div>
          <p v-if="importError" class="text-destructive text-sm">
            {{ importError }}
          </p>
          <Button
            class="w-full"
            size="sm"
            :disabled="!canImport || importLoading"
            data-testid="cosmjs-add-button"
            @click="handleImport"
          >
            <Loader2 v-if="importLoading" class="mr-2 h-4 w-4 animate-spin" />
            Add Wallet
          </Button>
        </div>
      </template>
    </WalletAccordian>
  </Accordion>

  <AlertDialog v-model:open="removeDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove wallet</AlertDialogTitle>
        <AlertDialogDescription>
          This action is destructive and cannot be undone. The wallet "{{ walletNameToRemove }}"
          will be removed from this browser.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="confirmRemove">Remove</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useWallet } from '@/composables/useWallet'
import { useRoute } from 'vue-router'
import { Accordion } from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Loader2, X } from 'lucide-vue-next'
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

// Persist open states across reloads (multiple selection supported)
const openValues = useStorage('accordion:cosmjs-open', [])

const unlockPassword = reactive({})
const unlockErrors = reactive({})

const removeDialogOpen = ref(false)
const walletNameToRemove = ref('')

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

function openRemoveDialog(walletName) {
  walletNameToRemove.value = walletName
  removeDialogOpen.value = true
}

function confirmRemove() {
  if (!walletNameToRemove.value) return
  removeNamedCosmJsWallet(walletNameToRemove.value)
  removeDialogOpen.value = false
  walletNameToRemove.value = ''
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
