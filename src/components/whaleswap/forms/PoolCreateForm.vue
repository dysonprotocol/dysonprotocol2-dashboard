<template>
  <Card>
    <CardHeader>
      <CardTitle>Create Pool</CardTitle>
      <CardDescription>Initialize a new AMM pool with two reserves</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <WalletSelector
        v-model="creator"
        :button-class="'w-full justify-between'"
        :msg-type-filter="msgFilter"
      />

      <div>
        <Label>Reserves</Label>
        <div class="grid gap-2 md:grid-cols-2">
          <AmountDenomSelector :base-denoms="baseDenoms" v-model:base="coinA" />
          <AmountDenomSelector :base-denoms="baseDenoms" v-model:base="coinB" />
        </div>
      </div>

      <div>
        <Label>Fee (0 to &lt;1)</Label>
        <Input v-model="feePct" placeholder="0.003" />
      </div>

      <div class="rounded-md border p-3">
        <div class="flex items-center justify-between">
          <Label class="m-0">Enable price band (optional)</Label>
          <input type="checkbox" v-model="bandEnabled" />
        </div>
        <div v-if="bandEnabled" class="mt-3 grid gap-3">
          <div>
            <Label>Min Price (coin2/coin1)</Label>
            <div class="grid gap-2 md:grid-cols-2">
              <AmountDenomSelector :base-denoms="bandDenoms" v-model:base="minPriceA" />
              <AmountDenomSelector :base-denoms="bandDenoms" v-model:base="minPriceB" />
            </div>
          </div>
          <div>
            <Label>Max Price (coin2/coin1)</Label>
            <div class="grid gap-2 md:grid-cols-2">
              <AmountDenomSelector :base-denoms="bandDenoms" v-model:base="maxPriceA" />
              <AmountDenomSelector :base-denoms="bandDenoms" v-model:base="maxPriceB" />
            </div>
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
      <div v-if="disabledReasons.length" class="text-xs text-error/80 space-y-1">
        <div class="font-medium">Cannot create because:</div>
        <ul class="list-disc list-inside space-y-0.5">
          <li v-for="r in disabledReasons" :key="r">{{ r }}</li>
        </ul>
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full" :disabled="isDisabled" @click="onSubmit">
        <span v-if="isSubmitting">Submitting…</span>
        <span v-else>Create</span>
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
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
import { useAxiosRepo } from '@pinia-orm/axios'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'

const props = defineProps({
  baseDenoms: { type: Array, default: () => [] },
  creatorDefault: { type: String, default: '' },
})

const creator = ref(props.creatorDefault)
const coinA = ref({ amount: '', denom: '' })
const coinB = ref({ amount: '', denom: '' })
const feePct = ref('')
const bandEnabled = ref(false)
const minPriceA = ref({ amount: '', denom: '' })
const minPriceB = ref({ amount: '', denom: '' })
const maxPriceA = ref({ amount: '', denom: '' })
const maxPriceB = ref({ amount: '', denom: '' })

const baseDenoms = computed(() => props.baseDenoms)
const bandDenoms = computed(() => [coinA.value.denom, coinB.value.denom].filter(Boolean))

const { isSubmitting, errorMessage, successMessage, submit, msgTypeFor } = useWhaleswapForm()
const msgFilter = (g) => {
  const t = msgTypeFor('createPool')
  const ok = g?.msg_type_url === t || g?.msg_type_url === '' || g?.type_url === t
  return { valid: !!ok, notes: ok ? 'Can create pools' : 'Grant does not match create pool' }
}

const coinsValid = computed(() => {
  if (!coinA.value.denom || !coinB.value.denom) return false
  if (coinA.value.denom === coinB.value.denom) return false
  if (!coinA.value.amount || !coinB.value.amount) return false
  return true
})

const feeValid = computed(() => {
  if (!feePct.value) return true
  const s = feePct.value.trim()
  if (!/^0(\.\d+)?$/.test(s)) return false
  return true
})

const bandValid = computed(() => {
  if (!bandEnabled.value) return true
  const hasBothMin =
    !!minPriceA.value.denom &&
    !!minPriceB.value.denom &&
    !!minPriceA.value.amount &&
    !!minPriceB.value.amount
  const hasBothMax =
    !!maxPriceA.value.denom &&
    !!maxPriceB.value.denom &&
    !!maxPriceA.value.amount &&
    !!maxPriceB.value.amount
  if (!hasBothMin && !hasBothMax) return true
  // if either set, require both coins and denoms match reserve set
  const set = new Set([coinA.value.denom, coinB.value.denom])
  const okMin = !hasBothMin || (set.has(minPriceA.value.denom) && set.has(minPriceB.value.denom))
  const okMax = !hasBothMax || (set.has(maxPriceA.value.denom) && set.has(maxPriceB.value.denom))
  return okMin && okMax
})

const disabledReasons = computed(() => {
  const reasons: string[] = []
  if (!creator.value) reasons.push('Select a wallet')

  // Reserves validation (more granular than coinsValid)
  const a = coinA.value
  const b = coinB.value
  if (!a.denom) reasons.push('First reserve denom is required')
  if (!b.denom) reasons.push('Second reserve denom is required')
  if (a.denom && b.denom && a.denom === b.denom) reasons.push('Reserves must be different denoms')
  if (!a.amount) reasons.push('First reserve amount is required')
  if (!b.amount) reasons.push('Second reserve amount is required')

  // Fee validation
  const s = typeof feePct.value === 'string' ? feePct.value.trim() : ''
  if (s && !/^0(\.\d+)?$/.test(s)) reasons.push('Fee must be a decimal in [0,1), e.g., 0.003')

  // Band validation (surface the same constraints as bandValid)
  if (bandEnabled.value) {
    const hasBothMin =
      !!minPriceA.value.denom &&
      !!minPriceB.value.denom &&
      !!minPriceA.value.amount &&
      !!minPriceB.value.amount
    const hasBothMax =
      !!maxPriceA.value.denom &&
      !!maxPriceB.value.denom &&
      !!maxPriceA.value.amount &&
      !!maxPriceB.value.amount
    if (hasBothMin || hasBothMax) {
      const set = new Set([coinA.value.denom, coinB.value.denom])
      if (hasBothMin && !(set.has(minPriceA.value.denom) && set.has(minPriceB.value.denom)))
        reasons.push('Min price denoms must match reserve denoms')
      if (hasBothMax && !(set.has(maxPriceA.value.denom) && set.has(maxPriceB.value.denom)))
        reasons.push('Max price denoms must match reserve denoms')
    }
  }

  return reasons
})

const isDisabled = computed(() => isSubmitting.value || disabledReasons.value.length > 0)

async function onSubmit() {
  const { sendMsg } = useWallet()
  const coins = [
    { denom: coinA.value.denom, amount: String(coinA.value.amount) },
    { denom: coinB.value.denom, amount: String(coinB.value.amount) },
  ]
  const msg: any = { creator: creator.value, coins }
  if (feePct.value) msg.fee_pct = feePct.value
  if (bandEnabled.value) {
    const minArr =
      minPriceA.value.denom &&
      minPriceB.value.denom &&
      minPriceA.value.amount &&
      minPriceB.value.amount
        ? [
            { denom: minPriceA.value.denom, amount: String(minPriceA.value.amount) },
            { denom: minPriceB.value.denom, amount: String(minPriceB.value.amount) },
          ]
        : []
    const maxArr =
      maxPriceA.value.denom &&
      maxPriceB.value.denom &&
      maxPriceA.value.amount &&
      maxPriceB.value.amount
        ? [
            { denom: maxPriceA.value.denom, amount: String(maxPriceA.value.amount) },
            { denom: maxPriceB.value.denom, amount: String(maxPriceB.value.amount) },
          ]
        : []
    if (minArr.length) msg.min_price = minArr
    if (maxArr.length) msg.max_price = maxArr
  }
  const args = { ...msg, wallet: { sendMsg } }
  await submit(function createPool() {}, args)
  // Refresh owner pools
  try {
    await useAxiosRepo(WhaleswapPool).api().fetchPoolsByOwner(creator.value, { limit: '50' })
  } catch (e) {
    console.error(e)
  }
}
</script>
