<template>
  <div :class="['flex flex-col space-y-1', isCollapsed ? 'items-center' : '']">
    <!-- Keplr Wallet -->
    <Collapsible v-model:open="keplrExpanded">
      <CollapsibleTrigger as-child>
        <button
          :class="[
            'flex items-center rounded-md text-sm whitespace-nowrap overflow-hidden',
            isIconMode ? 'size-8 p-0' : 'w-full gap-2 px-2 py-1.5',
            isCollapsed ? 'justify-center' : '',
            isKeplrActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
        >
          <div class="relative flex-shrink-0">
            <div
              :class="[
                'size-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                isKeplrConnected ? 'bg-primary text-primary-foreground' : 'bg-muted'
              ]"
            >
              K
            </div>
          </div>
          <span
            v-if="!isCollapsed"
            class="flex-1 text-left text-xs font-medium truncate"
          >
            {{ keplrTitle }}
          </span>
          <ChevronRight
            v-if="!isCollapsed"
            :class="[
              'size-3 text-muted-foreground transition-transform',
              keplrExpanded ? 'rotate-90' : ''
            ]"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="px-2 py-2 space-y-2">
          <button
            v-if="keplrAddress"
            class="text-[10px] text-muted-foreground font-mono truncate block w-full text-left hover:text-foreground"
            :title="copied === keplrAddress ? 'Copied!' : 'Click to copy'"
            @click="copyAddress(keplrAddress)"
          >
            {{ copied === keplrAddress ? 'Copied!' : keplrAddress }}
          </button>

          <div v-if="keplrAddress" class="space-y-2">
            <div class="grid grid-cols-3 gap-1">
              <router-link
                v-for="link in addressLinks"
                :key="link.name"
                :to="{ name: link.name, params: { address: keplrAddress } }"
                :class="[
                  'px-2 py-1 text-xs rounded text-center truncate',
                  isLinkActive(link.name, keplrAddress) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                ]"
              >
                {{ link.label }}
              </router-link>
            </div>
            <button
              class="w-full px-2 py-1 text-xs rounded hover:bg-muted text-left text-destructive"
              :disabled="keplrBusy"
              @click="disconnectKeplr"
            >
              Disconnect
            </button>
          </div>

          <div v-else class="space-y-2">
            <Button
              size="sm"
              class="w-full"
              :disabled="keplrBusy || !isKeplrAvailable"
              @click="connectKeplr"
            >
              <Loader2 v-if="keplrBusy" class="mr-2 h-4 w-4 animate-spin" />
              Connect Keplr
            </Button>
            <p v-if="!isKeplrAvailable" class="text-destructive text-xs">
              Keplr extension not available
            </p>
          </div>

          <p v-if="keplrError" class="text-destructive text-xs">{{ keplrError }}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <!-- CosmJS Wallets -->
    <Collapsible
      v-for="wallet in localCosmJsWallets"
      :key="wallet.name"
      v-model:open="walletExpanded[wallet.name]"
    >
      <CollapsibleTrigger as-child>
        <button
          :class="[
            'flex items-center rounded-md text-sm whitespace-nowrap overflow-hidden',
            isIconMode ? 'size-8 p-0' : 'w-full gap-2 px-2 py-1.5',
            isCollapsed ? 'justify-center' : '',
            isWalletActive(wallet) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
        >
          <div class="relative flex-shrink-0">
            <div
              :class="[
                'size-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                isWalletUnlocked(wallet) ? 'bg-primary text-primary-foreground' : 'bg-muted'
              ]"
            >
              {{ wallet.name.charAt(0).toUpperCase() }}
            </div>
          </div>
          <span
            v-if="!isCollapsed"
            class="flex-1 text-left text-xs font-medium truncate"
          >
            {{ wallet.name }}
          </span>
          <ChevronRight
            v-if="!isCollapsed"
            :class="[
              'size-3 text-muted-foreground transition-transform',
              walletExpanded[wallet.name] ? 'rotate-90' : ''
            ]"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="px-2 py-2 space-y-2">
          <button
            class="text-[10px] text-muted-foreground font-mono truncate block w-full text-left hover:text-foreground"
            :title="copied === wallet.address ? 'Copied!' : 'Click to copy'"
            @click="copyAddress(wallet.address)"
          >
            {{ copied === wallet.address ? 'Copied!' : wallet.address }}
          </button>

          <div v-if="isWalletUnlocked(wallet)" class="space-y-2">
            <div class="grid grid-cols-3 gap-1">
              <router-link
                v-for="link in addressLinks"
                :key="link.name"
                :to="{ name: link.name, params: { address: wallet.address } }"
                :class="[
                  'px-2 py-1 text-xs rounded text-center truncate',
                  isLinkActive(link.name, wallet.address) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                ]"
              >
                {{ link.label }}
              </router-link>
            </div>
            <div class="flex gap-1">
              <button
                class="flex-1 px-2 py-1 text-xs rounded hover:bg-muted"
                @click="lockWallet(wallet.name)"
              >
                Lock
              </button>
              <button
                class="flex-1 px-2 py-1 text-xs rounded hover:bg-muted text-destructive"
                @click="openRemoveDialog(wallet.name)"
              >
                Remove
              </button>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div class="flex items-center gap-2">
              <Input
                v-model="unlockPasswords[wallet.name]"
                type="password"
                placeholder="Password"
                class="flex-1 h-7 text-xs"
                :class="{ 'border-destructive': unlockErrors[wallet.name] }"
                @keyup.enter="doUnlock(wallet.name)"
              />
              <Button size="sm" class="h-7" @click="doUnlock(wallet.name)">
                Unlock
              </Button>
            </div>
            <p v-if="unlockErrors[wallet.name]" class="text-destructive text-xs">
              {{ unlockErrors[wallet.name] }}
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <!-- Add Wallet -->
    <Collapsible v-model:open="addWalletOpen">
      <CollapsibleTrigger as-child>
        <button
          :class="[
            'flex items-center rounded-md text-sm whitespace-nowrap overflow-hidden',
            isIconMode ? 'size-8 p-0' : 'w-full gap-2 px-2 py-1.5',
            isCollapsed ? 'justify-center' : '',
            'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
        >
          <div class="size-6 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
            <Plus class="size-3" />
          </div>
          <span
            v-if="!isCollapsed"
            class="flex-1 text-left text-xs"
          >
            Add wallet
          </span>
          <ChevronRight
            v-if="!isCollapsed"
            :class="[
              'size-3 text-muted-foreground transition-transform',
              addWalletOpen ? 'rotate-90' : ''
            ]"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="px-2 py-2 space-y-2">
          <Input
            v-model="newWalletName"
            placeholder="Wallet name"
            class="w-full h-7 text-xs"
          />
          <Textarea
            v-model="mnemonic"
            placeholder="Enter recovery phrase..."
            class="w-full resize-none min-h-16 text-xs"
          />
          <Button type="button" variant="outline" size="sm" class="h-7 text-xs" @click="generateSeed(24)">
            Generate Seed
          </Button>
          <label class="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              v-model="seedBackedUp"
              class="mt-0.5"
            />
            <span class="text-muted-foreground">
              I have backed up my seed phrase
            </span>
          </label>
          <Input
            v-model="newWalletPassword"
            type="password"
            placeholder="Password"
            class="w-full h-7 text-xs"
            :disabled="!seedBackedUp"
          />

          <p v-if="importError" class="text-destructive text-xs">{{ importError }}</p>

          <Button
            class="w-full h-7 text-xs"
            size="sm"
            :disabled="!canImport || importLoading"
            @click="handleImport"
          >
            <Loader2 v-if="importLoading" class="mr-2 h-3 w-3 animate-spin" />
            Add Wallet
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <!-- Remove Wallet Dialog -->
    <AlertDialog v-model:open="removeDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove wallet</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The wallet "{{ walletToRemove }}" will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="confirmRemove">Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWallet } from '@/composables/useWallet'
import { useSidebar } from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Loader2, Plus, ChevronRight } from 'lucide-vue-next'

const route = useRoute()
const { state, isMobile, openMobile } = useSidebar()

// Sidebar collapsed state - CSS handles transition timing
const isCollapsed = computed(() => {
  if (isMobile.value) return !openMobile.value
  return state.value === 'collapsed'
})

// Alias for backwards compatibility
const isIconMode = isCollapsed

const {
  unlockedWallets,
  localCosmJsWallets,
  lockWallet,
  unlockWallet,
  removeNamedCosmJsWallet,
  generateMnemonic,
  importNamedCosmJsWallet,
  connectNamedCosmJsWallet,
  connectExtension,
} = useWallet()

// Expanded states
const keplrExpanded = ref(false)
const walletExpanded = reactive<Record<string, boolean>>({})
const addWalletOpen = ref(false)

// Keplr state
const keplrWallet = computed(() => unlockedWallets.value.find((w: any) => w.type === 'keplr') || null)
const keplrAddress = computed(() => keplrWallet.value?.address || '')
const keplrTitle = computed(() => keplrWallet.value?.name || 'Keplr Wallet')
const isKeplrConnected = computed(() => Boolean(keplrWallet.value) && isKeplrAvailable.value)
const isKeplrActive = computed(() => route.params.address === keplrAddress.value)
const keplrBusy = ref(false)
const keplrError = ref('')
const isKeplrAvailable = ref(false)

onMounted(() => {
  isKeplrAvailable.value = typeof window !== 'undefined' && !!(window as any).keplr
})

async function connectKeplr() {
  keplrError.value = ''
  keplrBusy.value = true
  try {
    await connectExtension('keplr')
  } catch (e: any) {
    keplrError.value = e?.message || String(e)
  } finally {
    keplrBusy.value = false
  }
}

function disconnectKeplr() {
  const w = keplrWallet.value
  if (!w) return
  lockWallet(w.name)
}

// CosmJS wallet state
const unlockPasswords = reactive<Record<string, string>>({})
const unlockErrors = reactive<Record<string, string>>({})

function isWalletUnlocked(wallet: any): boolean {
  return unlockedWallets.value.some((w: any) => w.address === wallet.address)
}

function isWalletActive(wallet: any): boolean {
  return route.params.address === wallet.address
}

function isLinkActive(routeName: string, address: string): boolean {
  return route.name === routeName && route.params.address === address
}

async function doUnlock(name: string) {
  unlockErrors[name] = ''
  try {
    await unlockWallet(name, unlockPasswords[name] || '')
    unlockPasswords[name] = ''
  } catch (e: any) {
    unlockErrors[name] = e?.message || 'Invalid password'
  }
}

// Remove wallet
const removeDialogOpen = ref(false)
const walletToRemove = ref('')

function openRemoveDialog(name: string) {
  walletToRemove.value = name
  removeDialogOpen.value = true
}

function confirmRemove() {
  if (!walletToRemove.value) return
  removeNamedCosmJsWallet(walletToRemove.value)
  removeDialogOpen.value = false
  walletToRemove.value = ''
}

// Add wallet
const newWalletName = ref('')
const mnemonic = ref('')
const seedBackedUp = ref(false)
const newWalletPassword = ref('')
const importLoading = ref(false)
const importError = ref('')

const canImport = computed(() =>
  newWalletName.value.trim() &&
  mnemonic.value.trim() &&
  seedBackedUp.value &&
  newWalletPassword.value.trim()
)

async function generateSeed(wordCount: number) {
  importLoading.value = true
  try {
    mnemonic.value = await generateMnemonic(wordCount)
  } finally {
    importLoading.value = false
  }
}

async function handleImport() {
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
    addWalletOpen.value = false
  } catch (e: any) {
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

function truncateAddress(address: string): string {
  if (!address || address.length < 16) return address
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

// Copy to clipboard
const copied = ref('')

async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address)
    copied.value = address
    setTimeout(() => { copied.value = '' }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

// Address navigation links
const addressLinks = [
  { name: 'AddressSummary', label: 'Summary' },
  { name: 'AddressCoins', label: 'Coins' },
  { name: 'AddressStaking', label: 'Staking' },
  { name: 'AddressScript', label: 'Script' },
  { name: 'AddressNames', label: 'Names' },
  { name: 'AddressStorage', label: 'Storage' },
  { name: 'AddressTasks', label: 'Tasks' },
  { name: 'AddressNFTs', label: 'NFTs' },
  { name: 'AddressAuthz', label: 'Authz' },
]

// Auto-expand wallet section when its address is active
function expandActiveWallet() {
  const currentAddress = route.params.address as string | undefined
  if (!currentAddress) return
  if (keplrAddress.value && currentAddress === keplrAddress.value) {
    keplrExpanded.value = true
    return
  }
  for (const wallet of localCosmJsWallets.value) {
    if (wallet.address === currentAddress) {
      walletExpanded[wallet.name] = true
      return
    }
  }
}

function closeAllWalletSections() {
  keplrExpanded.value = false
  Object.keys(walletExpanded).forEach(key => { walletExpanded[key] = false })
  addWalletOpen.value = false
}

watch(isCollapsed, (collapsed) => {
  if (collapsed) {
    closeAllWalletSections()
  } else {
    expandActiveWallet()
  }
})

// Expand active wallet on route change (no delay needed for navigation)
watch(() => route.params.address, () => {
  if (!isCollapsed.value) {
    expandActiveWallet()
  }
}, { immediate: true })
</script>
