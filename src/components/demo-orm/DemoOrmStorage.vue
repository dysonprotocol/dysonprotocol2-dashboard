<template>
  <h2
    id="storage"
    class="text-xl font-semibold"
  >
    Storage
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">
        Queries
      </h3>
      <div class="space-y-2">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Get
          </h4>
          <input
            v-model="getOwner"
            class="input w-full"
            placeholder="owner (name or address)"
          >
          <input
            v-model="getIndex"
            class="input w-full"
            placeholder="index"
          >
          <input
            v-model="getExtract"
            class="input w-full"
            placeholder="extract (optional)"
          >
          <button
            class="btn btn-primary"
            @click="storageGet"
          >
            Fetch
          </button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              hash=<code>{{ lastHash }}</code>
            </div>
            <div>
              height=<code>{{ lastHeight }}</code>
            </div>
          </div>
          <div
            v-if="getError"
            class="text-sm text-red-600"
          >
            {{ getError }}
          </div>
          <div
            v-if="getErrorData"
            class="text-xs opacity-70"
          >
            <code class="break-words">{{ getErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            List
          </h4>
          <input
            v-model="listOwner"
            class="input w-full"
            placeholder="owner (name or address)"
          >
          <input
            v-model="listPrefix"
            class="input w-full"
            placeholder="index_prefix"
          >
          <input
            v-model="listFilter"
            class="input w-full"
            placeholder="filter (optional)"
          >
          <input
            v-model="listExtract"
            class="input w-full"
            placeholder="extract (optional)"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="storageListInit"
            >
              Init
            </button>
            <button
              class="btn"
              @click="storageListMore"
            >
              Load More
            </button>
          </div>
          <div class="text-sm">
            count=<code>{{ entriesCount }}</code>
          </div>
          <div
            v-if="listError"
            class="text-sm text-red-600"
          >
            {{ listError }}
          </div>
          <div
            v-if="listErrorData"
            class="text-xs opacity-70"
          >
            <code class="break-words">{{ listErrorData }}</code>
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
              max_size=<code>{{ params.max_storage_size }}</code>
            </div>
            <div>
              stake_mult=<code>{{ params.storage_stake_multiple }}</code>
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
            Metrics
          </h4>
          <input
            v-model="metricsOwner"
            class="input w-full"
            placeholder="owner (name or address)"
          >
          <button
            class="btn btn-primary"
            @click="fetchMetrics"
          >
            Fetch
          </button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              total_bytes=<code>{{ metrics.total_bytes }}</code>
            </div>
            <div>
              min_stake=<code>{{ metrics.min_stake_amount }}</code>
            </div>
          </div>
          <div
            v-if="metricsError"
            class="text-sm text-red-600"
          >
            {{ metricsError }}
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
          Set
        </h4>
        <input
          v-model="setOwner"
          class="input w-full"
          placeholder="owner"
        >
        <input
          v-model="setIndex"
          class="input w-full"
          placeholder="index"
        >
        <textarea
          v-model="setData"
          class="textarea w-full"
          rows="6"
          placeholder="data"
        />
        <input
          v-model="setMemo"
          class="input w-full"
          placeholder="memo (optional)"
        >
        <button
          class="btn btn-primary"
          @click="storageSet"
        >
          Set
        </button>
        <div
          v-if="setError"
          class="text-sm text-red-600"
        >
          {{ setError }}
        </div>
        <div
          v-if="setErrorData"
          class="text-xs opacity-70"
        >
          <code class="break-words">{{ setErrorData }}</code>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">
          Delete
        </h4>
        <input
          v-model="delOwner"
          class="input w-full"
          placeholder="owner"
        >
        <input
          v-model="delIndexes"
          class="input w-full"
          placeholder="indexes (comma separated)"
        >
        <input
          v-model="delMemo"
          class="input w-full"
          placeholder="memo (optional)"
        >
        <button
          class="btn btn-primary"
          @click="storageDelete"
        >
          Delete
        </button>
        <div
          v-if="delError"
          class="text-sm text-red-600"
        >
          {{ delError }}
        </div>
        <div
          v-if="delErrorData"
          class="text-xs opacity-70"
        >
          <code class="break-words">{{ delErrorData }}</code>
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded col-span-3">
      <h3 class="font-semibold">
        In-memory
      </h3>
      <div class="text-sm opacity-70">
        count: <code>{{ entriesCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>owner</th>
              <th>index</th>
              <th>hash</th>
              <th>extract</th>
              <th>data</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in entriesList"
              :key="e.owner + ':' + e.index + ':' + e.extract"
            >
              <td class="font-mono">
                {{ e.owner }}
              </td>
              <td class="font-mono">
                {{ e.index }}
              </td>
              <td class="max-w-[24rem] truncate">
                <code>{{ e.hash }}</code>
              </td>
              <td class="font-mono">
                {{ e.extract }}
              </td>
              <td class="max-w-[24rem] truncate">
                <code>{{ e.data }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'
import Storage from '@/orm/models/storage/Storage'
import StorageParams from '@/orm/models/storage/StorageParams'
import StorageMetrics from '@/orm/models/storage/StorageMetrics'

const wallet = useWallet()

const storageRepo = useRepo(Storage)
const paramsRepo = useRepo(StorageParams)
const metricsRepo = useRepo(StorageMetrics)

// Get
const getOwner = ref('')
const getIndex = ref('')
const getExtract = ref('')
const getError = ref('')
const getErrorData = ref('')
const lastHash = computed(
  () => (storageRepo.find([getOwner.value, getIndex.value]) as any)?.hash || ''
)
const lastHeight = computed(
  () => (storageRepo.find([getOwner.value, getIndex.value]) as any)?.updated_height || ''
)
async function storageGet() {
  getError.value = ''
  getErrorData.value = ''
  try {
    const owner = getOwner.value.trim()
    const index = getIndex.value.trim()
    if (!owner || !index) throw new Error('owner and index required')
    await useAxiosRepo(Storage)
      .api()
      .storageGet({ owner, index, extract: getExtract.value.trim() || undefined })
  } catch (e: any) {
    console.error(e)
    getError.value = e?.message || String(e)
    getErrorData.value = formatErrorData(e)
  }
}

// List
const listOwner = ref('')
const listPrefix = ref('')
const listFilter = ref('')
const listExtract = ref('')
const listError = ref('')
const listErrorData = ref('')
let nextKey: string | undefined
async function storageList(loadMore = false) {
  listError.value = ''
  listErrorData.value = ''
  try {
    const owner = listOwner.value.trim()
    const index_prefix = listPrefix.value.trim()
    if (!owner || !index_prefix) throw new Error('owner and index_prefix required')
    const res = await useAxiosRepo(Storage)
      .api()
      .storageList({
        owner,
        index_prefix,
        filter: listFilter.value || undefined,
        extract: listExtract.value || undefined,
        next_key: loadMore ? nextKey : undefined,
        limit: '50',
      })
    nextKey = res.next_key
  } catch (e: any) {
    console.error(e)
    listError.value = e?.message || String(e)
    listErrorData.value = formatErrorData(e)
  }
}
async function storageListInit() {
  await storageList(false)
}
async function storageListMore() {
  await storageList(true)
}

// Params
const paramsError = ref('')
const params = computed(
  () => (paramsRepo.find('default') as any) || { max_storage_size: '', storage_stake_multiple: '' }
)
async function fetchParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(StorageParams).api().fetch()
  } catch (e: any) {
    console.error(e)
    paramsError.value = e?.message || String(e)
  }
}

// Metrics
const metricsOwner = ref('')
const metricsError = ref('')
const metrics = computed(
  () =>
    (metricsRepo.find(metricsOwner.value.trim()) as any) || {
      total_bytes: '',
      min_stake_amount: '',
    }
)
async function fetchMetrics() {
  metricsError.value = ''
  try {
    const owner = metricsOwner.value.trim()
    if (!owner) throw new Error('owner required')
    await useAxiosRepo(StorageMetrics).api().fetch(owner)
  } catch (e: any) {
    console.error(e)
    metricsError.value = e?.message || String(e)
  }
}

// Actions
const setOwner = ref('')
const setIndex = ref('')
const setData = ref('')
const setMemo = ref('')
const setError = ref('')
const setErrorData = ref('')
async function storageSet() {
  setError.value = ''
  setErrorData.value = ''
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageSet({
        owner: setOwner.value,
        index: setIndex.value,
        data: setData.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: setMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    setError.value = e?.message || String(e)
    setErrorData.value = formatErrorData(e)
  }
}

const delOwner = ref('')
const delIndexes = ref('')
const delMemo = ref('')
const delError = ref('')
const delErrorData = ref('')
async function storageDelete() {
  delError.value = ''
  delErrorData.value = ''
  try {
    const indexes = delIndexes.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    await useAxiosRepo(Storage)
      .api()
      .storageDelete({
        owner: delOwner.value,
        indexes,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: delMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    delError.value = e?.message || String(e)
    delErrorData.value = formatErrorData(e)
  }
}

// In-memory
const entriesCount = computed(() => storageRepo.all().length)
const entriesList = computed(() =>
  storageRepo.all().map((e: any) => ({
    owner: e.owner,
    index: e.index,
    extract: e.extract,
    data: e.data,
    hash: e.hash,
  }))
)

function formatErrorData(e: any): string {
  try {
    const raw = e?.response?.data ?? e?.data ?? e
    return typeof raw === 'string' ? raw : JSON.stringify(raw)
  } catch {
    return String(e)
  }
}
</script>
