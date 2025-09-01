<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Register Name</h2>

    <!-- Step 1: Select name -->
    <div class="card card-border" :class="cardClass(1)">
      <div class="card-body space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="card-title">1. Select a name</h2>
          <span
            v-if="step > 1 && isValidName && nameAvailable"
            class="badge badge-success badge-outline"
            >Valid</span
          >
        </div>
        <p class="">
          Enter your name; .dys is appended automatically. Use lowercase letters and dashes.
        </p>
        <div :class="enabledClass(1)" class="space-y-2">
          <Input
            v-model="nameMain"
            type="text"
            class="w-full"
            placeholder="alice"
            aria-describedby="name-suffix"
            data-testid="reg-name-input"
          />

          <div class="">
            <span v-if="nameMain && !isValidName" class="text-destructive">{{
              nameValidationMessage
            }}</span>
            <span v-else-if="isChecking" class="opacity-70">Checking availability…</span>
            <span v-else-if="nameMain && isValidName && nameAvailable" class="text-emerald-600"
              >The name {{ chosenName() }} is available</span
            >
            <span v-else-if="nameMain && isValidName && !nameAvailable" class="text-destructive"
              >The name {{ chosenName() }} is already registered</span
            >
          </div>
        </div>
      </div>
    </div>

    <div
      :class="collapseWrapperClass"
      class="transition-all duration-300 ease-in-out overflow-hidden space-y-4"
    >
      <!-- Step 2: Estimate value -->
      <div class="card card-border" :class="cardClass(2)">
        <div class="card-body space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title">2. Estimate a value</h2>
            <span v-if="step > 2 && canProceedValue" class="badge badge-success badge-outline"
              >Ready</span
            >
          </div>
          <p class="">Set the valuation and denom. Annual fee is charged at reveal.</p>
          <div :class="enabledClass(2)" class="space-y-2">
            <Input
              v-model="valuationDisplay"
              type="text"
              inputmode="numeric"
              class=""
              placeholder="amount"
              data-testid="reg-valuation-input"
            />
            <Select v-model="displayDenom">
              <SelectTrigger class="" data-testid="reg-denom-select">
                <SelectValue placeholder="Denom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in allowedDisplayOptions"
                  :key="opt.base"
                  :value="opt.display"
                >
                  {{ opt.display }}
                </SelectItem>
              </SelectContent>
            </Select>

            <div
              v-if="hasNumericValuation && denomAllowed && annualFeeBase !== '0'"
              class="opacity-80"
            >
              Annual fee:
              <span class="font-bold">{{ annualFeeDisplay }} {{ currentDisplayOpt?.display }}</span>
            </div>
            <div v-if="validationMessage" class="text-error text-xs">
              {{ validationMessage }}
            </div>
            <div v-if="canProceedValue" class="text-success">
              Your name is valued at
              <span class="font-bold">{{ valuationDisplay }} {{ currentDisplayOpt?.display }}</span>
              and you will pay
              <span class="font-bold">{{ annualFeeDisplay }} {{ currentDisplayOpt?.display }}</span>
              at reveal.
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Select wallet -->
      <div class="card card-border" :class="cardClass(3)">
        <div class="card-body space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title">3. Select a wallet</h2>
            <span v-if="step > 3 && isAnyWalletConnected" class="badge badge-success badge-outline"
              >Connected</span
            >
          </div>
          <p class="">Choose a wallet to sign commit and reveal.</p>
          <div :class="enabledClass(3)" class="space-y-2">
            <WalletSelector
              v-model="selectedExecutor"
              :show-locked="true"
              button-class="btn btn-outline"
            />
            <div v-if="selectedExecutor" class="text-xs opacity-70">
              Selected: {{ selectedExecutor }}
            </div>
            <div v-else class="text-destructive">No wallet selected.</div>
          </div>
        </div>
      </div>

      <!-- Step 4: Submit commitment -->
      <div class="card card-border" :class="cardClass(4)">
        <div class="card-body space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title">4. Submit commitment</h2>
            <span v-if="commitTxHash" class="badge badge-success badge-outline">Submitted</span>
          </div>
          <p class="">
            Submit a commitment to prevent frontrunning. A random salt will be used automatically.
          </p>
          <div :class="enabledClass(4)" class="space-y-2">
            <div class="overflow-x-auto">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell class="font-semibold">Name</TableCell>
                    <TableCell class="font-mono">
                      {{ chosenName() || '—' }}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="font-semibold">Salt</TableCell>
                    <TableCell class="font-mono">
                      {{ salt || '—' }}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="font-semibold">Valuation</TableCell>
                    <TableCell
                      >{{ valuationDisplay || '0' }} {{ currentDisplayOpt?.display }}</TableCell
                    >
                  </TableRow>
                  <TableRow>
                    <TableCell class="font-semibold">Annual fee</TableCell>
                    <TableCell>{{ annualFeeDisplay }} {{ currentDisplayOpt?.display }}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="font-semibold">Commit hash</TableCell>
                    <TableCell class="font-mono">
                      {{ hexHash || '—' }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div class="card-actions justify-end">
              <button
                class="btn btn-primary"
                :disabled="isBusy || !!commitTxHash"
                data-testid="reg-commit-button"
                @click="commit"
              >
                Sign commit tx…
              </button>
            </div>
            <div v-if="error && !commitTxHash" class="text-destructive text-xs">
              {{ error }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Reveal -->
      <div class="card card-border" :class="cardClass(5)">
        <div class="card-body space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title">5. Reveal</h2>
            <span v-if="revealTxHash" class="badge badge-success badge-outline">Submitted</span>
          </div>
          <p class="">
            Reveal the original data. The annual fee of
            <span class="font-medium">{{ annualFeeDisplay }}</span>
            {{ currentDisplayOpt?.display }} will be charged.
          </p>
          <div :class="enabledClass(5)" class="space-y-2">
            <div class="card-actions justify-end">
              <button
                class="btn btn-primary"
                :disabled="isBusy || !canReveal"
                data-testid="reg-reveal-button"
                @click="reveal"
              >
                Sign reveal tx and pay annual fee
              </button>
            </div>
            <div v-if="error && !revealTxHash" class="text-destructive text-xs">
              {{ error }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6: Done -->
      <div class="card card-border" :class="cardClass(6)">
        <div class="card-body space-y-2">
          <h2 class="card-title">6. Congratulations!</h2>
          <p class="">Your name is now registered. You can visit its page to manage it.</p>
          <div class="card-actions justify-end">
            <router-link
              v-if="step >= 6 && chosenName()"
              :to="`/names/${chosenName()}`"
              class="link"
            >
              <button class="btn btn-primary">Go to {{ chosenName() }}</button>
            </router-link>
            <button v-else class="btn" disabled>Waiting for reveal…</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="globalError" class="text-destructive">
      {{ globalError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NameserviceRegistration from '@/orm/models/nameservice/Registration'
import NftItem from '@/orm/models/nft/NftItem'
import NftClass from '@/orm/models/nft/NftClass'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

const props = defineProps({ initialName: { type: String, default: '' } })
const emit = defineEmits(['registered'])

const {
  getSignerAddress,
  isAnyWalletConnected,
  normalizeFromDisplay,
  sendMsg,
  loadDenomMetadata,
  getDisplayOptions,
} = useWallet()

const repo = useAxiosRepo(NameserviceRegistration)
const nftApi = useAxiosRepo(NftItem).api()
const nftRepo = useRepo(NftItem)
const selectedExecutor = ref('')
const nameMain = ref('')
const salt = ref('')
const hexHash = ref('')
const valuationDisplay = ref('')
const error = ref('')
const globalError = ref('')
const step = ref(1)
const commitTxHash = ref('')
const revealTxHash = ref('')
const isBusy = ref(false)

watch(
  () => props.initialName,
  (v) => {
    const raw = String(v || '')
      .trim()
      .toLowerCase()
    nameMain.value = raw.endsWith('.dys') ? raw.slice(0, -4) : raw
  },
  { immediate: true }
)

function chosenName() {
  const raw = String(nameMain.value || '')
    .trim()
    .toLowerCase()
  return raw ? `${raw}.dys` : ''
}

const isValidName = computed(() => /^[a-z]([-a-z0-9]*[a-z0-9])?\.dys$/.test(chosenName()))
const nameValidationMessage = computed(() => {
  const full = String(chosenName() || '').trim()
  if (!full) return ''
  if (!full.endsWith('.dys')) return 'Name must end with .dys'
  if (!/^[a-z]/.test(full)) return 'Must start with a letter'
  if (!/^[a-z0-9.-]+$/.test(full.replace('.dys', '')))
    return 'Lowercase letters, digits, and dashes only'
  if (!/^[a-z]([-a-z0-9]*[a-z0-9])?\.dys$/.test(full))
    return 'Invalid format: lowercase, start with a letter, may contain dashes'
  const main = full.slice(0, -4)
  if (main.includes('dys')) return "Name cannot contain 'dys'"
  return ''
})
const hasNumericValuation = computed(() =>
  /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(valuationDisplay.value || '').trim())
)
const requiredBase = computed(() => {
  if (!hasNumericValuation.value) return null
  try {
    let amt = String(valuationDisplay.value || '0').trim()
    if (amt.startsWith('.')) amt = `0${amt}`
    return normalizeFromDisplay({ amount: amt, displayDenom: displayDenom.value })
  } catch {
    return null
  }
})
const requiredBaseAmount = computed(() => requiredBase.value?.base?.amount || null)
const requiredBaseDenom = computed(() => requiredBase.value?.base?.denom || 'udys')

const canCommit = computed(() => isValidName.value && hasNumericValuation.value)
const canReveal = computed(() => Boolean(hexHash.value) && Boolean(salt.value) && isValidName.value)

function generateSalt() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function computeHash() {
  const committer = selectedExecutor.value || getSignerAddress()
  const s = salt.value || generateSalt()
  salt.value = s
  hexHash.value = await repo.api().computeHash({ name: chosenName(), salt: s, committer })
}

async function commit() {
  if (!canCommit.value) return
  isBusy.value = true
  error.value = ''
  try {
    if (!salt.value || !hexHash.value) await computeHash()
    const committer = selectedExecutor.value || getSignerAddress()
    const wallet = {
      sendMsg: ({ msg, gasLimit, memo, executorAddress }) =>
        sendMsg({ msg, gasLimit, memo, executorAddress }),
    }
    const res = await repo.api().commit({
      committer,
      hexhash: hexHash.value,
      valuation: {
        denom: String(requiredBaseDenom.value || 'udys'),
        amount: String(requiredBaseAmount.value || '0'),
      },
      wallet,
      gasLimit: 'auto',
    })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    commitTxHash.value = res?.rawSendMsgsResponse?.raw?.tx_response?.txhash || res?.txhash || ''
    step.value = Math.max(step.value, 5)
  } catch (e) {
    error.value = e?.message || 'Commit failed'
  } finally {
    isBusy.value = false
  }
}

async function reveal() {
  if (!canReveal.value) return
  isBusy.value = true
  error.value = ''
  try {
    const committer = selectedExecutor.value || getSignerAddress()
    const wallet = {
      sendMsg: ({ msg, gasLimit, memo, executorAddress }) =>
        sendMsg({ msg, gasLimit, memo, executorAddress }),
    }
    const res = await repo.api().reveal({
      committer,
      name: chosenName(),
      salt: String(salt.value || ''),
      wallet,
      gasLimit: 'auto',
    })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    revealTxHash.value = res?.rawSendMsgsResponse?.raw?.tx_response?.txhash || res?.txhash || ''
    step.value = 6
    emit('registered', { name: chosenName() })
  } catch (e) {
    error.value = e?.message || 'Reveal failed'
  } finally {
    isBusy.value = false
  }
}

// Name availability via ORM
const isChecking = ref(false)
const nameAvailable = ref(false)
watch(
  () => chosenName(),
  async (n) => {
    nameAvailable.value = false
    if (!/\.dys$/.test(String(n || '')) || !isValidName.value) return
    isChecking.value = true
    try {
      await nftApi.fetchNft('nameservice.dys', n)
      const exists = !!nftRepo.query().where('class_id', 'nameservice.dys').where('id', n).first()
      nameAvailable.value = !exists
    } catch {
      nameAvailable.value = true
    } finally {
      isChecking.value = false
    }
  },
  { immediate: true }
)

// Nameservice class params (allowed denoms, fee pct) via ORM
const nftClassApi = useAxiosRepo(NftClass).api()
const nftClassRepo = useRepo(NftClass)
const allowedDenoms = ref([])
const allowedDisplayOptions = ref([])
const selectedDisplayDenom = ref('')
const displayDenom = computed({
  get: () => selectedDisplayDenom.value || allowedDisplayOptions.value[0]?.display || 'dys2',
  set: (v) => (selectedDisplayDenom.value = v),
})
const effectiveDisplayDenom = computed(() => displayDenom.value || 'dys2')
const currentDisplayOpt = computed(() =>
  allowedDisplayOptions.value.find((o) => o.display === effectiveDisplayDenom.value)
)
const denomAllowed = computed(() => {
  const bases = allowedDenoms.value || []
  if (!bases.length) return true
  const match = allowedDisplayOptions.value.find((o) => o.display === effectiveDisplayDenom.value)
  const base = match?.base
  return !!base && bases.includes(base)
})

const annualPctStr = ref('0')
function parseDecimalToRatio(s) {
  const str = String(s || '0').trim()
  if (!str.includes('.')) return { num: BigInt(str), den: 1n }
  const [a, b] = str.split('.')
  const scale = BigInt(b.length)
  const num = BigInt(a + b)
  const den = 10n ** scale
  return { num, den }
}
const annualPctRatio = computed(() => parseDecimalToRatio(annualPctStr.value))
const annualFeeBase = computed(() => {
  try {
    if (!requiredBaseAmount.value) return '0'
    const { num, den } = annualPctRatio.value
    return ((BigInt(requiredBaseAmount.value) * num) / den).toString()
  } catch {
    return '0'
  }
})
const annualFeeDisplay = computed(() => {
  const exp = Number(currentDisplayOpt.value?.exponent || 0)
  const s = String(annualFeeBase.value || '0')
  if (exp <= 0) return s
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`.replace(/\.0+$/, '')
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
})
const validationMessage = computed(() => {
  if (!denomAllowed.value) {
    const allowedDisplays = (allowedDisplayOptions.value || []).map((o) => o.display)
    return `Denom not allowed. Allowed: ${allowedDisplays.join(', ') || '—'}`
  }
  // if pct > 0, require base >= 1 unit
  if (hasNumericValuation.value) {
    const { num } = annualPctRatio.value
    if (num > 0n) {
      try {
        const amt = requiredBaseAmount.value ? BigInt(requiredBaseAmount.value) : 0n
        if (amt < 1n) return `Minimum valuation is 1 base unit when a fee is applied.`
      } catch (e) {
        console.error(e)
      }
    }
  }
  return ''
})
const canProceedValue = computed(
  () => hasNumericValuation.value && denomAllowed.value && !validationMessage.value
)
async function loadNameserviceParams() {
  try {
    await nftClassApi.fetchClass('nameservice.dys')
    const cls = nftClassRepo.find('nameservice.dys')
    const list = Array.isArray(cls?.data?.allowed_denoms) ? cls.data.allowed_denoms : []
    allowedDenoms.value = Array.isArray(list) && list.length ? list.map((d) => String(d)) : ['udys']
  } catch {
    allowedDenoms.value = ['udys']
  }
  try {
    await loadDenomMetadata()
    allowedDisplayOptions.value = getDisplayOptions({ allowedBases: allowedDenoms.value })
    if (!selectedDisplayDenom.value && allowedDisplayOptions.value.length)
      selectedDisplayDenom.value = allowedDisplayOptions.value[0].display
  } catch (e) {
    globalError.value = e?.message || 'Failed to load denom metadata'
  }
  try {
    const cls = nftClassRepo.find('nameservice.dys')
    annualPctStr.value = String(cls?.data?.valuation_fee_pct || '0')
  } catch {
    annualPctStr.value = '0'
  }
}

// Step helpers and gating
function cardClass(n) {
  const base = 'border '
  if (step.value === n) return base + 'border-info'
  if (step.value > n) return base + 'border-success'
  return base + 'border-base-300'
}
function enabledClass(n) {
  if (n <= 4) return commitTxHash.value && n < 5 ? 'opacity-60 pointer-events-none' : ''
  if (step.value === n) return ''
  if (step.value > n) return 'opacity-60 pointer-events-none'
  return ''
}

// Collapse steps 2–6 until any input is entered in step 1
const hasName = computed(() => !!String(nameMain.value || '').trim())
const collapseWrapperClass = computed(() =>
  hasName.value ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
)

// Auto-progress through steps based on validations
watch([nameMain, () => nameAvailable.value, isValidName], () => {
  if (isValidName.value && nameAvailable.value) step.value = Math.max(step.value, 2)
})
watch(
  [() => hasNumericValuation.value, () => denomAllowed.value, () => validationMessage.value],
  () => {
    if (canProceedValue.value) step.value = Math.max(step.value, 3)
  }
)
watch(isAnyWalletConnected, (v) => {
  if (v) step.value = Math.max(step.value, 4)
})

// Also advance to step 4 once a specific executor is selected
watch(selectedExecutor, (v) => {
  if (v) step.value = Math.max(step.value, 4)
})

// init
loadNameserviceParams()
</script>
