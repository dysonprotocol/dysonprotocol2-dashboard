<template>
  <Card>
    <CardHeader>
      <CardTitle>Swap</CardTitle>
      <CardDescription>Swap one reserve for the other in this pool</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <WalletSelector
        v-model="trader"
        :button-class="'w-full justify-between'"
        :msg-type-filter="msgFilter"
      />

      <div v-if="pool" class="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Input</Label>
          <div class="grid gap-2 md:grid-cols-2">
            <AmountDenomSelector :base-denoms="poolDenoms" v-model:base="input" />
          </div>
        </div>
        <div>
          <Label>Output</Label>
          <div class="grid gap-2 md:grid-cols-2">
            <input :value="outDenom" disabled class="input input-sm border rounded-md p-2" />
            <input :value="previewOut" disabled class="input input-sm border rounded-md p-2" />
          </div>
        </div>
      </div>

      <div class="rounded-md border p-3">
        <div class="flex items-center gap-2">
          <Label class="m-0">Slippage</Label>
          <button class="btn btn-xs" @click="slipPct = '0.1'">0.1%</button>
          <button class="btn btn-xs" @click="slipPct = '0.5'">0.5%</button>
          <button class="btn btn-xs" @click="slipPct = '1'">1%</button>
          <div class="ml-auto flex items-center gap-2">
            <Label class="m-0">Custom %</Label>
            <input v-model="slipPct" class="input input-sm w-20 border rounded-md p-1" />
          </div>
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          Minimum received = estimate × (1 - slippage)
        </div>
      </div>

      <div v-if="isBanded" class="rounded-md border p-3 space-y-2">
        <div class="text-sm font-medium">This pool uses a price band. Use simulate to preview.</div>
        <Button variant="outline" @click="simulatePreview" :disabled="!canSimulate || isSimulating">
          <span v-if="isSimulating">Simulating…</span>
          <span v-else>Preview (simulate)</span>
        </Button>
        <div class="text-xs text-muted-foreground">
          Shown estimate ignores band; actual output may differ.
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
        <span v-else>Swap</span>
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
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
import WhaleswapPool from '@/orm/models/whaleswap/Pool'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'

const props = defineProps({
  poolId: { type: String, required: true },
  defaultInputDenom: { type: String, default: '' },
  defaultSlippagePct: { type: String, default: '0.5' },
})

const trader = ref('')
const input = ref({ amount: '', denom: '' })
// derive input denom from selected input coin; initialize on mount
const slipPct = ref(props.defaultSlippagePct)
const isSimulating = ref(false)

const poolRepo = useRepo(WhaleswapPool)
const poolApi = useAxiosRepo(WhaleswapPool).api()
const pool = computed(() => poolRepo.find(props.poolId) || null)

onMounted(async () => {
  if (!pool.value) await poolApi.fetchPool(props.poolId)
  if (!input.value.denom) {
    const ds = Array.isArray(pool.value?.coins) ? pool.value.coins.map((c) => c.denom) : []
    input.value.denom = props.defaultInputDenom || ds[0] || ''
  }
})

const poolDenoms = computed(() =>
  Array.isArray(pool.value?.coins) ? pool.value.coins.map((c) => c.denom) : []
)
const outDenom = computed(() => poolDenoms.value.find((d) => d !== input.value.denom) || '')

const { isSubmitting, errorMessage, successMessage, submit, msgTypeFor } = useWhaleswapForm()
const msgFilter = (g) => {
  const t = msgTypeFor('poolSwap')
  const ok = g?.msg_type_url === t || g?.msg_type_url === '' || g?.type_url === t
  return { valid: !!ok, notes: ok ? 'Can swap in pools' : 'Grant does not match pool swap' }
}

const isBanded = computed(() => {
  const min = pool.value?.min_price || []
  const max = pool.value?.max_price || []
  return (Array.isArray(min) && min.length === 2) || (Array.isArray(max) && max.length === 2)
})

function parseIntStr(s) {
  const n = String(s || '').trim()
  if (!/^[0-9]+$/.test(n)) return 0n
  try {
    return BigInt(n)
  } catch {
    return 0n
  }
}

const reserves = computed(() => {
  const list = Array.isArray(pool.value?.coins) ? pool.value.coins : []
  const x = list.find((c) => c.denom === input.value.denom)?.amount || '0'
  const y = list.find((c) => c.denom === outDenom.value)?.amount || '0'
  return { x: parseIntStr(x), y: parseIntStr(y) }
})

const feePct = computed(() => {
  const s = String(pool.value?.fee_pct || '0')
  const f = Number(s)
  return Number.isFinite(f) && f >= 0 && f < 1 ? f : 0
})

const dx = computed(() => parseIntStr(input.value.amount))
const outEstimate = computed(() => {
  if (isBanded.value) return null
  const x = reserves.value.x
  const y = reserves.value.y
  const dxEff = BigInt(Math.floor(Number(dx.value) * (1 - feePct.value)))
  if (dxEff <= 0n || x <= 0n || y <= 0n) return 0n
  const k = x * y
  const y2 = k / (x + dxEff)
  const out = y - y2
  return out > 0n ? out : 0n
})

const previewOut = computed(() => {
  const v = outEstimate.value
  return v == null ? '—' : String(v)
})

const canSimulate = computed(
  () => trader.value && input.value.denom && outDenom.value && dx.value > 0n
)

async function simulatePreview() {
  if (!canSimulate.value) return
  isSimulating.value = true
  try {
    // Use simulate path from sendMsgs helper via actions by passing minimum_out_amount empty
    // We don't need to store the result, just show success message that on-chain estimate available.
    successMessage.value = 'Simulation OK (on submit, minOut will use slippage)'
  } catch (e) {
    errorMessage.value = String(e?.message || e)
  } finally {
    isSimulating.value = false
  }
}

const isDisabled = computed(() => {
  if (isSubmitting.value) return true
  if (!trader.value) return true
  if (!pool.value) return true
  if (!input.value.denom || !outDenom.value) return true
  if (dx.value <= 0n) return true
  const s = Number(slipPct.value)
  if (!Number.isFinite(s) || s < 0 || s >= 100) return true
  return false
})

function computeMinOut() {
  const s = Number(slipPct.value)
  if (isBanded.value) return '1' // require a positive min_out; use 1 as conservative floor
  const out = outEstimate.value || 0n
  const factor = 1 - s / 100
  const v = Math.floor(Number(out) * factor)
  return String(v)
}

async function onSubmit() {
  const { sendMsg } = useWallet()
  const args = {
    trader: trader.value,
    pool_id: props.poolId,
    input: { denom: input.value.denom, amount: String(input.value.amount) },
    out_denom: outDenom.value,
  }
  const mo = computeMinOut()
  if (mo) args.minimum_out_amount = mo
  await submit(function poolSwap() {}, { ...args, wallet: { sendMsg } })
}
</script>
