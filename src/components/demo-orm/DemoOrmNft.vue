<template>
  <h2
    id="nft"
    class="text-xl font-semibold"
  >
    NFT
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">
        Queries
      </h3>
      <div class="space-y-2">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Balance
          </h4>
          <input
            v-model="balClassId"
            class="input w-full"
            placeholder="class_id"
          >
          <input
            v-model="balOwner"
            class="input w-full"
            placeholder="owner"
          >
          <button
            class="btn btn-primary"
            @click="fetchBalance"
          >
            Fetch
          </button>
          <div class="text-sm">
            amount=<code>{{ balanceAmount }}</code>
          </div>
          <div
            v-if="balError"
            class="text-sm text-red-600"
          >
            {{ balError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            NFT by ID
          </h4>
          <input
            v-model="nftClassId"
            class="input w-full"
            placeholder="class_id"
          >
          <input
            v-model="nftId"
            class="input w-full"
            placeholder="id"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchNft"
            >
              Fetch
            </button>
            <button
              class="btn btn-primary"
              @click="fetchOwner"
            >
              Fetch Owner
            </button>
          </div>
          <div class="text-sm">
            owner=<code>{{ nftOwner }}</code>
          </div>
          <div
            v-if="nftError"
            class="text-sm text-red-600"
          >
            {{ nftError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Supply
          </h4>
          <input
            v-model="supplyClassId"
            class="input w-full"
            placeholder="class_id"
          >
          <button
            class="btn btn-primary"
            @click="fetchSupply"
          >
            Fetch
          </button>
          <div class="text-sm">
            amount=<code>{{ supplyAmount }}</code>
          </div>
          <div
            v-if="supplyError"
            class="text-sm text-red-600"
          >
            {{ supplyError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            NFTs (by class_id and/or owner)
          </h4>
          <input
            v-model="listClassId"
            class="input w-full"
            placeholder="class_id (optional)"
          >
          <input
            v-model="listOwner"
            class="input w-full"
            placeholder="owner (optional)"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchNftsInit"
            >
              Init
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ nftsCount }}</code>
          </div>
          <div
            v-if="nftsError"
            class="text-sm text-red-600"
          >
            {{ nftsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Classes
          </h4>
          <div class="flex gap-2">
            <input
              v-model="classId"
              class="input w-full"
              placeholder="class_id"
            >
            <button
              class="btn btn-primary"
              @click="fetchClass"
            >
              Fetch
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchClasses"
            >
              Init
            </button>
          </div>
          <div class="text-sm">
            classes=<code>{{ classesCount }}</code>
          </div>
          <div
            v-if="classesError"
            class="text-sm text-red-600"
          >
            {{ classesError }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        NFTs (in memory)
      </h3>
      <div class="text-sm opacity-70">
        count: <code>{{ nftsCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>class_id</th>
              <th>id</th>
              <th>owner</th>
              <th>uri</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in nftList"
              :key="r.key"
            >
              <td class="font-mono">
                {{ r.class_id }}
              </td>
              <td class="font-mono">
                {{ r.id }}
              </td>
              <td>
                <code>{{ r.owner }}</code>
              </td>
              <td class="max-w-[24rem] truncate">
                <code>{{ r.uri }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="h-px bg-gray-200" />
      <h4 class="text-sm font-semibold opacity-70">
        Balances (in memory)
      </h4>
      <div class="text-sm opacity-70">
        count: <code>{{ balancesCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>class_id</th>
              <th>owner</th>
              <th>amount</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in balancesList"
              :key="b.class_id + ':' + b.owner"
            >
              <td class="font-mono">
                {{ b.class_id }}
              </td>
              <td>
                <code>{{ b.owner }}</code>
              </td>
              <td>
                <code>{{ b.amount }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="h-px bg-gray-200" />
      <h4 class="text-sm font-semibold opacity-70">
        Classes (in memory)
      </h4>
      <div class="text-sm opacity-70">
        count: <code>{{ classesCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>id</th>
              <th>name</th>
              <th>symbol</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in classesList"
              :key="c.id"
            >
              <td class="font-mono">
                {{ c.id }}
              </td>
              <td>
                <code>{{ c.name }}</code>
              </td>
              <td>
                <code>{{ c.symbol }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="h-px bg-gray-200" />
      <h4 class="text-sm font-semibold opacity-70">
        Supply (in memory)
      </h4>
      <div class="text-sm opacity-70">
        count: <code>{{ suppliesCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>class_id</th>
              <th>amount</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in suppliesList"
              :key="s.class_id"
            >
              <td class="font-mono">
                {{ s.class_id }}
              </td>
              <td>
                <code>{{ s.amount }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Send NFT
      </h3>
      <input
        v-model="sendClassId"
        class="input w-full"
        placeholder="class_id"
      >
      <input
        v-model="sendId"
        class="input w-full"
        placeholder="id"
      >
      <input
        v-model="sendFrom"
        class="input w-full"
        placeholder="sender"
      >
      <input
        v-model="sendTo"
        class="input w-full"
        placeholder="receiver"
      >
      <input
        v-model="sendMemo"
        class="input w-full"
        placeholder="memo (optional)"
      >
      <button
        class="btn btn-primary"
        @click="sendNft"
      >
        Send
      </button>
      <div
        v-if="sendError"
        class="text-sm text-red-600"
      >
        {{ sendError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'
import NftItem from '@/orm/models/nft/NftItem'
import NftClass from '@/orm/models/nft/NftClass'
import NftBalance from '@/orm/models/nft/NftBalance'
import NftSupply from '@/orm/models/nft/NftSupply'

const wallet = useWallet()

const itemRepo = useRepo(NftItem)
const classRepo = useRepo(NftClass)
const balRepo = useRepo(NftBalance)
const supplyRepo = useRepo(NftSupply)

// Balance
const balClassId = ref('')
const balOwner = ref('')
const balError = ref('')
const balanceDisplay = ref('0')
const balanceAmount = computed(() => balanceDisplay.value)
async function fetchBalance() {
  balError.value = ''
  try {
    const classId = balClassId.value.trim()
    const owner = balOwner.value.trim()
    if (!classId || !owner) throw new Error('class_id and owner required')
    balClassId.value = classId
    balOwner.value = owner
    const amount = await useAxiosRepo(NftBalance).api().fetchBalance(classId, owner)
    balanceDisplay.value = amount
  } catch (e: any) {
    console.error(e)
    balError.value = e?.message || String(e)
  }
}

// NFT by ID + Owner
const nftClassId = ref('')
const nftId = ref('')
const nftError = ref('')
const nftOwner = computed(() => {
  const r = itemRepo.find([nftClassId.value, nftId.value]) as { owner?: string } | undefined
  return r?.owner || ''
})
async function fetchNft() {
  nftError.value = ''
  try {
    if (!nftClassId.value || !nftId.value) throw new Error('class_id and id required')
    await useAxiosRepo(NftItem).api().fetchNft(nftClassId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    nftError.value = e?.message || String(e)
  }
}
async function fetchOwner() {
  nftError.value = ''
  try {
    if (!nftClassId.value || !nftId.value) throw new Error('class_id and id required')
    await useAxiosRepo(NftItem).api().fetchOwner(nftClassId.value, nftId.value)
  } catch (e: any) {
    console.error(e)
    nftError.value = e?.message || String(e)
  }
}

// Supply
const supplyClassId = ref('')
const supplyError = ref('')
const supplyAmount = computed(() => {
  if (!supplyClassId.value) return '0'
  const r = supplyRepo.find(supplyClassId.value) as { amount?: string } | undefined
  return r?.amount || '0'
})
async function fetchSupply() {
  supplyError.value = ''
  try {
    if (!supplyClassId.value) throw new Error('class_id required')
    await useAxiosRepo(NftSupply).api().fetchSupply(supplyClassId.value)
  } catch (e: any) {
    console.error(e)
    supplyError.value = e?.message || String(e)
  }
}

// NFTs list
const listClassId = ref('')
const listOwner = ref('')
const nftsError = ref('')
const nftsCount = computed(() => itemRepo.all().length)
async function fetchNftsInit() {
  nftsError.value = ''
  try {
    await useAxiosRepo(NftItem)
      .api()
      .fetchNfts({
        class_id: listClassId.value || undefined,
        owner: listOwner.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    nftsError.value = e?.message || String(e)
  }
}

// Classes
const classId = ref('')
const classesError = ref('')
const classesCount = computed(() => classRepo.all().length)
const classesList = computed(() =>
  classRepo.all().map((c: any) => ({ id: c.id, name: c.name, symbol: c.symbol }))
)
const balancesCount = computed(() => balRepo.all().length)
const balancesList = computed(() =>
  balRepo.all().map((b: any) => ({ class_id: b.class_id, owner: b.owner, amount: b.amount }))
)
const suppliesCount = computed(() => supplyRepo.all().length)
const suppliesList = computed(() =>
  supplyRepo.all().map((s: any) => ({ class_id: s.class_id, amount: s.amount }))
)
async function fetchClass() {
  classesError.value = ''
  try {
    if (!classId.value) throw new Error('class_id required')
    await useAxiosRepo(NftClass).api().fetchClass(classId.value)
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}
async function fetchClasses() {
  classesError.value = ''
  try {
    await useAxiosRepo(NftClass).api().fetchClasses({})
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}

// Send
const sendClassId = ref('')
const sendId = ref('')
const sendFrom = ref('')
const sendTo = ref('')
const sendMemo = ref('')
const sendError = ref('')
async function sendNft() {
  sendError.value = ''
  try {
    await useAxiosRepo(NftItem)
      .api()
      .send({
        class_id: sendClassId.value,
        id: sendId.value,
        sender: sendFrom.value,
        receiver: sendTo.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: sendMemo.value || undefined,
        refreshOwners: [
          { class_id: sendClassId.value, owner: sendFrom.value },
          { class_id: sendClassId.value, owner: sendTo.value },
        ],
      })
  } catch (e: any) {
    console.error(e)
    sendError.value = e?.message || String(e)
  }
}

// In-memory list
const nftList = computed(() =>
  itemRepo.all().map((n: any) => ({
    key: `${n.class_id}:${n.id}`,
    class_id: n.class_id,
    id: n.id,
    owner: n.owner,
    uri: n.uri,
  }))
)
</script>
