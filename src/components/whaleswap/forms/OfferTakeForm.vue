<template>
  <Card>
    <CardHeader>
      <CardTitle>Take Offer</CardTitle>
      <CardDescription>Execute a trade against an offer</CardDescription>
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
          <Label>Take Units (optional)</Label>
          <Input v-model="takeUnits" placeholder="leave empty for full" />
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
import { computed, ref } from 'vue'
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

const props = defineProps({ defaultOfferId: { type: String, default: '' } })

const taker = ref('')
const offerId = ref(props.defaultOfferId)
const takeUnits = ref('')

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
  return false
})

async function onSubmit() {
  const { sendMsg } = useWallet()
  const args = {
    taker: taker.value,
    trades: [
      { offer_id: offerId.value, ...(takeUnits.value ? { take_units: takeUnits.value } : {}) },
    ],
    wallet: { sendMsg },
  }
  await submit(function takeOffer() {}, args)
}
</script>
