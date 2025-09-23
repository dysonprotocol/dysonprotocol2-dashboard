<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Auctions by {{ address }}</h2>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Open Auction</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="space-y-1">
          <Label>Sell</Label>
          <AmountDenomSelector v-model:base="sellBase" @update:display="onUpdateDisplay" />
          <div class="text-xs opacity-70" v-if="hasFetchedSpendable && !isLoadingSpendable">
            Available: <span class="font-mono">{{ currentSpendableDisplay }}</span>
          </div>
        </div>
        <div class="space-y-1">
          <Label>Bid denom</Label>
          <Input v-model.trim="oaBidDenom" placeholder="denom" />
        </div>
        <div class="space-y-2">
          <Label>Wallet</Label>
          <WalletSelector
            v-model="selectedExecutor"
            :allowed-addresses="allowedAddresses"
            :default-address="address"
            :default-grantee="selectedGranteeAddress"
            :button-class="'btn-sm w-full'"
            :msg-type-filter="msgTypeFilter"
            :show-locked="false"
            @update:executor-address="onExecutorAddress"
            @update:grantee-address="onGranteeAddress"
            @update:is-authz="onIsAuthz"
            @update:authz-notes="onAuthzNotes"
            @update:selected-grant="onSelectedGrant"
          />
        </div>
        <div v-if="disabledReasons.length > 0" class="text-xs text-error/80 space-y-1">
          <div class="font-medium">Cannot open because:</div>
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="r in disabledReasons" :key="r">{{ r }}</li>
          </ul>
        </div>
        <div>
          <Button :disabled="!canOpen || isOpening" @click="openAuction">
            {{ isOpening ? 'Submitting…' : 'Open' }}
          </Button>
        </div>
        <Alert v-if="openError" variant="destructive">
          <AlertDescription>{{ openError }}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <div v-else>
      <div v-if="auctions.length === 0" class="text-sm">No auctions.</div>
      <ul v-else class="space-y-2">
        <li v-for="a in auctions" :key="a.auction_id" class="rounded-md border p-2">
          <RouterLink
            :to="{ name: 'WhaleswapAuction', params: { auctionId: a.auction_id } }"
            class="hover:underline"
          >
            Auction #{{ a.auction_id }} — {{ a.sell?.amount }} {{ a.sell?.denom }}
          </RouterLink>
          <div class="text-xs text-muted-foreground">bid denom {{ a.bid_denom }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'
// import WhaleswapActions from '@/orm/models/whaleswap/Actions'
import { useWallet } from '@/composables/useWallet.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import { DenomMetadata } from '@/orm/models/bank/DenomMetadata'

function dbg(...args: any[]) {
  console.debug('[AddressWhaleswapAuctions]', ...args)
}

const route = useRoute()
const router = useRouter()
const address = computed(() => route.params.address as string)
const isLoading = ref(false)

const auctionApi = useAxiosRepo(WhaleswapAuction).api()
const auctionRepo = useRepo(WhaleswapAuction)
const auctions = computed(() =>
  (auctionRepo.all() as Array<Record<string, any>>).filter((a) => a.seller === address.value)
)

async function load() {
  if (!address.value) return
  isLoading.value = true
  try {
    await auctionApi.fetchAuctionsBySeller(address.value, { limit: '50' })
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => address.value, load)

// Open auction (moved here from hub)
const sellBase = ref<{ amount: string; denom: string }>({ amount: '', denom: '' })
const selectedBaseDenom = ref('')
const oaBidDenom = ref('')
const isOpening = ref(false)
const openError = ref('')
const { unlockedWallets, sendMsg } = useWallet()
// using sendMsg directly with WalletSelector (supports authz)
// Wallet selector state
const selectedExecutor = ref('')
const selectedGranteeAddress = ref<string | null>(null)
const isAuthz = ref(false)
const authzNotes = ref('')
const selectedGrant = ref<any>(null)
const allowedAddresses = computed(() => (address.value ? [address.value] : []))
function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }
  if (grant?.granter !== address.value) return { valid: false, notes: 'Different granter' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.whaleswap.v1.MsgOpenAuction'
    return { valid: ok, notes: ok ? 'Generic MsgOpenAuction' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}
function onExecutorAddress(addr: string) {
  selectedExecutor.value = addr
}
function onGranteeAddress(addr: string | null) {
  selectedGranteeAddress.value = addr
}
function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}
function onAuthzNotes(n: string) {
  authzNotes.value = n
}
function onSelectedGrant(g: any) {
  selectedGrant.value = g
}
function onUpdateDisplay(payload: { amount: string; denom: string }) {
  dbg('onUpdateDisplay:input', payload)
  const denomRaw = payload?.denom
  if (!denomRaw) {
    dbg('onUpdateDisplay:empty-denom')
    selectedBaseDenom.value = ''
    return
  }
  try {
    const norm = DenomMetadata.normalize({ amount: '0', denom: String(denomRaw) })
    selectedBaseDenom.value = norm.base.denom
    dbg('onUpdateDisplay:normalized', {
      denomRaw,
      selectedBaseDenom: selectedBaseDenom.value,
      display: norm.display,
      base: norm.base,
    })
  } catch (e) {
    console.error('onUpdateDisplay:normalize-failed', { denomRaw }, e)
    selectedBaseDenom.value = ''
  }
}
const hasDirectUnlocked = computed(() =>
  Array.isArray(unlockedWallets.value)
    ? unlockedWallets.value.some((w: any) => w.address === address.value)
    : false
)
const effectiveDenom = computed(() => {
  const d = sellBase.value.denom
    ? sellBase.value.denom
    : selectedBaseDenom.value
      ? selectedBaseDenom.value
      : ''
  const out = String(d).trim()
  dbg('effectiveDenom:computed', {
    sellBase: { ...sellBase.value },
    selectedBaseDenom: selectedBaseDenom.value,
    out,
  })
  return out
})
const signerReady = computed(() => {
  // Direct: if a wallet for the route address is unlocked OR selector picked the same address
  const directOk =
    !isAuthz.value && (hasDirectUnlocked.value || selectedExecutor.value === address.value)
  // Authz: must have a grantee chosen
  const authzOk = isAuthz.value && !!selectedGranteeAddress.value
  return Boolean(directOk || authzOk)
})
const hasInputs = computed(
  () => !!sellBase.value.amount.trim() && !!sellBase.value.denom.trim() && !!oaBidDenom.value.trim()
)
const spendableRepo = useRepo(SpendableBalance)
const isLoadingSpendable = ref(false)
const hasFetchedSpendable = ref(false)
const fetchedDenom = ref('')
const spendable = computed(() => {
  const denomKey = sellBase.value.denom ? sellBase.value.denom : selectedBaseDenom.value
  const row = denomKey ? (spendableRepo.find([address.value, denomKey]) as any) : null
  const out = row?.amount
  dbg('spendable:computed', {
    address: address.value,
    denomKey,
    row,
    out,
    fetchedDenom: fetchedDenom.value,
    hasFetchedSpendable: hasFetchedSpendable.value,
    isLoadingSpendable: isLoadingSpendable.value,
  })
  if (
    denomKey &&
    hasFetchedSpendable.value &&
    !isLoadingSpendable.value &&
    fetchedDenom.value === denomKey &&
    (!out || typeof out !== 'string')
  )
    throw new Error(`Spendable missing or invalid for address=${address.value} denom=${denomKey}`)
  return typeof out === 'string' ? out : ''
})
const currentSpendableDisplay = computed(() => {
  const denom = effectiveDenom.value
  const amount = spendable.value
  if (!denom) throw new Error('currentSpendableDisplay: denom is empty')
  if (!amount) throw new Error('currentSpendableDisplay: amount is empty')
  const d = DenomMetadata.normalize({ amount, denom }).display
  const res = `${d.amount} ${d.denom}`
  dbg('currentSpendableDisplay:normalized', { denom, amount, display: d, res })
  return res
})
const disabledReasons = computed(() => {
  const reasons: string[] = []
  if (!address.value) reasons.push('No address in route')
  if (!signerReady.value) reasons.push('Select a wallet or authz signer for this address')
  if (!effectiveDenom.value) reasons.push('Sell denom is required')
  if (!sellBase.value.amount.trim()) reasons.push('Sell amount is required')
  if (!oaBidDenom.value.trim()) reasons.push('Bid denom is required')
  // balance check
  try {
    if (!sellBase.value.amount.trim()) throw new Error('balance-check: sell amount missing')
    if (!spendable.value) throw new Error('balance-check: spendable missing')
    const want = BigInt(sellBase.value.amount)
    const have = BigInt(spendable.value)
    dbg('balance-check:state', {
      want: want.toString(),
      have: have.toString(),
      effectiveDenom: effectiveDenom.value,
      hasFetchedSpendable: hasFetchedSpendable.value,
      isLoadingSpendable: isLoadingSpendable.value,
      fetchedDenom: fetchedDenom.value,
    })
    if (
      hasFetchedSpendable.value &&
      !isLoadingSpendable.value &&
      effectiveDenom.value &&
      fetchedDenom.value === effectiveDenom.value &&
      want > have
    ) {
      const bal = currentSpendableDisplay.value
      dbg('balance-check:insufficient', {
        want: want.toString(),
        have: have.toString(),
        bal,
        address: address.value,
        denom: effectiveDenom.value,
      })
      reasons.push(`Insufficient balance for sell amount at ${address.value}: available ${bal}`)
    }
  } catch {
    // ignore parse issues
  }
  return reasons
})

async function fetchSpendable() {
  const src = sellBase.value.denom ? sellBase.value.denom : selectedBaseDenom.value
  const denom = typeof src === 'string' ? src.trim() : ''
  if (!address.value) throw new Error('fetchSpendable: address is empty')
  if (!denom) throw new Error('fetchSpendable: denom is empty')
  isLoadingSpendable.value = true
  dbg('fetchSpendable:pre', { address: address.value, denom })
  await useAxiosRepo(SpendableBalance).api().fetchByDenom(address.value, denom)
  const row = spendableRepo.find([address.value, denom]) as any
  const allForAddr = useRepo(SpendableBalance)
    .where('address', (v: string) => v === address.value)
    .get()
  dbg('fetchSpendable:post', { record: row, allForAddrCount: allForAddr.length })
  if (!row || typeof row.amount !== 'string')
    throw new Error(
      `fetchSpendable: repo missing/invalid for address=${address.value} denom=${denom}`
    )
  hasFetchedSpendable.value = true
  fetchedDenom.value = denom
  isLoadingSpendable.value = false
}

watch(
  () => [address.value, sellBase.value.denom, selectedBaseDenom.value],
  (vals, prev) => {
    dbg('watch:addr/denom change', { vals, prev })
    fetchSpendable()
  }
)
onMounted(async () => {
  try {
    await useAxiosRepo(DenomMetadata).api().fetchAll()
    try {
      const count = (useRepo(DenomMetadata).all() as any[]).length
      dbg('denoms-metadata:loaded', { count })
    } catch (e) {
      console.error('denoms-metadata:repo-read-failed', e)
    }
  } catch (e) {
    console.error('denoms-metadata:load-failed', e)
  }
  await fetchSpendable()
})
const canOpen = computed(() => signerReady.value && hasInputs.value)

async function openAuction() {
  openError.value = ''
  if (!canOpen.value) return
  isOpening.value = true
  try {
    const seller = address.value
    const msg = {
      '@type': '/dysonprotocol.whaleswap.v1.MsgOpenAuction',
      seller,
      sell: { amount: sellBase.value.amount.trim(), denom: sellBase.value.denom.trim() },
      bid_denom: oaBidDenom.value.trim(),
    }
    await sendMsg({
      msg,
      gasLimit: 'auto',
      executorAddress: seller,
      grantee: isAuthz.value ? selectedGranteeAddress.value : undefined,
    })
    await auctionApi.fetchAuctionsBySeller(seller, { limit: '10' })
    const list = (auctionRepo.all() as Array<any>).filter((a) => a.seller === seller)
    const newest = list.sort((a, b) => Number(b.auction_id) - Number(a.auction_id))[0]
    if (newest?.auction_id)
      router.push({ name: 'WhaleswapAuction', params: { auctionId: newest.auction_id } })
    sellBase.value = { amount: '', denom: '' }
    oaBidDenom.value = ''
  } catch (e: any) {
    console.error(e)
    openError.value = String(e?.rawLog || e?.message || e)
  } finally {
    isOpening.value = false
  }
}
</script>
