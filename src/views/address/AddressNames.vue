<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-semibold">Names by Destination</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ byDest.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="r in byDest" :key="r.name">
          <span class="font-mono">{{ r.name }}</span>
        </li>
        <li v-if="byDest.length === 0" class="opacity-70">No names</li>
      </ul>
    </div>

    <div>
      <h3 class="font-semibold">Owned Names</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ ownedNames.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="n in ownedNames" :key="n">
          <span class="font-mono">{{ n }}</span>
        </li>
        <li v-if="ownedNames.length === 0" class="opacity-70">No owned names</li>
      </ul>
    </div>

    <form class="grid md:grid-cols-4 gap-2 items-end" @submit.prevent="submitTransfer">
      <div>
        <label class="text-xs">Name</label>
        <select v-model="selectedName" class="select select-bordered w-full">
          <option value="">Select name</option>
          <option v-for="r in byDest" :key="r.name" :value="r.name">
            {{ r.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="text-xs">New owner</label>
        <input v-model="newOwner" class="input w-full" placeholder="dys2..." />
      </div>
      <div class="text-xs opacity-70">
        From: <code>{{ address }}</code>
      </div>
      <button class="btn btn-primary" type="submit" :disabled="!canTransfer">Transfer</button>
      <div v-if="error" class="text-sm text-red-600 md:col-span-4">
        {{ error }}
      </div>
    </form>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Set Destination</div>
        <div class="grid grid-cols-1 gap-2">
          <select v-model="selectedName" class="select select-bordered w-full">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <input
            v-model="sdDestination"
            class="input w-full"
            placeholder="destination (bech32 or name)"
          />
          <button class="btn btn-primary" :disabled="!canSetDestination" @click="setDestination">
            Set
          </button>
          <div v-if="setDestError" class="text-sm text-red-600">
            {{ setDestError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Set Name Metadata</div>
        <div class="grid grid-cols-1 gap-2">
          <select v-model="selectedName" class="select select-bordered w-full">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <input v-model="metaValue" class="input w-full" placeholder="metadata" />
          <button class="btn btn-primary" :disabled="!canSetMetadata" @click="setNameMetadata">
            Set
          </button>
          <div v-if="metaError" class="text-sm text-red-600">
            {{ metaError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Set Valuation</div>
        <div class="grid grid-cols-2 gap-2">
          <select v-model="selectedName" class="select select-bordered col-span-2">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <input v-model="valAmount" class="input w-full" placeholder="amount" />
          <input v-model="valDenom" class="input w-full" placeholder="denom" />
          <input
            v-model="valMaxFeePct"
            class="input w-full col-span-2"
            placeholder="max fee pct (optional)"
          />
          <button
            class="btn btn-primary col-span-2"
            :disabled="!canSetValuation"
            @click="setValuation"
          >
            Set
          </button>
          <div v-if="valError" class="text-sm text-red-600 col-span-2">
            {{ valError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Renew</div>
        <div class="grid grid-cols-1 gap-2">
          <select v-model="selectedName" class="select select-bordered w-full">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <button class="btn btn-primary" :disabled="!canRenew" @click="renew">Renew</button>
          <div v-if="renewError" class="text-sm text-red-600">
            {{ renewError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Place Bid</div>
        <div class="grid grid-cols-2 gap-2">
          <input v-model="bidName" class="input col-span-2" placeholder="name to bid on" />
          <input v-model="bidAmount" class="input" placeholder="amount" />
          <input v-model="bidDenom" class="input" placeholder="denom" />
          <button class="btn btn-primary col-span-2" :disabled="!canPlaceBid" @click="placeBid">
            Place
          </button>
          <div v-if="bidError" class="text-sm text-red-600 col-span-2">
            {{ bidError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Accept Bid</div>
        <div class="grid grid-cols-1 gap-2">
          <select v-model="selectedName" class="select select-bordered w-full">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <button class="btn btn-primary" :disabled="!canAcceptBid" @click="acceptBid">
            Accept
          </button>
          <div v-if="accError" class="text-sm text-red-600">
            {{ accError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Reject Bid</div>
        <div class="grid grid-cols-2 gap-2">
          <select v-model="selectedName" class="select select-bordered col-span-2">
            <option value="">Select owned name</option>
            <option v-for="n in ownedNames" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <input v-model="rejAmount" class="input" placeholder="new valuation amount" />
          <input v-model="rejDenom" class="input" placeholder="denom" />
          <button class="btn btn-primary col-span-2" :disabled="!canRejectBid" @click="rejectBid">
            Reject
          </button>
          <div v-if="rejError" class="text-sm text-red-600 col-span-2">
            {{ rejError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded">
        <div class="font-semibold">Claim Bid</div>
        <div class="grid grid-cols-1 gap-2">
          <input v-model="claimName" class="input" placeholder="name you bid on" />
          <button class="btn btn-primary" :disabled="!canClaimBid" @click="claimBid">Claim</button>
          <div v-if="claimError" class="text-sm text-red-600">
            {{ claimError }}
          </div>
        </div>
      </div>

      <div class="space-y-2 p-3 border rounded md:col-span-2">
        <div class="font-semibold">Registration (Commit / Reveal)</div>
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="regCommitter"
            class="input col-span-2"
            placeholder="committer (defaults to this address)"
          />
          <input v-model="regName" class="input" placeholder="name" />
          <input v-model="regSalt" class="input" placeholder="salt" />
          <button class="btn" @click="computeHash">Compute Hash</button>
          <div class="text-xs col-span-2">
            hexhash: <span class="font-mono">{{ regHexhash }}</span>
          </div>
          <input v-model="regAmount" class="input" placeholder="valuation amount" />
          <input v-model="regDenom" class="input" placeholder="denom" />
          <button class="btn btn-primary col-span-2" :disabled="!canCommit" @click="commit">
            Commit
          </button>
          <button class="btn btn-primary col-span-2" :disabled="!canReveal" @click="reveal">
            Reveal
          </button>
          <div v-if="regError" class="text-sm text-red-600 col-span-2">
            {{ regError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NftItem from '@/orm/models/nft/NftItem'
import { useWallet } from '@/composables/useWallet'
import NameserviceRegistration from '@/orm/models/nameservice/Registration'
import NameserviceActions from '@/orm/models/nameservice/Actions'

const props = defineProps<{ address: string }>()

const repo = useRepo(NamesByDestination)
const byDest = computed<any[]>(() =>
  (repo.all() as any[]).filter((r) => r.destination === props.address)
)

const itemRepo = useRepo(NftItem)
const ownedNames = computed<string[]>(() =>
  (
    itemRepo
      .all()
      .filter((n: any) => n.class_id === 'nameservice.dys' && n.owner === props.address) as any[]
  ).map((n: any) => String(n.id))
)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: props.address })
  await useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})

const wallet = useWallet()
const selectedName = ref('')
const newOwner = ref('')
const error = ref('')
const canTransfer = computed(() => Boolean(props.address && selectedName.value && newOwner.value))

async function submitTransfer() {
  error.value = ''
  if (!canTransfer.value) return
  try {
    await useAxiosRepo(NftItem)
      .api()
      .send({
        class_id: 'nameservice.dys',
        id: selectedName.value,
        sender: props.address,
        receiver: newOwner.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        refreshOwners: [
          { class_id: 'nameservice.dys', owner: props.address },
          { class_id: 'nameservice.dys', owner: newOwner.value },
        ],
      })
    selectedName.value = ''
    newOwner.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  }
}

// Set Destination
const sdDestination = ref('')
const setDestError = ref('')
const canSetDestination = computed(() =>
  Boolean(props.address && selectedName.value && sdDestination.value)
)
async function setDestination() {
  setDestError.value = ''
  if (!canSetDestination.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .setDestination({
        owner: props.address,
        name: selectedName.value,
        destination: sdDestination.value,
        wallet: { sendMsg: wallet.sendMsg },
      })
    sdDestination.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    setDestError.value = e?.message || String(e)
  }
}

// Set Name Metadata
const metaValue = ref('')
const metaError = ref('')
const canSetMetadata = computed(() =>
  Boolean(props.address && selectedName.value && metaValue.value)
)
async function setNameMetadata() {
  metaError.value = ''
  if (!canSetMetadata.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .setNameMetadata({
        owner: props.address,
        name: selectedName.value,
        metadata: metaValue.value,
        wallet: { sendMsg: wallet.sendMsg },
      })
    metaValue.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    metaError.value = e?.message || String(e)
  }
}

// Set Valuation
const valAmount = ref('')
const valDenom = ref('')
const valMaxFeePct = ref('')
const valError = ref('')
const canSetValuation = computed(() =>
  Boolean(props.address && selectedName.value && valAmount.value && valDenom.value)
)
async function setValuation() {
  valError.value = ''
  if (!canSetValuation.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .setValuation({
        owner: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: selectedName.value,
        valuation: { amount: valAmount.value, denom: valDenom.value },
        max_valuation_fee_pct: valMaxFeePct.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
      })
    valAmount.value = ''
    valDenom.value = ''
    valMaxFeePct.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    valError.value = e?.message || String(e)
  }
}

// Renew
const renewError = ref('')
const canRenew = computed(() => Boolean(props.address && selectedName.value))
async function renew() {
  renewError.value = ''
  if (!canRenew.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .renew({
        payer: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: selectedName.value,
        wallet: { sendMsg: wallet.sendMsg },
      })
    await refresh()
  } catch (e: any) {
    console.error(e)
    renewError.value = e?.message || String(e)
  }
}

// Bids
const bidName = ref('')
const bidAmount = ref('')
const bidDenom = ref('')
const bidError = ref('')
const canPlaceBid = computed(() =>
  Boolean(props.address && bidName.value && bidAmount.value && bidDenom.value)
)
async function placeBid() {
  bidError.value = ''
  if (!canPlaceBid.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .placeBid({
        bidder: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: bidName.value,
        bid_amount: { amount: bidAmount.value, denom: bidDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
      })
    bidName.value = ''
    bidAmount.value = ''
    bidDenom.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    bidError.value = e?.message || String(e)
  }
}

const accError = ref('')
const canAcceptBid = computed(() => Boolean(props.address && selectedName.value))
async function acceptBid() {
  accError.value = ''
  if (!canAcceptBid.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .acceptBid({
        owner: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: selectedName.value,
        wallet: { sendMsg: wallet.sendMsg },
      })
    await refresh()
  } catch (e: any) {
    console.error(e)
    accError.value = e?.message || String(e)
  }
}

const rejAmount = ref('')
const rejDenom = ref('')
const rejError = ref('')
const canRejectBid = computed(() =>
  Boolean(props.address && selectedName.value && rejAmount.value && rejDenom.value)
)
async function rejectBid() {
  rejError.value = ''
  if (!canRejectBid.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .rejectBid({
        owner: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: selectedName.value,
        new_valuation: { amount: rejAmount.value, denom: rejDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
      })
    rejAmount.value = ''
    rejDenom.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    rejError.value = e?.message || String(e)
  }
}

const claimName = ref('')
const claimError = ref('')
const canClaimBid = computed(() => Boolean(props.address && claimName.value))
async function claimBid() {
  claimError.value = ''
  if (!canClaimBid.value) return
  try {
    await useAxiosRepo(NameserviceActions)
      .api()
      .claimBid({
        bidder: props.address,
        nft_class_id: 'nameservice.dys',
        nft_id: claimName.value,
        wallet: { sendMsg: wallet.sendMsg },
      })
    claimName.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    claimError.value = e?.message || String(e)
  }
}

// Registration
const regCommitter = ref('')
const regName = ref('')
const regSalt = ref('')
const regHexhash = ref('')
const regAmount = ref('')
const regDenom = ref('')
const regError = ref('')
watchEffect(() => {
  if (props.address && !regCommitter.value) regCommitter.value = props.address
})
const canCommit = computed(() =>
  Boolean(regCommitter.value && regHexhash.value && regAmount.value && regDenom.value)
)
const canReveal = computed(() => Boolean(regCommitter.value && regName.value && regSalt.value))
async function computeHash() {
  regError.value = ''
  try {
    regHexhash.value = await useAxiosRepo(NameserviceRegistration)
      .api()
      .computeHash({ name: regName.value, salt: regSalt.value, committer: regCommitter.value })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
async function commit() {
  regError.value = ''
  if (!canCommit.value) return
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .commit({
        committer: regCommitter.value,
        hexhash: regHexhash.value,
        valuation: { amount: regAmount.value, denom: regDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
      })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
async function reveal() {
  regError.value = ''
  if (!canReveal.value) return
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .reveal({
        committer: regCommitter.value,
        name: regName.value,
        salt: regSalt.value,
        wallet: { sendMsg: wallet.sendMsg },
        refreshNft: true,
      })
    await refresh()
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
</script>
