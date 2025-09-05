<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">
      Storage — <code>{{ address }}</code>
    </h2>

    <div class="grid md:grid-cols-2 gap-6 items-start">
      <!-- Left: Search + Table -->
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Filter and paginate storage entries</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid md:grid-cols-1 gap-2">
            <input
              :value="address"
              class="input w-full"
              placeholder="owner (name or address)"
              disabled
            />
            <input v-model="prefix" class="input w-full" placeholder="index_prefix (optional)" />
            <input v-model="filter" class="input w-full" placeholder="filter (optional)" />
            <input v-model="extract" class="input w-full" placeholder="extract (optional)" />
            <input v-model="limit" class="input w-full" placeholder="page size (default 50)" />
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="countTotal" />
              count_total
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="reverse" />
              reverse
            </label>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" @click="search">Search</button>
            <button class="btn btn-ghost btn-sm" @click="resetList">Reset</button>
          </div>
          <div v-if="listError" class="text-sm text-red-600">{{ listError }}</div>
          <div class="text-xs opacity-70 grid grid-cols-3 gap-x-4">
            <div>
              count=<code>{{ entries.length }}</code>
            </div>
            <div>
              total=<code>{{ total || '' }}</code>
            </div>
            <div>
              next_key=<code class="break-all">{{ nextKey || '' }}</code>
            </div>
          </div>

          <form class="grid md:grid-cols-3 gap-2 items-end" @submit.prevent="submitDelete">
            <div>
              <label class="text-xs">Delete indexes (comma-separated)</label>
              <input v-model="deleteIndexes" class="input w-full" placeholder="idx1,idx2" />
            </div>
            <div class="text-xs opacity-70">
              Owner: <code>{{ address }}</code>
            </div>
            <button class="btn btn-warning" type="submit" :disabled="!canDelete">Delete</button>
          </form>
          <div v-if="deleteError" class="text-xs text-red-600">{{ deleteError }}</div>

          <div class="space-y-2">
            <div class="text-sm opacity-70">Results</div>
            <div class="overflow-x-auto">
              <div class="mb-2">
                <Pagination
                  v-slot="{ page }"
                  :items-per-page="limitNum"
                  :total="totalNum"
                  :default-page="currentPage"
                >
                  <PaginationContent v-slot="{ items }">
                    <PaginationPrevious @click="prevPage" />

                    <template v-for="(item, index) in items" :key="index">
                      <PaginationItem
                        v-if="item.type === 'page'"
                        :value="item.value"
                        :is-active="item.value === page"
                        @click="goToPage(item.value)"
                      >
                        {{ item.value }}
                      </PaginationItem>
                    </template>

                    <PaginationNext @click="nextPage" />
                  </PaginationContent>
                </Pagination>
              </div>
              <Table class="table table-xs w-full">
                <TableCaption>Storage entries</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>index</TableHead>
                    <TableHead>hash</TableHead>
                    <TableHead>height</TableHead>
                    <TableHead>timestamp</TableHead>
                    <TableHead>data</TableHead>
                    <TableHead>actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="e in entries"
                    :key="e.owner + ':' + e.index"
                    class="cursor-pointer"
                    @click="select(e)"
                  >
                    <TableCell class="font-mono">{{ e.index }}</TableCell>
                    <TableCell class="max-w-[16rem] truncate"
                      ><code>{{ e.hash }}</code></TableCell
                    >
                    <TableCell class="font-mono">{{ e.updated_height }}</TableCell>
                    <TableCell class="font-mono">{{ e.updated_timestamp }}</TableCell>
                    <TableCell class="max-w-[24rem] truncate"
                      ><code>{{ e.data }}</code></TableCell
                    >
                    <TableCell>
                      <button
                        class="btn btn-warning btn-xs"
                        :disabled="deletingIndex === e.index"
                        @click.stop="deleteRow(e)"
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="entries.length === 0">
                    <TableCell colspan="6" class="opacity-70">No entries</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Right: Edit only -->
      <Card>
        <CardHeader>
          <CardTitle>storage detail</CardTitle>
          <CardDescription>Full original data</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-if="editError" class="text-xs text-red-600">{{ editError }}</div>

          <!-- Signer selection (direct or via authz) -->
          <div>
            <label class="text-xs">Signer</label>
            <div class="mt-1">
              <WalletSelector
                v-model="selectedExecutor"
                :show-locked="true"
                :allowed-addresses="[props.address]"
                :default-address="props.address"
                :default-grantee="selectedGranteeAddress"
                :button-class="''"
                :msg-type-filter="msgTypeFilter"
                @update:executor-address="onExecutorAddress"
                @update:grantee-address="onGranteeAddress"
                @update:is-authz="onIsAuthz"
                @update:authz-notes="onAuthzNotes"
                @update:selected-grant="onSelectedGrant"
              />
              <div v-if="isAuthz" class="mt-2 text-xs opacity-80 break-all">
                <div v-if="authzNotes">Note: {{ authzNotes }}</div>
                <div v-if="selectedGrant">
                  <div>
                    Authz: <code>{{ selectedGrant.type_url }}</code>
                    <span v-if="selectedGrant.expiration" class="ml-2"
                      >exp: {{ selectedGrant.expiration }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <label class="text-xs">index</label>
              <input v-model="editIndex" class="input w-full" placeholder="index (e.g. user/123)" />
            </div>
            <button
              class="btn btn-ghost"
              :disabled="!canSaveEdit || isFetchingFull"
              @click="getCurrent"
            >
              Get
            </button>
            <button class="btn btn-primary" :disabled="!canSaveEdit" @click="saveEdit">Set</button>
            <button
              class="btn btn-warning"
              :disabled="!canSaveEdit || deletingIndex === editIndex"
              @click="deleteCurrentIndex"
            >
              Delete
            </button>
          </div>
          <textarea
            ref="fullDataTextarea"
            v-model="fullData"
            class="textarea w-full min-h-64 resize-none autosize-textarea"
            :disabled="isFetchingFull"
            placeholder="Select a row to load its original data"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useAxiosRepo } from '@pinia-orm/axios'
import api from '@/orm/http'
import Storage from '@/orm/models/storage/Storage'
import { useWallet } from '@/composables/useWallet'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import WalletSelector from '@/components/shared/WalletSelector.vue'

const props = defineProps<{ address: string }>()

// List state
const listOwner = ref(props.address)
const prefix = ref('')
const filter = ref('')
const extract = ref('')
const limit = ref('50')
const offset = ref('')
const countTotal = ref(true)
const reverse = ref(false)
const nextKey = ref<string | undefined>(undefined)
const total = ref<string | undefined>(undefined)
const error = ref('')
const listError = ref('')
const deleteError = ref('')
const entries = ref<StorageRow[]>([])
const selected = ref<StorageRow | null>(null)
const isFetchingFull = ref(false)
const fullData = ref('')
const editError = ref('')
const canSaveEdit = computed(() => Boolean(props.address && editIndex.value.trim()))
const editIndex = ref('')
const deletingIndex = ref<string | null>(null)

// Autosize for full data textarea
const { textarea: fullDataTextarea, triggerResize } = useTextareaAutosize({
  input: fullData,
  styleProp: 'minHeight',
})

const limitNum = computed(() => {
  const n = Number(limit.value || '50')
  return Number.isFinite(n) && n > 0 ? n : 50
})
const totalNum = computed(() => Number(total.value || 0))
const currentPage = computed(() => {
  const off = Number(offset.value || '0')
  const n = limitNum.value
  if (!n) return 1
  return Math.floor(off / n) + 1
})

watch(
  () => props.address,
  (addr) => {
    if (!addr) return
    listOwner.value = addr
    offset.value = ''
    void search()
  }
)

onMounted(() => {
  if (!props.address) return
  void search()
})

async function doList(loadMore: boolean) {
  listError.value = ''
  const owner = listOwner.value.trim()
  const index_prefix = prefix.value.trim()
  if (!owner) return
  const qs = new URLSearchParams({ owner })
  if (index_prefix) qs.set('index_prefix', index_prefix)
  if (filter.value) qs.set('filter', filter.value)
  if (extract.value) qs.set('extract', extract.value)
  if (limit.value) qs.set('pagination.limit', limit.value)
  if (countTotal.value) qs.set('pagination.count_total', 'true')
  if (reverse.value) qs.set('pagination.reverse', String(reverse.value))
  if (loadMore && nextKey.value) qs.set('pagination.key', nextKey.value)
  else if (offset.value) qs.set('pagination.offset', offset.value)

  const { data } = await api.get(`/dysonprotocol/storage/v1/storage_list?${qs}`)
  const list: Array<Partial<StorageRow>> = Array.isArray(data?.entries) ? data.entries : []
  const normalized: StorageRow[] = list
    .filter((e) => (e as any)?.owner && (e as any)?.index)
    .map((e) => ({
      owner: String((e as any).owner),
      index: String((e as any).index),
      data: String((e as any).data || ''),
      updated_height: String((e as any).updated_height ?? '0'),
      updated_timestamp: String((e as any).updated_timestamp || ''),
      hash: String((e as any).hash || ''),
    }))
  const newNextKey = data?.pagination?.next_key || ''
  nextKey.value = newNextKey || undefined
  const tot = data?.pagination?.total
  total.value = typeof tot === 'number' ? String(tot) : tot
  entries.value = loadMore ? entries.value.concat(normalized) : normalized
}

async function search() {
  try {
    await doList(false)
  } catch (e) {
    console.error('search failed', e)
    listError.value = (e as any)?.message || 'Failed to search'
  }
}
function resetList() {
  listError.value = ''
  nextKey.value = undefined
  total.value = undefined
  entries.value = []
}

function goToPage(p: number) {
  const pageNum = Number(p)
  const n = limitNum.value
  if (!Number.isFinite(pageNum) || pageNum < 1 || !n) return
  offset.value = String((pageNum - 1) * n)
  void search()
}

function prevPage() {
  if (currentPage.value > 1) goToPage(currentPage.value - 1)
}

function nextPage() {
  const n = limitNum.value
  const t = totalNum.value
  if (!n || !t) return
  const maxPage = Math.max(1, Math.ceil(t / n))
  if (currentPage.value < maxPage) goToPage(currentPage.value + 1)
}

function select(e: StorageRow) {
  selected.value = e
  editIndex.value = e.index
  void fetchFull(e.owner, e.index)
}

async function fetchFull(owner: string, index: string) {
  editError.value = ''
  fullData.value = ''
  isFetchingFull.value = true
  try {
    const { data } = await api.get(
      `/dysonprotocol/storage/v1/storage_get?${new URLSearchParams({ owner, index })}`
    )
    fullData.value = String(data?.entry?.data || '')
    // Ensure resize after programmatic content update
    triggerResize()
  } catch (e) {
    editError.value = (e as any)?.message || 'Failed to fetch full data'
  } finally {
    isFetchingFull.value = false
  }
}

// removed onEditTabClick: always edit mode

async function saveEdit() {
  editError.value = ''
  if (!editIndex.value.trim()) return
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageSet({
        owner: props.address,
        index: editIndex.value,
        data: fullData.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        grantee:
          isAuthz.value && selectedGranteeAddress.value ? selectedGranteeAddress.value : undefined,
      })
    await search()
  } catch (e) {
    console.error('saveEdit storageSet failed', e)
    editError.value = (e as any)?.message || 'Failed to save storage'
    throw e
  }
}

async function getCurrent() {
  editError.value = ''
  if (!props.address || !editIndex.value.trim()) return
  await fetchFull(props.address, editIndex.value)
}

async function deleteCurrentIndex() {
  deleteError.value = ''
  if (!props.address || !editIndex.value.trim()) return
  const ok = globalThis.confirm ? globalThis.confirm(`Delete index "${editIndex.value}"?`) : true
  if (!ok) return
  if (deletingIndex.value) return
  deletingIndex.value = editIndex.value
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageDelete({
        owner: props.address,
        indexes: [editIndex.value],
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        grantee:
          isAuthz.value && selectedGranteeAddress.value ? selectedGranteeAddress.value : undefined,
      })
    await search()
    fullData.value = ''
  } catch (e) {
    console.error('delete current failed', e)
    deleteError.value = (e as any)?.message || 'Failed to delete index'
  } finally {
    deletingIndex.value = null
  }
}

// Set/Delete
const wallet = useWallet()
const setIndex = ref('')
const setData = ref('')
const deleteIndexes = ref('')

const canSet = computed(() => Boolean(props.address && setIndex.value && setData.value))
const canDelete = computed(() => Boolean(props.address && deleteIndexes.value.trim()))

async function submitSet() {
  error.value = ''
  if (!canSet.value) return
  await useAxiosRepo(Storage)
    .api()
    .storageSet({
      owner: props.address,
      index: setIndex.value,
      data: setData.value,
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
    })
  setIndex.value = ''
  setData.value = ''
  await search()
}

async function submitDelete() {
  deleteError.value = ''
  if (!canDelete.value) return
  const indexes = deleteIndexes.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s)
  if (indexes.length === 0) return
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageDelete({
        owner: props.address,
        indexes,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        grantee:
          isAuthz.value && selectedGranteeAddress.value ? selectedGranteeAddress.value : undefined,
      })
  } catch (e) {
    console.error('delete failed', e)
    deleteError.value = (e as any)?.message || 'Failed to delete indexes'
    return
  }
  deleteIndexes.value = ''
  await search()
}

async function deleteRow(e: StorageRow) {
  deleteError.value = ''
  if (!e?.index) return
  if (deletingIndex.value) return
  const ok = globalThis.confirm ? globalThis.confirm(`Delete index "${e.index}"?`) : true
  if (!ok) return
  deletingIndex.value = e.index
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageDelete({
        owner: props.address,
        indexes: [e.index],
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        grantee:
          isAuthz.value && selectedGranteeAddress.value ? selectedGranteeAddress.value : undefined,
      })
    await search()
  } catch (err) {
    console.error('row delete failed', err)
    deleteError.value = (err as any)?.message || `Failed to delete index ${e.index}`
  } finally {
    deletingIndex.value = null
  }
}

// Authz selection state
const selectedExecutor = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)
const authzNotes = ref('')
const selectedGrant = ref<any>(null)

// Filter for storage set msg
function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }
  if (grant?.granter !== props.address) return { valid: false, notes: 'Different granter' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.storage.v1.MsgStorageSet'
    return { valid: ok, notes: ok ? 'Generic MsgStorageSet' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

function onExecutorAddress(addr: string) {
  selectedExecutor.value = addr || ''
}
function onGranteeAddress(addr: string | null) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}
function onAuthzNotes(n: string) {
  authzNotes.value = n || ''
}
function onSelectedGrant(g: any) {
  selectedGrant.value = g || null
}

interface StorageRow {
  owner: string
  index: string
  data: string
  updated_height: string
  updated_timestamp: string
  hash: string
}

// Expose retained logic for future integration
defineExpose({ submitSet })
</script>

<style scoped>
.autosize-textarea {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.autosize-textarea::-webkit-scrollbar {
  display: none;
}
</style>
