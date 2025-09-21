<template>
  <Card>
    <CardHeader>
      <CardTitle>Take Offer</CardTitle>
      <CardDescription>Execute a trade against an offer in integer units</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <WalletSelector
        v-model="taker"
        :button-class="'w-full justify-between'"
        :msg-type-filter="msgFilter"
      />

      <div class="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Offer ID</Label>
          <Input v-model="offerId" placeholder="e.g. 123" />
        </div>
        <div>
          <Label>Units</Label>
          <div class="flex gap-2 items-center">
            <Button type="button" variant="outline" @click="decUnits" :disabled="unitsNum <= 1"
              >-</Button
            >
            <Input v-model="takeUnits" inputmode="numeric" placeholder="leave empty for full" />
            <Button
              type="button"
              variant="outline"
              @click="incUnits"
              :disabled="unitsNum >= maxUnitsNum"
              >+</Button
            >
            <Button type="button" variant="secondary" @click="setMax" :disabled="maxUnitsNum === 0"
              >Max</Button
            >
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            step is 1 unit; max {{ maxUnits }} remaining
          </div>
        </div>
      </div>

      <div class="rounded-md border p-3 text-sm" v-if="hasOffer">
        <div class="grid md:grid-cols-3 gap-2">
          <div>
            <div class="font-medium">Unit</div>
            <div>Have: {{ offer.unit_have_int }} {{ offer.initial_have?.denom }}</div>
            <div>Want: {{ offer.unit_want_int }} {{ offer.initial_want?.denom }}</div>
          </div>
          <div>
            <div class="font-medium">Remaining</div>
            <div>{{ maxUnits }} units</div>
          </div>
          <div>
            <div class="font-medium">Preview ({{ effectiveUnits }} units)</div>
            <div>You receive: {{ previewHave }} {{ offer.initial_have?.denom }}</div>
            <div>You pay: {{ previewWant }} {{ offer.initial_want?.denom }}</div>
          </div>
        </div>
      </div>

      <Alert v-if="errorMessage" variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription class="break-all">{{ errorMessage }}</AlertDescription>
      </Alert>
      <Alert v-if="successMessage" variant="default">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>{{ successMessage }}</AlertDescription>
      </Alert>
    </CardContent>
    <CardFooter>
      <Button class="w-full" :disabled="isDisabled" @click="onSubmit">
        <span v-if="isSubmitting">Submitting…</span>
        <span v-else>Submit</span>
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import useWhaleswapForm from '@/composables/useWhaleswapForm'
import { useWallet } from '@/composables/useWallet'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'

const props = defineProps({
  defaultOfferId: { type: String, default: '' },
  offerIdProp: { type: String, default: '' },
})

const taker = ref('')
const offerId = ref(props.offerIdProp || props.defaultOfferId)
const takeUnits = ref('')

const offerRepo = useRepo(WhaleswapOffer)
const offerApi = useAxiosRepo(WhaleswapOffer).api()
const offer = computed(() => (offerId.value ? offerRepo.find(String(offerId.value)) || null : null))
const hasOffer = computed(() => !!offer.value && !!offer.value.offer_id)
const maxUnits = computed(() => String(offer.value?.remaining_units || '0'))
const maxUnitsNum = computed(() => {
  try {
    return Number(BigInt(maxUnits.value))
  } catch {
    return 0
  }
})
const unitHave = computed(() => String(offer.value?.unit_have_int || '0'))
const unitWant = computed(() => String(offer.value?.unit_want_int || '0'))
const unitsNum = computed(() => {
  const raw = String(takeUnits.value || '')
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})
const effectiveUnits = computed(() =>
  unitsNum.value > 0 ? Math.min(unitsNum.value, maxUnitsNum.value) : maxUnitsNum.value
)
const previewHave = computed(() => {
  try {
    return String(BigInt(unitHave.value) * BigInt(effectiveUnits.value))
  } catch {
    return '0'
  }
})
const previewWant = computed(() => {
  try {
    return String(BigInt(unitWant.value) * BigInt(effectiveUnits.value))
  } catch {
    return '0'
  }
})

watch(
  () => offerId.value,
  async (id) => {
    if (id) await offerApi.fetchOffer(String(id))
  },
  { immediate: true }
)

const { isSubmitting, errorMessage, successMessage, submit, msgTypeFor } = useWhaleswapForm()
const msgFilter = (g) => {
  const t = msgTypeFor('takeOffer')
  const ok = g?.msg_type_url === t || g?.msg_type_url === '' || g?.type_url === t
  return { valid: !!ok, notes: ok ? 'Can take offers' : 'Grant does not match take offer' }
}

const isDisabled = computed(() => {
  if (isSubmitting.value) return true
  if (!taker.value) return true
  if (!offerId.value) return true
  // if specified, ensure integer within range
  if (takeUnits.value) {
    const n = unitsNum.value
    if (n <= 0) return true
    if (n > maxUnitsNum.value) return true
  }
  return false
})

function incUnits() {
  if (unitsNum.value < maxUnitsNum.value) takeUnits.value = String(unitsNum.value + 1)
}
function decUnits() {
  if (unitsNum.value > 1) takeUnits.value = String(unitsNum.value - 1)
}
function setMax() {
  if (maxUnitsNum.value > 0) takeUnits.value = String(maxUnitsNum.value)
}

async function onSubmit() {
  const { sendMsg } = useWallet()
  const args = {
    taker: taker.value,
    trades: [
      {
        offer_id: offerId.value,
        ...(takeUnits.value ? { take_units: String(effectiveUnits.value) } : {}),
      },
    ],
    wallet: { sendMsg },
  }
  await submit(function takeOffer() {}, args)
}
</script>
