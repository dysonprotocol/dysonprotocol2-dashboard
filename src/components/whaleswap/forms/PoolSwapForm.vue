<template>
  <Card>
    <CardHeader>
      <CardTitle>Pool Swap</CardTitle>
      <CardDescription>Swap within a single AMM pool</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <WalletSelector
        v-model="trader"
        :button-class="'w-full justify-between'"
        :msg-type-filter="msgFilter"
      />

      <div class="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Pool ID</Label>
          <Input v-model="poolId" placeholder="e.g. 1" />
        </div>
        <div>
          <Label>Out Denom</Label>
          <Input v-model="outDenom" placeholder="denom" />
        </div>
      </div>

      <div>
        <Label>Input</Label>
        <AmountDenomSelector :base-denoms="baseDenoms" v-model:base="input" />
      </div>

      <div>
        <Label>Minimum Out Amount</Label>
        <Input v-model="minOut" placeholder="0 (optional)" />
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
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import useWhaleswapForm from '@/composables/useWhaleswapForm'
import { useWallet } from '@/composables/useWallet'

const props = defineProps({
  baseDenoms: { type: Array, default: () => [] },
  defaultPoolId: { type: String, default: '' },
})

const trader = ref('')
const poolId = ref(props.defaultPoolId)
const outDenom = ref('')
const input = ref({ amount: '', denom: '' })
const minOut = ref('')
const baseDenoms = computed(() => props.baseDenoms)

const { isSubmitting, errorMessage, successMessage, submit, msgTypeFor } = useWhaleswapForm()
const msgFilter = (g) => {
  const t = msgTypeFor('poolSwap')
  const ok = g?.msg_type_url === t || g?.msg_type_url === '' || g?.type_url === t
  return { valid: !!ok, notes: ok ? 'Can swap in pools' : 'Grant does not match pool swap' }
}

const isDisabled = computed(() => {
  if (isSubmitting.value) return true
  if (!trader.value) return true
  if (!poolId.value) return true
  if (!input.value.denom || !input.value.amount) return true
  if (!outDenom.value) return true
  return false
})

async function onSubmit() {
  const { sendMsg } = useWallet()
  const args = {
    trader: trader.value,
    pool_id: poolId.value,
    input: { denom: input.value.denom, amount: String(input.value.amount) },
    out_denom: outDenom.value,
    ...(minOut.value ? { minimum_out_amount: String(minOut.value) } : {}),
    wallet: { sendMsg },
  }
  await submit(function poolSwap() {}, args)
}
</script>
