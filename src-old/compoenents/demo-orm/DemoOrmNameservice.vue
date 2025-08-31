<template>
  <h2
    id="nameservice"
    class="text-xl font-semibold"
  >
    Nameservice
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">
        Queries
      </h3>
      <div class="space-y-2">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Resolve Name
          </h4>
          <input
            v-model="resolveInput"
            class="input w-full"
            placeholder="name or address"
          >
          <button
            class="btn btn-primary"
            @click="resolveName"
          >
            Resolve
          </button>
          <div class="text-sm">
            address=<code>{{ resolvedAddress }}</code>
          </div>
          <div
            v-if="resolveError"
            class="text-sm text-red-600"
          >
            {{ resolveError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Compute Hash
          </h4>
          <input
            v-model="regCommitter"
            class="input w-full"
            placeholder="committer"
          >
          <input
            v-model="regName"
            class="input w-full"
            placeholder="name"
          >
          <input
            v-model="regSalt"
            class="input w-full"
            placeholder="salt"
          >
          <div class="flex gap-2 items-center">
            <button
              class="btn btn-primary"
              @click="computeHash"
            >
              ComputeHash
            </button>
            <span class="text-xs font-mono truncate">{{ regHexhash }}</span>
          </div>
          <div
            v-if="regError"
            class="text-sm text-red-600"
          >
            {{ regError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Names by Destination
          </h4>
          <input
            v-model="destInput"
            class="input w-full"
            placeholder="destination address"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="resolveAllNamesForDestination"
            >
              Init
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ namesByDestCount }}</code>
          </div>
          <div
            v-if="namesError"
            class="text-sm text-red-600"
          >
            {{ namesError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Names by Owner
          </h4>
          <input
            v-model="namesOwner"
            class="input w-full"
            placeholder="owner address"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchNamesByOwner"
            >
              Init
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ namesForOwnerCount }}</code>
          </div>
          <div
            v-if="namesByOwnerError"
            class="text-sm text-red-600"
          >
            {{ namesByOwnerError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Classes by Name
          </h4>
          <input
            v-model="classesName"
            class="input w-full"
            placeholder="root name (e.g. nameservice.dys)"
          >
          <input
            v-model="classesPrefix"
            class="input w-full"
            placeholder="subclass_prefix (optional)"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchClassesInit"
            >
              Init
            </button>
            <button
              class="btn"
              @click="fetchClassesLoadMore"
            >
              Load More
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ classesCount }}</code>
          </div>
          <div
            v-if="classesError"
            class="text-sm text-red-600"
          >
            {{ classesError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Denoms by Name
          </h4>
          <input
            v-model="denomsName"
            class="input w-full"
            placeholder="root name"
          >
          <input
            v-model="denomsPrefix"
            class="input w-full"
            placeholder="subdenom_prefix (optional)"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchDenomsInit"
            >
              Init
            </button>
            <button
              class="btn"
              @click="fetchDenomsLoadMore"
            >
              Load More
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ denomsCount }}</code>
          </div>
          <div
            v-if="denomsError"
            class="text-sm text-red-600"
          >
            {{ denomsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Params
          </h4>
          <button
            class="btn btn-primary"
            @click="fetchParams"
          >
            Fetch
          </button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              min_fee_pct=<code>{{ params.min_valuation_fee_pct }}</code>
            </div>
            <div>
              max_fee_pct=<code>{{ params.max_valuation_fee_pct }}</code>
            </div>
            <div>
              min_period=<code>{{ params.min_valuation_period }}</code>
            </div>
            <div>
              max_period=<code>{{ params.max_valuation_period }}</code>
            </div>
          </div>
          <div
            v-if="paramsError"
            class="text-sm text-red-600"
          >
            {{ paramsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Name (NFT) by ID
          </h4>
          <input
            v-model="nameInput"
            class="input w-full"
            placeholder="name id"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchName"
            >
              Fetch
            </button>
          </div>
          <div class="text-sm">
            owner=<code>{{ nameOwner }}</code>
          </div>
          <div
            v-if="nameError"
            class="text-sm text-red-600"
          >
            {{ nameError }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">
        Actions
      </h3>
      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Set Destination
        </h4>
        <input
          v-model="actOwner"
          class="input w-full"
          placeholder="owner"
        >
        <input
          v-model="actName"
          class="input w-full"
          placeholder="name"
        >
        <input
          v-model="actDestination"
          class="input w-full"
          placeholder="destination address"
        >
        <input
          v-model="actMemo"
          class="input w-full"
          placeholder="memo (optional)"
        >
        <button
          class="btn btn-primary"
          @click="setDestination"
        >
          Send
        </button>
        <div
          v-if="actError"
          class="text-sm text-red-600"
        >
          {{ actError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Set Name Metadata
        </h4>
        <input
          v-model="metaOwner"
          class="input w-full"
          placeholder="owner"
        >
        <input
          v-model="metaName"
          class="input w-full"
          placeholder="name"
        >
        <input
          v-model="metaValue"
          class="input w-full"
          placeholder="metadata"
        >
        <button
          class="btn btn-primary"
          @click="setNameMetadata"
        >
          Send
        </button>
        <div
          v-if="metaError"
          class="text-sm text-red-600"
        >
          {{ metaError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Set Valuation
        </h4>
        <input
          v-model="valOwner"
          class="input w-full"
          placeholder="owner"
        >
        <input
          v-model="valName"
          class="input w-full"
          placeholder="name"
        >
        <div class="flex gap-2">
          <input
            v-model="valAmount"
            class="input w-full"
            placeholder="amount"
          >
          <input
            v-model="valDenom"
            class="input w-full"
            placeholder="denom"
          >
        </div>
        <input
          v-model="valMaxFeePct"
          class="input w-full"
          placeholder="max_valuation_fee_pct (optional)"
        >
        <button
          class="btn btn-primary"
          @click="setValuation"
        >
          Send
        </button>
        <div
          v-if="valError"
          class="text-sm text-red-600"
        >
          {{ valError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Renew
        </h4>
        <input
          v-model="renewPayer"
          class="input w-full"
          placeholder="payer"
        >
        <input
          v-model="renewName"
          class="input w-full"
          placeholder="name"
        >
        <button
          class="btn btn-primary"
          @click="renew"
        >
          Send
        </button>
        <div
          v-if="renewError"
          class="text-sm text-red-600"
        >
          {{ renewError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Bids
        </h4>
        <div class="space-y-2">
          <input
            v-model="bidBidder"
            class="input w-full"
            placeholder="bidder"
          >
          <input
            v-model="bidName"
            class="input w-full"
            placeholder="name"
          >
          <div class="flex gap-2">
            <input
              v-model="bidAmount"
              class="input w-full"
              placeholder="amount"
            >
            <input
              v-model="bidDenom"
              class="input w-full"
              placeholder="denom"
            >
          </div>
          <button
            class="btn btn-primary"
            @click="placeBid"
          >
            Place
          </button>
          <div
            v-if="bidError"
            class="text-sm text-red-600"
          >
            {{ bidError }}
          </div>
        </div>
        <div class="space-y-2">
          <input
            v-model="accOwner"
            class="input w-full"
            placeholder="owner"
          >
          <input
            v-model="accName"
            class="input w-full"
            placeholder="name"
          >
          <button
            class="btn btn-primary"
            @click="acceptBid"
          >
            Accept
          </button>
          <div
            v-if="accError"
            class="text-sm text-red-600"
          >
            {{ accError }}
          </div>
        </div>
        <div class="space-y-2">
          <input
            v-model="rejOwner"
            class="input w-full"
            placeholder="owner"
          >
          <input
            v-model="rejName"
            class="input w-full"
            placeholder="name"
          >
          <div class="flex gap-2">
            <input
              v-model="rejAmount"
              class="input w-full"
              placeholder="new valuation amount"
            >
            <input
              v-model="rejDenom"
              class="input w-full"
              placeholder="denom"
            >
          </div>
          <button
            class="btn btn-primary"
            @click="rejectBid"
          >
            Reject
          </button>
          <div
            v-if="rejError"
            class="text-sm text-red-600"
          >
            {{ rejError }}
          </div>
        </div>
        <div class="space-y-2">
          <input
            v-model="claimBidder"
            class="input w-full"
            placeholder="bidder"
          >
          <input
            v-model="claimName"
            class="input w-full"
            placeholder="name"
          >
          <button
            class="btn btn-primary"
            @click="claimBid"
          >
            Claim
          </button>
          <div
            v-if="claimError"
            class="text-sm text-red-600"
          >
            {{ claimError }}
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Registration Commit
        </h4>
        <input
          v-model="regCommitter"
          class="input w-full"
          placeholder="committer"
        >
        <div class="text-xs opacity-70">
          hexhash: <span class="font-mono">{{ regHexhash }}</span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="regAmount"
            class="input w-full"
            placeholder="valuation amount"
          >
          <input
            v-model="regDenom"
            class="input w-full"
            placeholder="denom"
          >
        </div>
        <button
          class="btn btn-primary"
          @click="commit"
        >
          Commit
        </button>
        <div
          v-if="regError"
          class="text-sm text-red-600"
        >
          {{ regError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Registration Reveal
        </h4>
        <input
          v-model="regCommitter"
          class="input w-full"
          placeholder="committer"
        >
        <input
          v-model="regName"
          class="input w-full"
          placeholder="name"
        >
        <input
          v-model="regSalt"
          class="input w-full"
          placeholder="salt"
        >
        <button
          class="btn btn-primary"
          @click="reveal"
        >
          Reveal
        </button>
        <div
          v-if="regError"
          class="text-sm text-red-600"
        >
          {{ regError }}
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        In-memory
      </h3>
      <h4 class="text-sm font-semibold opacity-70">
        Names (nameservice.dys)
      </h4>
      <div class="text-sm opacity-70">
        count: <code>{{ namesInMemory.length }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>name</th>
              <th>owner</th>
              <th>uri</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="n in namesInMemory"
              :key="n.name"
            >
              <td class="font-mono">
                {{ n.name }}
              </td>
              <td>
                <code>{{ n.owner }}</code>
              </td>
              <td class="max-w-[24rem] truncate">
                <code>{{ n.uri }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="h-px bg-gray-200" />
      <h4 class="text-sm font-semibold opacity-70">
        Names by Destination
      </h4>
      <div class="text-sm opacity-70">
        count: <code>{{ namesByDestCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>destination</th>
              <th>name</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in namesByDestList"
              :key="r.destination + ':' + r.name"
            >
              <td class="font-mono">
                {{ r.destination }}
              </td>
              <td>
                <code>{{ r.name }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="h-px bg-gray-200" />

      <div class="h-px bg-gray-200" />
      <h4 class="text-sm font-semibold opacity-70">
        Params snapshot
      </h4>
      <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
        <div>
          min_fee_pct=<code>{{ params.min_valuation_fee_pct }}</code>
        </div>
        <div>
          max_fee_pct=<code>{{ params.max_valuation_fee_pct }}</code>
        </div>
        <div>
          min_period=<code>{{ params.min_valuation_period }}</code>
        </div>
        <div>
          max_period=<code>{{ params.max_valuation_period }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'
import NameserviceParams from '@/orm/models/nameservice/NameserviceParams'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import ClassesByName from '@/orm/models/nameservice/ClassesByName'
import DenomsByName from '@/orm/models/nameservice/DenomsByName'
import NftItem from '@/orm/models/nft/NftItem'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NameserviceRegistration from '../../orm/models/nameservice/Registration'

const wallet = useWallet()

const paramsRepo = useRepo(NameserviceParams)
const resRepo = useRepo(NameResolution)
const classesRepo = useRepo(ClassesByName)
const denomsRepo = useRepo(DenomsByName)
const nameRepo = useRepo(NftItem)
const namesByDestRepo = useRepo(NamesByDestination)

// Resolve
const resolveInput = ref('')
const resolveError = ref('')
const resolvedAddress = computed(() => (resRepo.find(resolveInput.value) as any)?.address || '')
async function resolveName() {
  resolveError.value = ''
  try {
    const input = resolveInput.value.trim()
    if (!input) throw new Error('input required')
    await useAxiosRepo(NameResolution).api().resolve(input)
  } catch (e: any) {
    console.error(e)
    resolveError.value = e?.message || String(e)
  }
}

// Names by destination
const destInput = ref('')
const namesError = ref('')
const namesByDestList = computed(() => {
  const dest = destInput.value.trim()
  if (!dest) return [] as Array<{ destination: string; name: string }>
  return (namesByDestRepo.all() as Array<{ destination: string; name: string }>).filter(
    (r) => r.destination === dest
  )
})
async function resolveAllNamesForDestination() {
  namesError.value = ''
  try {
    const dest = destInput.value.trim()
    if (!dest) throw new Error('destination required')
    await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: dest })
  } catch (e: any) {
    console.error(e)
    namesError.value = e?.message || String(e)
  }
}

// Names by owner (fixed class id: nameservice.dys)
const namesOwner = ref('')
const namesByOwnerError = ref('')
const namesForOwnerCount = computed(
  () =>
    nameRepo
      .all()
      .filter(
        (n: any) => n.class_id === 'nameservice.dys' && n.owner === (namesOwner.value || '').trim()
      ).length
)
async function fetchNamesByOwner() {
  namesByOwnerError.value = ''
  try {
    const owner = namesOwner.value.trim()
    if (!owner) throw new Error('owner required')
    await useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner })
  } catch (e: any) {
    console.error(e)
    namesByOwnerError.value = e?.message || String(e)
  }
}

// Classes by name
const classesName = ref('')
const classesPrefix = ref('')
const classesError = ref('')
let classesNextKey: string | undefined
let classesPage = 1
const classesCount = computed(() => classesRepo.all().length)
const classesByNameList = computed(() => classesRepo.all())
async function fetchClassesInit() {
  classesError.value = ''
  try {
    const name = classesName.value.trim()
    if (!name) throw new Error('name required')
    const subclass_prefix = classesPrefix.value.trim() || undefined
    const res = await useAxiosRepo(ClassesByName).api().fetchInit({ name, subclass_prefix })
    classesNextKey = res.next_key
    classesPage = 2
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}
async function fetchClassesLoadMore() {
  classesError.value = ''
  try {
    const name = classesName.value.trim()
    if (!name) throw new Error('name required')
    const subclass_prefix = classesPrefix.value.trim() || undefined
    const res = await useAxiosRepo(ClassesByName)
      .api()
      .fetchLoadMore({ name, subclass_prefix, next_key: classesNextKey, page: classesPage })
    classesNextKey = res.next_key
    if (!classesNextKey) classesPage += 1
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}

// Denoms by name
const denomsName = ref('')
const denomsPrefix = ref('')
const denomsError = ref('')
let denomsNextKey: string | undefined
let denomsPage = 1
const denomsCount = computed(() => denomsRepo.all().length)
const denomsByNameList = computed(() => denomsRepo.all())
async function fetchDenomsInit() {
  denomsError.value = ''
  try {
    const name = denomsName.value.trim()
    if (!name) throw new Error('name required')
    const subdenom_prefix = denomsPrefix.value.trim() || undefined
    const res = await useAxiosRepo(DenomsByName).api().fetchInit({ name, subdenom_prefix })
    denomsNextKey = res.next_key
    denomsPage = 2
  } catch (e: any) {
    console.error(e)
    denomsError.value = e?.message || String(e)
  }
}
async function fetchDenomsLoadMore() {
  denomsError.value = ''
  try {
    const name = denomsName.value.trim()
    if (!name) throw new Error('name required')
    const subdenom_prefix = denomsPrefix.value.trim() || undefined
    const res = await useAxiosRepo(DenomsByName)
      .api()
      .fetchLoadMore({ name, subdenom_prefix, next_key: denomsNextKey, page: denomsPage })
    denomsNextKey = res.next_key
    if (!denomsNextKey) denomsPage += 1
  } catch (e: any) {
    console.error(e)
    denomsError.value = e?.message || String(e)
  }
}

// Params
const paramsError = ref('')
const params = computed(
  () =>
    (paramsRepo.find('default') as any) || {
      min_valuation_fee_pct: '',
      max_valuation_fee_pct: '',
      min_valuation_period: '',
      max_valuation_period: '',
    }
)
async function fetchParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(NameserviceParams).api().fetch()
  } catch (e: any) {
    console.error(e)
    paramsError.value = e?.message || String(e)
  }
}

// Name (NFT)
const nameInput = ref('')
const nameError = ref('')
const nameOwner = computed(
  () => (nameRepo.find(['nameservice.dys', nameInput.value]) as any)?.owner || ''
)
async function fetchName() {
  nameError.value = ''
  try {
    const name = nameInput.value.trim()
    if (!name) throw new Error('name required')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', name)
    await useAxiosRepo(NftItem).api().fetchOwner('nameservice.dys', name)
  } catch (e: any) {
    console.error(e)
    nameError.value = e?.message || String(e)
  }
}

// Actions
const actOwner = ref('')
const actName = ref('')
const actDestination = ref('')
const actMemo = ref('')
const actError = ref('')
async function setDestination() {
  actError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgSetDestination',
      owner: actOwner.value,
      name: actName.value,
      destination: actDestination.value,
    }
    const res = await wallet.sendMsg({
      msg,
      gasLimit: 'auto',
      memo: actMemo.value || undefined,
      executorAddress: actOwner.value,
    })
    if (!res?.success) throw new Error(res?.rawLog || 'Set destination failed')
    await Promise.allSettled([
      useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', actName.value),
      useAxiosRepo(NftItem).api().fetchOwner('nameservice.dys', actName.value),
    ])
  } catch (e: any) {
    console.error(e)
    actError.value = e?.message || String(e)
  }
}

const metaOwner = ref('')
const metaName = ref('')
const metaValue = ref('')
const metaError = ref('')
async function setNameMetadata() {
  metaError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgSetNameMetadata',
      owner: metaOwner.value,
      name: metaName.value,
      metadata: metaValue.value,
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: metaOwner.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Set name metadata failed')
    await Promise.allSettled([
      useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', metaName.value),
      useAxiosRepo(NftItem).api().fetchOwner('nameservice.dys', metaName.value),
    ])
  } catch (e: any) {
    console.error(e)
    metaError.value = e?.message || String(e)
  }
}

const valOwner = ref('')
const valName = ref('')
const valAmount = ref('')
const valDenom = ref('')
const valMaxFeePct = ref('')
const valError = ref('')
async function setValuation() {
  valError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgSetValuation',
      owner: valOwner.value,
      nft_class_id: 'nameservice.dys',
      nft_id: valName.value,
      valuation: { amount: valAmount.value, denom: valDenom.value },
      ...(valMaxFeePct.value ? { max_valuation_fee_pct: valMaxFeePct.value } : {}),
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: valOwner.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Set valuation failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', valName.value)
  } catch (e: any) {
    console.error(e)
    valError.value = e?.message || String(e)
  }
}

const renewPayer = ref('')
const renewName = ref('')
const renewError = ref('')
async function renew() {
  renewError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgRenew',
      payer: renewPayer.value,
      nft_class_id: 'nameservice.dys',
      nft_id: renewName.value,
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: renewPayer.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Renew failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', renewName.value)
  } catch (e: any) {
    console.error(e)
    renewError.value = e?.message || String(e)
  }
}

const bidBidder = ref('')
const bidName = ref('')
const bidAmount = ref('')
const bidDenom = ref('')
const bidError = ref('')
async function placeBid() {
  bidError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgPlaceBid',
      bidder: bidBidder.value,
      nft_class_id: 'nameservice.dys',
      nft_id: bidName.value,
      bid_amount: { amount: bidAmount.value, denom: bidDenom.value },
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: bidBidder.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Place bid failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', bidName.value)
  } catch (e: any) {
    console.error(e)
    bidError.value = e?.message || String(e)
  }
}

const accOwner = ref('')
const accName = ref('')
const accError = ref('')
async function acceptBid() {
  accError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgAcceptBid',
      owner: accOwner.value,
      nft_class_id: 'nameservice.dys',
      nft_id: accName.value,
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: accOwner.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Accept bid failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', accName.value)
  } catch (e: any) {
    console.error(e)
    accError.value = e?.message || String(e)
  }
}

const rejOwner = ref('')
const rejName = ref('')
const rejAmount = ref('')
const rejDenom = ref('')
const rejError = ref('')
async function rejectBid() {
  rejError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgRejectBid',
      owner: rejOwner.value,
      nft_class_id: 'nameservice.dys',
      nft_id: rejName.value,
      new_valuation: { amount: rejAmount.value, denom: rejDenom.value },
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: rejOwner.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Reject bid failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', rejName.value)
  } catch (e: any) {
    console.error(e)
    rejError.value = e?.message || String(e)
  }
}

const claimBidder = ref('')
const claimName = ref('')
const claimError = ref('')
async function claimBid() {
  claimError.value = ''
  try {
    const msg = {
      '@type': '/dysonprotocol.nameservice.v1.MsgClaimBid',
      bidder: claimBidder.value,
      nft_class_id: 'nameservice.dys',
      nft_id: claimName.value,
    }
    const res = await wallet.sendMsg({ msg, gasLimit: 'auto', executorAddress: claimBidder.value })
    if (!res?.success) throw new Error(res?.rawLog || 'Claim bid failed')
    await useAxiosRepo(NftItem).api().fetchNft('nameservice.dys', claimName.value)
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
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .commit({
        committer: regCommitter.value,
        hexhash: regHexhash.value,
        valuation: { amount: regAmount.value, denom: regDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
async function reveal() {
  regError.value = ''
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .reveal({
        committer: regCommitter.value,
        name: regName.value,
        salt: regSalt.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        refreshNft: true,
      })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}

// In-memory tables
const namesInMemory = computed(() =>
  (nameRepo.all().filter((n: any) => n.class_id === 'nameservice.dys') as any[]).map((n: any) => ({
    name: n.id,
    owner: n.owner,
    uri: n.uri,
  }))
)
const namesByDestCount = computed(() => namesByDestList.value.length)
const classesByNameCount = computed(() => classesRepo.all().length)
const denomsByNameCount = computed(() => denomsRepo.all().length)
</script>
