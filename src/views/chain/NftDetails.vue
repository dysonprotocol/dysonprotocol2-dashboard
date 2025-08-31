<template>
  <div class="space-y-4 w-full mx-auto md:w-3/4">
    <h1 class="text-2xl font-semibold">NFT</h1>
    <div class="rounded-box p-4 w-full">
      <div v-if="!hasLoaded" class="opacity-70">Loading…</div>
      <div v-else-if="error" class="text-error">{{ error }}</div>
      <div v-else-if="!nft" class="opacity-70">NFT not found.</div>
      <div v-else class="space-y-6">
        <table class="table table-sm">
          <tbody>
            <tr>
              <th>Class ID</th>
              <td class="font-mono break-all">{{ nft.class_id }}</td>
            </tr>
            <tr>
              <th>ID</th>
              <td class="font-mono break-all">{{ nft.id }}</td>
            </tr>
            <tr>
              <th>Owner</th>
              <td>
                <AddressDisplay :address="ownerAddress" :truncate="0" />
              </td>
            </tr>
            <tr>
              <th>URI</th>
              <td class="font-mono break-all">{{ nft.uri || '—' }}</td>
            </tr>
            <tr>
              <th>URI Hash</th>
              <td class="font-mono break-all">{{ nft.uri_hash || '—' }}</td>
            </tr>
            <tr>
              <th>Data</th>
              <td>
                <pre class="text-xs whitespace-pre-wrap break-words">{{
                  prettyJson(nft.data)
                }}</pre>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="space-y-4">
          <div class="font-medium">Actions</div>
          <div class="text-xs opacity-70">
            {{ routeName }} managed by: <span class="font-mono">{{ resolvedAddress }}</span>
          </div>

          <div class="grid gap-3">
            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Set NFT Metadata</div>
              <input
                v-model.trim="nftMeta"
                class="input w-full"
                placeholder="metadata (optional)"
              />
              <input v-model.trim="nftUri" class="input w-full mt-2" placeholder="uri (optional)" />
              <input
                v-model.trim="nftUriHash"
                class="input w-full mt-2"
                placeholder="uri_hash (optional)"
              />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="setNftMetadata">Save</button>
              </div>
              <div v-if="nftMetaError" class="text-error text-sm mt-1">{{ nftMetaError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Set Listed</div>
              <select v-model="listedFlag" class="select select-bordered w-full">
                <option :value="true">true</option>
                <option :value="false">false</option>
              </select>
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="setListed">Save</button>
              </div>
              <div v-if="listedError" class="text-error text-sm mt-1">{{ listedError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Set Valuation</div>
              <div class="flex gap-2">
                <input v-model.trim="valAmount" class="input w-full" placeholder="amount" />
                <input v-model.trim="valDenom" class="input w-full" placeholder="denom" />
              </div>
              <input
                v-model.trim="valMaxFeePct"
                class="input w-full mt-2"
                placeholder="max_valuation_fee_pct (optional)"
              />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="setValuation">Save</button>
              </div>
              <div v-if="valError" class="text-error text-sm mt-1">{{ valError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Renew</div>
              <input v-model.trim="renewPayer" class="input w-full" placeholder="payer" />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="renew">Renew</button>
              </div>
              <div v-if="renewError" class="text-error text-sm mt-1">{{ renewError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Place Bid</div>
              <input v-model.trim="bidBidder" class="input w-full" placeholder="bidder" />
              <div class="flex gap-2 mt-2">
                <input v-model.trim="bidAmount" class="input w-full" placeholder="amount" />
                <input v-model.trim="bidDenom" class="input w-full" placeholder="denom" />
              </div>
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="placeBid">Place</button>
              </div>
              <div v-if="bidError" class="text-error text-sm mt-1">{{ bidError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Accept Bid</div>
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="acceptBid">Accept</button>
              </div>
              <div v-if="accError" class="text-error text-sm mt-1">{{ accError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Reject Bid</div>
              <div class="flex gap-2">
                <input
                  v-model.trim="rejAmount"
                  class="input w-full"
                  placeholder="new valuation amount"
                />
                <input v-model.trim="rejDenom" class="input w-full" placeholder="denom" />
              </div>
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="rejectBid">Reject</button>
              </div>
              <div v-if="rejError" class="text-error text-sm mt-1">{{ rejError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Claim Bid</div>
              <input v-model.trim="claimBidder" class="input w-full" placeholder="bidder" />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="claimBid">Claim</button>
              </div>
              <div v-if="claimError" class="text-error text-sm mt-1">{{ claimError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Send NFT</div>
              <input v-model.trim="sendTo" class="input w-full" placeholder="receiver address" />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="sendNft">Send</button>
              </div>
              <div v-if="sendError" class="text-error text-sm mt-1">{{ sendError }}</div>
            </div>

            <div class="p-3 border rounded">
              <div class="font-semibold text-sm mb-2">Move NFT (force)</div>
              <input v-model.trim="moveTo" class="input w-full" placeholder="to_address" />
              <div class="mt-2">
                <button class="btn btn-primary btn-sm" @click="moveNft">Move</button>
              </div>
              <div v-if="moveError" class="text-error text-sm mt-1">{{ moveError }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import AddressDisplay from '@/components/AddressDisplay.vue'
import NftItem from '@/orm/models/nft/NftItem'
import { useWallet } from '@/composables/useWallet'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import NameResolution from '@/orm/models/nameservice/NameResolution'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))
const routeClassId = computed(() => String(route.params.classid || ''))
const routeId = computed(() => String(route.params.id || ''))
const wallet = useWallet()

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const nft = ref<{
  class_id: string
  id: string
  uri: string
  uri_hash: string
  data?: unknown
} | null>(null)
const ownerAddress = ref('')
const resolvedAddress = computed(() => {
  const repo = useRepo(NameResolution)
  return (repo.find(routeName.value) as any)?.address || ''
})

// Action form state
const nftMeta = ref('')
const nftUri = ref('')
const nftUriHash = ref('')
const nftMetaError = ref('')

const listedFlag = ref(true)
const listedError = ref('')

const valAmount = ref('')
const valDenom = ref('')
const valMaxFeePct = ref('')
const valError = ref('')

const renewPayer = ref('')
const renewError = ref('')

const bidBidder = ref('')
const bidAmount = ref('')
const bidDenom = ref('')
const bidError = ref('')

const accError = ref('')

const rejAmount = ref('')
const rejDenom = ref('')
const rejError = ref('')

const claimBidder = ref('')
const claimError = ref('')

const sendTo = ref('')
const sendError = ref('')

const moveTo = ref('')
const moveError = ref('')

function prettyJson(v: unknown) {
  try {
    if (v == null) return ''
    return JSON.stringify(v, null, 2)
  } catch (err) {
    console.error(err)
    return String(v)
  }
}

async function fetchNft(classId: string, id: string) {
  if (!classId || !id) return
  isLoading.value = true
  hasLoaded.value = false
  error.value = ''
  nft.value = null
  ownerAddress.value = ''
  try {
    await useAxiosRepo(NftItem).api().fetchNftWithOwner(classId, id)
    const repo = useRepo(NftItem)
    const rec = (repo
      .query()
      .where('class_id', (v: string) => v === classId)
      .where('id', (v: string) => v === id)
      .first() || null) as unknown as {
      class_id: string
      id: string
      uri: string
      uri_hash: string
      data?: unknown
      owner?: string
    } | null
    if (!rec) {
      nft.value = null
      return
    }
    nft.value = {
      class_id: rec.class_id,
      id: rec.id,
      uri: rec.uri,
      uri_hash: rec.uri_hash,
      data: rec.data,
    }
    ownerAddress.value = String((rec as any)?.owner || '')
  } catch (e: any) {
    error.value = e?.message || 'Failed to load NFT'
  } finally {
    isLoading.value = false
    hasLoaded.value = true
  }
}

watchEffect(() => {
  const classId = routeClassId.value
  const id = routeId.value
  if (!classId || !id) return
  void useAxiosRepo(NameResolution).api().resolve(routeName.value)
  void fetchNft(classId, id)
})

// ---- Actions ----
async function setNftMetadata() {
  nftMetaError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTMetadata({
        name_destination: resolvedAddress.value,
        class_id: routeClassId.value,
        nft_id: routeId.value,
        metadata: nftMeta.value || undefined,
        uri: nftUri.value || undefined,
        uri_hash: nftUriHash.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set NFT metadata failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    nftMetaError.value = e?.message || String(e)
  }
}

async function setListed() {
  listedError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setListed({
        nft_owner: ownerAddress.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        listed: Boolean(listedFlag.value),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set listed failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    listedError.value = e?.message || String(e)
  }
}

async function setValuation() {
  valError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setValuation({
        owner: ownerAddress.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        valuation: { amount: valAmount.value, denom: valDenom.value },
        max_valuation_fee_pct: valMaxFeePct.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set valuation failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    valError.value = e?.message || String(e)
  }
}

async function renew() {
  renewError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .renew({
        payer: renewPayer.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Renew failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    renewError.value = e?.message || String(e)
  }
}

async function placeBid() {
  bidError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .placeBid({
        bidder: bidBidder.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        bid_amount: { amount: bidAmount.value, denom: bidDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Place bid failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    bidError.value = e?.message || String(e)
  }
}

async function acceptBid() {
  accError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .acceptBid({
        owner: ownerAddress.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Accept bid failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    accError.value = e?.message || String(e)
  }
}

async function rejectBid() {
  rejError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .rejectBid({
        owner: ownerAddress.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        new_valuation: { amount: rejAmount.value, denom: rejDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Reject bid failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    rejError.value = e?.message || String(e)
  }
}

async function claimBid() {
  claimError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .claimBid({
        bidder: claimBidder.value,
        nft_class_id: routeClassId.value,
        nft_id: routeId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Claim bid failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    claimError.value = e?.message || String(e)
  }
}

async function sendNft() {
  sendError.value = ''
  try {
    const res = await useAxiosRepo(NftItem)
      .api()
      .send({
        class_id: routeClassId.value,
        id: routeId.value,
        sender: ownerAddress.value,
        receiver: sendTo.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        refreshOwners: [
          { class_id: routeClassId.value, owner: ownerAddress.value },
          { class_id: routeClassId.value, owner: sendTo.value },
        ],
      })
    if (!res?.success) throw new Error(res?.rawLog || 'NFT send failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    sendError.value = e?.message || String(e)
  }
}

async function moveNft() {
  moveError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .moveNft({
        name_destination: resolvedAddress.value,
        class_id: routeClassId.value,
        nft_id: routeId.value,
        to_address: moveTo.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Move NFT failed')
    await fetchNft(routeClassId.value, routeId.value)
  } catch (e: any) {
    console.error(e)
    moveError.value = e?.message || String(e)
  }
}
</script>
