<template>
  <div class="p-4 space-y-4">
    <div class="space-y-1">
      <h2 class="text-xl font-semibold">Auction #{{ auctionId }}</h2>
      <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
      <Alert v-if="lastError" variant="destructive">
        <AlertDescription>{{ lastError }}</AlertDescription>
      </Alert>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader class="pb-2"><CardTitle class="text-base">Details</CardTitle></CardHeader>
        <CardContent class="space-y-2">
          <div class="text-sm grid grid-cols-3 gap-y-1">
            <div class="opacity-70">Sell</div>
            <div class="col-span-2 font-mono">
              {{ sell?.amount || '0' }} {{ sell?.denom || '' }}
            </div>
            <div class="opacity-70">Bid denom</div>
            <div class="col-span-2 font-mono">{{ bidDenom }}</div>
            <div class="opacity-70">Seller</div>
            <div class="col-span-2 break-all font-mono">{{ auction.seller }}</div>
            <div class="opacity-70">NFT</div>
            <div class="col-span-2 font-mono">{{ classId }}/{{ nftId }}</div>
            <div class="opacity-70">Owner</div>
            <div class="col-span-2 break-all font-mono">{{ nftOwner }}</div>
            <div class="opacity-70">Current bidder</div>
            <div class="col-span-2 break-all font-mono">{{ currentBidder || '—' }}</div>
            <div class="opacity-70">Current bid</div>
            <div class="col-span-2 font-mono">
              <span v-if="currentBid.amount">{{ currentBid.amount }} {{ currentBid.denom }}</span>
              <span v-else>—</span>
            </div>
          </div>
          <div class="text-xs opacity-70" v-if="hasActiveBid">
            Redeem is blocked while a bid is active.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2"><CardTitle class="text-base">Actions</CardTitle></CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <div class="text-sm font-medium">Place Bid</div>
            <div class="flex gap-2 items-end">
              <div class="space-y-1">
                <Label>Amount</Label>
                <Input v-model.trim="bidAmount" class="w-40" placeholder="amount" />
              </div>
              <span class="text-sm font-mono">{{ bidDenom }}</span>
              <Button :disabled="!canPlaceBid || isBusy('place')" @click="placeBid">
                {{ isBusy('place') ? 'Submitting…' : 'Place Bid' }}
              </Button>
            </div>
            <div class="text-xs opacity-70">
              Bidder: <span class="font-mono">{{ activeAddress || '—' }}</span>
            </div>
          </div>

          <div class="divider my-1"></div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Owner</div>
            <div class="flex flex-wrap gap-2 items-end">
              <Button :disabled="!canAccept || isBusy('accept')" @click="acceptBid">
                {{ isBusy('accept') ? 'Submitting…' : 'Accept Bid' }}
              </Button>
              <div class="space-y-1">
                <Label>New valuation ({{ bidDenom }})</Label>
                <Input v-model.trim="newValuationAmount" class="w-40" placeholder="amount" />
              </div>
              <Button :disabled="!canReject || isBusy('reject')" @click="rejectBid">
                {{ isBusy('reject') ? 'Submitting…' : 'Reject & Set Valuation' }}
              </Button>
              <Button :disabled="!canRedeem || isBusy('redeem')" @click="redeem">
                {{ isBusy('redeem') ? 'Submitting…' : 'Redeem Escrow' }}
              </Button>
            </div>
            <div class="text-xs opacity-70">
              Owner: <span class="font-mono">{{ nftOwner || '—' }}</span>
            </div>
          </div>

          <div class="divider my-1"></div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Bidder</div>
            <div class="flex gap-2 items-end">
              <Button :disabled="!canClaim || isBusy('claim')" @click="claimBid">
                {{ isBusy('claim') ? 'Submitting…' : 'Claim Bid' }}
              </Button>
            </div>
            <div class="text-xs opacity-70">
              Current bidder: <span class="font-mono">{{ currentBidder || '—' }}</span>
            </div>
          </div>

          <div class="divider my-1"></div>

          <div class="space-y-2">
            <div class="text-sm font-medium">Transfer NFT</div>
            <div class="flex gap-2 items-end">
              <div class="space-y-1">
                <Label>Receiver address</Label>
                <Input v-model.trim="transferTo" class="w-72" placeholder="dys2…" />
              </div>
              <Button :disabled="!canTransfer || isBusy('transfer')" @click="transferNft">
                {{ isBusy('transfer') ? 'Submitting…' : 'Transfer' }}
              </Button>
            </div>
            <div class="text-xs opacity-70">Only current owner may transfer.</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <details class="rounded-md border p-3">
      <summary class="cursor-pointer">Raw</summary>
      <pre class="text-xs overflow-auto">{{ JSON.stringify({ auction, nft }, null, 2) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapAuction from '@/orm/models/whaleswap/Auction'
import WhaleswapActions from '@/orm/models/whaleswap/Actions'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import NftItem from '@/orm/models/nft/NftItem'
import { useWallet } from '@/composables/useWallet.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const route = useRoute()
const auctionId = computed(() => String(route.params.auctionId || ''))

const auctionApi = useAxiosRepo(WhaleswapAuction).api()
const auctionRepo = useRepo(WhaleswapAuction)
const auction = computed(() => (auctionRepo.find(auctionId.value) as any) || {})

const nftApi = useAxiosRepo(NftItem).api()
const nftRepo = useRepo(NftItem)

const classId = computed(() => String(auction.value.class_id || ''))
const nftId = computed(() => String(auction.value.nft_id || ''))
const sell = computed(() => (auction.value.sell as { amount?: string; denom?: string }) || {})
const bidDenom = computed(() => String(auction.value.bid_denom || ''))

const nft = computed(
  () =>
    (classId.value && nftId.value ? (nftRepo.find([classId.value, nftId.value]) as any) : null) || {
      data: {},
    }
)
const nftOwner = computed(() => String(nft.value?.owner || ''))
const currentBidder = computed(() => String((nft.value?.data || {})?.current_bidder || ''))
const currentBid = computed(
  () =>
    (nft.value?.data?.current_bid as { amount?: string; denom?: string }) || {
      amount: '',
      denom: '',
    }
)
const hasActiveBid = computed(() => Boolean(currentBidder.value))

const { unlockedWallets, getSignerAddress, sendMsg } = useWallet()
const activeAddress = computed(() =>
  Array.isArray(unlockedWallets.value) && unlockedWallets.value[0]
    ? unlockedWallets.value[0].address
    : ''
)
const wallet = { sendMsg }

const isLoading = ref(false)
const lastError = ref('')
const busyKey = ref<'place' | 'accept' | 'reject' | 'claim' | 'redeem' | 'transfer' | ''>('')
function isBusy(k: 'place' | 'accept' | 'reject' | 'claim' | 'redeem' | 'transfer') {
  return busyKey.value === k
}

const bidAmount = ref('')
const newValuationAmount = ref('')
const transferTo = ref('')

const isOwner = computed(() => !!activeAddress.value && activeAddress.value === nftOwner.value)
const isCurrentBidder = computed(
  () =>
    !!activeAddress.value && !!currentBidder.value && activeAddress.value === currentBidder.value
)

const canPlaceBid = computed(
  () =>
    !!activeAddress.value &&
    !!classId.value &&
    !!nftId.value &&
    !!bidDenom.value &&
    bidAmount.value.trim() !== ''
)
const canAccept = computed(() => isOwner.value && hasActiveBid.value)
const canReject = computed(() => isOwner.value && newValuationAmount.value.trim() !== '')
const canClaim = computed(() => isCurrentBidder.value)
const canRedeem = computed(() => isOwner.value && !hasActiveBid.value)
const canTransfer = computed(
  () => isOwner.value && !!transferTo.value.trim() && !!classId.value && !!nftId.value
)

async function refresh() {
  if (!auctionId.value) return
  await auctionApi.fetchAuction(auctionId.value)
  if (classId.value && nftId.value) await nftApi.fetchNftWithOwner(classId.value, nftId.value)
}

async function placeBid() {
  lastError.value = ''
  if (!canPlaceBid.value) return
  const bidder = getSignerAddress()
  busyKey.value = 'place'
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .placeBid({
        bidder,
        nft_class_id: classId.value,
        nft_id: nftId.value,
        bid_amount: { amount: bidAmount.value.trim(), denom: bidDenom.value },
        wallet,
        gasLimit: 'auto',
      })
    bidAmount.value = ''
    await nftApi.fetchNftWithOwner(classId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

async function acceptBid() {
  lastError.value = ''
  if (!canAccept.value) return
  const owner = getSignerAddress()
  busyKey.value = 'accept'
  try {
    await useAxiosRepo(NameserviceActions).api().acceptBid({
      owner,
      nft_class_id: classId.value,
      nft_id: nftId.value,
      wallet,
      gasLimit: 'auto',
    })
    await nftApi.fetchNftWithOwner(classId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

async function rejectBid() {
  lastError.value = ''
  if (!canReject.value) return
  const owner = getSignerAddress()
  busyKey.value = 'reject'
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .rejectBid({
        owner,
        nft_class_id: classId.value,
        nft_id: nftId.value,
        new_valuation: { amount: newValuationAmount.value.trim(), denom: bidDenom.value },
        wallet,
        gasLimit: 'auto',
      })
    newValuationAmount.value = ''
    await nftApi.fetchNftWithOwner(classId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

async function claimBid() {
  lastError.value = ''
  if (!canClaim.value) return
  const bidder = getSignerAddress()
  busyKey.value = 'claim'
  try {
    await useAxiosRepo(NameserviceActions).api().claimBid({
      bidder,
      nft_class_id: classId.value,
      nft_id: nftId.value,
      wallet,
      gasLimit: 'auto',
    })
    await nftApi.fetchNftWithOwner(classId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

async function redeem() {
  lastError.value = ''
  if (!canRedeem.value) return
  const caller = getSignerAddress()
  busyKey.value = 'redeem'
  try {
    await useAxiosRepo(WhaleswapActions)
      .api()
      .redeemAuction({ caller, auction_id: auctionId.value, wallet, gasLimit: 'auto' })
    await refresh()
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

async function transferNft() {
  lastError.value = ''
  if (!canTransfer.value) return
  const sender = getSignerAddress()
  busyKey.value = 'transfer'
  try {
    await useAxiosRepo(NftItem)
      .api()
      .send({
        class_id: classId.value,
        id: nftId.value,
        sender,
        receiver: transferTo.value.trim(),
        wallet,
        gasLimit: 'auto',
        refreshOwners: [
          { class_id: classId.value, owner: sender },
          { class_id: classId.value, owner: transferTo.value.trim() },
        ],
      })
    transferTo.value = ''
    await nftApi.fetchNftWithOwner(classId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    lastError.value = String(e?.message || e)
  } finally {
    busyKey.value = ''
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    if (auctionId.value) await auctionApi.fetchAuction(auctionId.value)
  } finally {
    isLoading.value = false
  }
})

watch(
  () => [classId.value, nftId.value],
  async ([c, n]) => {
    if (c && n) await nftApi.fetchNftWithOwner(c, n)
  },
  { immediate: true }
)
</script>
