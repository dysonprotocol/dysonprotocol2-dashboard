<template>
  <Card>
    <CardHeader>
      <CardTitle>Make Offer</CardTitle>
      <CardDescription>Create a new orderbook offer</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <WalletSelector
        v-model="maker"
        :button-class="'w-full justify-between'"
        :msg-type-filter="msgFilter"
      />

      <div>
        <Label>Have</Label>
        <AmountDenomSelector :base-denoms="baseDenoms" v-model:base="have" />
      </div>
      <div>
        <Label>Want</Label>
        <AmountDenomSelector :base-denoms="baseDenoms" v-model:base="want" />
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
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import useWhaleswapForm from '@/composables/useWhaleswapForm'
import { useWallet } from '@/composables/useWallet'

const props = defineProps({ baseDenoms: { type: Array, default: () => [] } })

const maker = ref('')
const have = ref({ amount: '', denom: '' })
const want = ref({ amount: '', denom: '' })
const baseDenoms = computed(() => props.baseDenoms)

const { isSubmitting, errorMessage, successMessage, submit, msgTypeFor } = useWhaleswapForm()
const msgFilter = (g) => {
  const t = msgTypeFor('makeOffer')
  const ok = g?.msg_type_url === t || g?.msg_type_url === '' || g?.type_url === t
  return { valid: !!ok, notes: ok ? 'Can make offers' : 'Grant does not match make offer' }
}

const isDisabled = computed(() => {
  if (isSubmitting.value) return true
  if (!maker.value) return true
  if (!have.value.denom || !have.value.amount) return true
  if (!want.value.denom || !want.value.amount) return true
  if (have.value.denom === want.value.denom) return true
  return false
})

async function onSubmit() {
  const { sendMsg } = useWallet()
  const args = {
    maker: maker.value,
    have: { denom: have.value.denom, amount: String(have.value.amount) },
    want: { denom: want.value.denom, amount: String(want.value.amount) },
    wallet: { sendMsg },
  }
  await submit(function makeOffer() {}, args)
}
</script>
