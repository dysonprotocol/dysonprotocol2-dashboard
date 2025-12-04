<template>
  <Card class="w-full mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl">Register a Name</CardTitle>
      <CardDescription> Your on-chain identity. One name, endless possibilities. </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Benefits section (collapsed by default, expandable) -->
      <Accordion type="single" collapsible>
        <AccordionItem value="benefits">
          <AccordionTrigger class="text-sm">
            <span class="flex items-center gap-2">
              <SparklesIcon class="w-4 h-4" />
              Why register a name?
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul class="text-sm text-muted-foreground space-y-2 pl-1">
              <li class="flex items-start gap-2">
                <GlobeAltIcon class="w-4 h-4 mt-0.5 shrink-0" />
                <span><strong>Host decentralized apps</strong> — Serve DWapps at yourname.dys</span>
              </li>
              <li class="flex items-start gap-2">
                <CurrencyDollarIcon class="w-4 h-4 mt-0.5 shrink-0" />
                <span
                  ><strong>Create custom tokens</strong> — Mint coins with your name as the
                  denomination</span
                >
              </li>
              <li class="flex items-start gap-2">
                <PhotoIcon class="w-4 h-4 mt-0.5 shrink-0" />
                <span
                  ><strong>Launch NFT collections</strong> — Create and manage NFT classes under
                  your name</span
                >
              </li>
              <li class="flex items-start gap-2">
                <ArrowsRightLeftIcon class="w-4 h-4 mt-0.5 shrink-0" />
                <span
                  ><strong>Tradeable asset</strong> — Names are NFTs that can be bought and
                  sold</span
                >
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <!-- Step 1: Name input -->
      <div class="space-y-2">
        <Label for="name-input">Choose your name</Label>
        <div class="flex gap-2">
          <Input
            id="name-input"
            v-model="nameInput"
            placeholder="alice"
            :disabled="isBusy"
            class="flex-1"
            @keyup.enter="register"
          />
          <span class="flex items-center text-muted-foreground font-mono">.dys</span>
        </div>
        <p v-if="nameError" class="text-sm text-destructive">{{ nameError }}</p>
        <p v-else-if="isChecking" class="text-sm text-muted-foreground">Checking availability...</p>
        <p v-else-if="nameInput && isValidName && isAvailable" class="text-sm text-emerald-600">
          ✓ {{ fullName }} is available
        </p>
        <p v-else-if="nameInput && isValidName && !isAvailable" class="text-sm text-destructive">
          ✗ {{ fullName }} is already taken
        </p>
      </div>

      <!-- Step 2: Valuation with explanation -->
      <div v-if="showExtendedForm" class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>Set your valuation</Label>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              @click="showValuationHelp = !showValuationHelp"
            >
              <InformationCircleIcon class="w-4 h-4" />
              How does this work?
            </button>
          </div>

          <!-- Valuation help text -->
          <Alert v-if="showValuationHelp" class="text-sm">
            <AlertDescription>
              <p class="mb-2">
                <strong>Harberger Fee:</strong> You set what your name is worth. This creates a fair
                market:
              </p>
              <ul class="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>You pay {{ feePercentDisplay }}% annually</strong> based on your valuation
                </li>
                <li>
                  <strong>Anyone can bid</strong> on your name starting at your valuation price
                </li>
                <li><strong>You can refuse</strong> any bid by raising your valuation</li>
                <li><strong>Higher value</strong> = more protection, but costs more</li>
                <li><strong>Lower value</strong> = cheaper, but easier for others to buy</li>
              </ul>
            </AlertDescription>
          </Alert>

          <!-- Valuation slider -->
          <div class="space-y-3">
            <Slider v-model="valuationSlider" :min="0" :max="100" :step="1" :disabled="isBusy" />
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>Cheap & Easy to buy</span>
              <span>Expensive & Protected</span>
            </div>

            <!-- Valuation amount input -->
            <div class="flex items-center gap-2">
              <Input
                v-model="valuationDisplay"
                type="text"
                inputmode="decimal"
                placeholder="100"
                class="w-32 text-right"
                :disabled="isBusy"
              />
              <span class="text-muted-foreground">{{ displayDenom }}</span>
            </div>
          </div>
        </div>

        <!-- Cost summary -->
        <div class="rounded-lg bg-muted/50 p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span>Valuation</span>
            <span class="font-mono">{{ valuationDisplay || '0' }} {{ displayDenom }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Annual fee ({{ feePercentDisplay }}%)</span>
            <span class="font-mono">{{ annualFeeDisplay }} {{ displayDenom }}</span>
          </div>
          <div class="border-t pt-2 flex justify-between font-medium">
            <span>You pay now</span>
            <span class="font-mono">{{ annualFeeDisplay }} {{ displayDenom }}</span>
          </div>
          <p class="text-xs text-muted-foreground">
            Fee goes to the community pool. Renew annually to keep your name.
          </p>
        </div>
      </div>

      <!-- Wallet connection -->
      <div v-if="showExtendedForm && hasValuation">
        <div v-if="!isConnected" class="space-y-2">
          <Label>Connect wallet to register</Label>
          <WalletSelector v-model="selectedWallet" :show-locked="true" button-class="w-full" />
        </div>
        <div v-else class="text-sm text-muted-foreground">
          Registering as: <code class="font-mono">{{ selectedWallet }}</code>
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex-col gap-3">
      <Button class="w-full" size="lg" :disabled="!canRegister || isBusy" @click="register">
        <Spinner v-if="isBusy" class="w-4 h-4 mr-2" />
        {{ isBusy ? 'Registering...' : `Register ${fullName || 'name'}` }}
      </Button>

      <p v-if="error" class="text-sm text-destructive text-center">{{ error }}</p>

      <p v-if="success" class="text-sm text-emerald-600 text-center">
        ✓ Successfully registered {{ fullName }}!
        <router-link :to="`/names/${fullName}`" class="underline ml-1">
          View your name →
        </router-link>
      </p>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'
import NameserviceRegistration from '@/orm/models/nameservice/Registration'
import NftItem from '@/orm/models/nft/NftItem'
import NftClass from '@/orm/models/nft/NftClass'
import WalletSelector from '@/components/shared/WalletSelector.vue'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Spinner } from '@/components/ui/spinner'

import {
  SparklesIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ArrowsRightLeftIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{ initialName?: string }>()
const emit = defineEmits(['registered'])

const wallet = useWallet()
const {
  isAnyWalletConnected,
  normalizeFromDisplay,
  sendMsg,
  loadDenomMetadata,
  getDisplayOptions,
} = wallet

// State
const nameInput = ref('')
const valuationDisplay = ref('100')
const valuationSlider = ref([50])
const selectedWallet = ref('')
const isBusy = ref(false)
const isChecking = ref(false)
const isAvailable = ref(false)
const error = ref('')
const success = ref(false)
const showValuationHelp = ref(false)

// Denom config
const displayDenom = ref('dys2')
const baseDenom = ref('udys')
const exponent = ref(6)
const feePercent = ref(0.01) // 1% default

// Computed
const fullName = computed(() => {
  const n = nameInput.value.trim().toLowerCase()
  return n ? `${n}.dys` : ''
})

const isValidName = computed(() => {
  const n = nameInput.value.trim().toLowerCase()
  if (!n) return false
  // Must start with letter, contain only lowercase alphanumeric and dashes, not contain 'dys'
  if (!/^[a-z][a-z0-9-]*[a-z0-9]?$/.test(n)) return false
  if (n.includes('dys')) return false
  return true
})

const nameError = computed(() => {
  const n = nameInput.value.trim()
  if (!n) return ''
  if (!/^[a-z]/.test(n.toLowerCase())) return 'Must start with a letter'
  if (!/^[a-z0-9-]+$/i.test(n)) return 'Only letters, numbers, and dashes allowed'
  if (n.toLowerCase().includes('dys')) return 'Cannot contain "dys"'
  if (n.length < 1) return 'Name too short'
  return ''
})

const valuationBase = computed(() => {
  const amt = valuationDisplay.value.trim()
  if (!amt || !/^\d+(\.\d+)?$/.test(amt)) return '0'
  try {
    const result = normalizeFromDisplay({ amount: amt, displayDenom: displayDenom.value })
    return result?.base?.amount || '0'
  } catch {
    return '0'
  }
})

const hasValuation = computed(() => {
  const v = BigInt(valuationBase.value || '0')
  return v > 0n
})

const annualFeeBase = computed(() => {
  const val = BigInt(valuationBase.value || '0')
  // fee = valuation * feePercent
  const feeNum = Math.floor(feePercent.value * 1000000)
  return ((val * BigInt(feeNum)) / 1000000n).toString()
})

const annualFeeDisplay = computed(() => {
  const s = annualFeeBase.value
  const exp = exponent.value
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`.replace(/\.?0+$/, '') || '0'
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.?0+$/, '')
})

const feePercentDisplay = computed(() => (feePercent.value * 100).toFixed(0))

const isConnected = computed(() => isAnyWalletConnected.value && selectedWallet.value)

const canRegister = computed(() => {
  return (
    isValidName.value &&
    isAvailable.value &&
    hasValuation.value &&
    isConnected.value &&
    !isBusy.value
  )
})

// Show extended form as long as there's valid input (even while checking)
const showExtendedForm = computed(() => {
  return isValidName.value && (isAvailable.value || isChecking.value)
})

// Sync slider to valuation (logarithmic scale for better UX)
watch(valuationSlider, ([val]) => {
  // Map 0-100 slider to 1-100000 range logarithmically
  const minVal = 1
  const maxVal = 100000
  const logMin = Math.log(minVal)
  const logMax = Math.log(maxVal)
  const scale = (logMax - logMin) / 100
  const value = Math.round(Math.exp(logMin + scale * val))
  valuationDisplay.value = value.toString()
})

// Check name availability (debounced to avoid flicker)
const checkAvailability = useDebounceFn(async (name: string) => {
  if (!name || !isValidName.value) {
    isChecking.value = false
    isAvailable.value = false
    return
  }

  isChecking.value = true
  try {
    const nftApi = useAxiosRepo(NftItem).api()
    await nftApi.fetchNft('nameservice.dys', name)
    const nftRepo = useRepo(NftItem)
    const exists = !!nftRepo.query().where('class_id', 'nameservice.dys').where('id', name).first()
    isAvailable.value = !exists
  } catch {
    // If fetch fails, assume available
    isAvailable.value = true
  } finally {
    isChecking.value = false
  }
}, 400)

watch(fullName, (name) => {
  if (!name || !isValidName.value) {
    isAvailable.value = false
    isChecking.value = false
    return
  }
  // Set checking immediately so form stays visible
  isChecking.value = true
  checkAvailability(name)
})

// Initialize from props
watch(
  () => props.initialName,
  (v) => {
    if (v) {
      const raw = v.trim().toLowerCase()
      nameInput.value = raw.endsWith('.dys') ? raw.slice(0, -4) : raw
    }
  },
  { immediate: true }
)

// Load class params for fee percentage
async function loadClassParams() {
  try {
    await useAxiosRepo(NftClass).api().fetchClass('nameservice.dys')
    const cls = useRepo(NftClass).find('nameservice.dys') as any
    if (cls?.data?.valuation_fee_pct) {
      feePercent.value = parseFloat(cls.data.valuation_fee_pct) || 0.01
    }
    if (cls?.data?.allowed_denoms?.length) {
      baseDenom.value = cls.data.allowed_denoms[0]
    }
    await loadDenomMetadata()
    const opts = getDisplayOptions({ allowedBases: [baseDenom.value] })
    if (opts.length) {
      displayDenom.value = opts[0].display
      exponent.value = opts[0].exponent
    }
  } catch (e) {
    console.warn('Failed to load class params:', e)
  }
}

// Register the name
async function register() {
  if (!canRegister.value) return

  isBusy.value = true
  error.value = ''
  success.value = false

  try {
    const api = useAxiosRepo(NameserviceRegistration).api()
    await api.registerName({
      committer: selectedWallet.value,
      name: fullName.value,
      valuation: {
        denom: baseDenom.value,
        amount: valuationBase.value,
      },
      wallet: { sendMsg: (args: any) => sendMsg(args) },
      gasLimit: 'auto',
    })

    success.value = true
    emit('registered', { name: fullName.value })
  } catch (e: any) {
    error.value = e?.message || 'Registration failed'
  } finally {
    isBusy.value = false
  }
}

// Initialize
loadClassParams()
</script>
