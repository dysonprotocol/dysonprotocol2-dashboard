<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">
      Storage — <code>{{ address }}</code>
    </h2>

    <div class="grid md:grid-cols-1 gap-6">
      <!-- List Form -->
      <section class="space-y-2 p-4 border rounded">
        <h3 class="font-semibold">List</h3>
        <div class="grid md:grid-cols-3 gap-2">
          <input v-model="listOwner" class="input w-full" placeholder="owner (name or address)" />
          <input v-model="prefix" class="input w-full" placeholder="index_prefix (optional)" />
          <input v-model="filter" class="input w-full" placeholder="filter (optional)" />
          <input v-model="extract" class="input w-full" placeholder="extract (optional)" />
          <input v-model="limit" class="input w-full" placeholder="pagination.limit (default 50)" />
          <input v-model="offset" class="input w-full" placeholder="pagination.offset (optional)" />
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
        <div v-if="error" class="text-sm text-red-600">
          {{ error }}
        </div>
      </section>
    </div>

    <!-- Set form removed per request; logic is retained for future use -->

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

    <div class="space-y-2">
      <div class="text-sm opacity-70">Results</div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>owner</th>
              <th>index</th>
              <th>hash</th>
              <th>extract</th>
              <th>height</th>
              <th>timestamp</th>
              <th>data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.owner + ':' + e.index + ':' + (extract || '')">
              <td class="font-mono">{{ e.owner }}</td>
              <td class="font-mono">{{ e.index }}</td>
              <td class="max-w-[16rem] truncate">
                <code>{{ e.hash }}</code>
              </td>
              <td class="font-mono">{{ extract || '' }}</td>
              <td class="font-mono">{{ e.updated_height }}</td>
              <td class="font-mono">{{ e.updated_timestamp }}</td>
              <td class="max-w-[24rem] truncate">
                <code>{{ e.data }}</code>
              </td>
            </tr>
            <tr v-if="entries.length === 0">
              <td colspan="7" class="opacity-70">No entries</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import api from '@/orm/http'
import Storage from '@/orm/models/storage/Storage'
import { useWallet } from '@/composables/useWallet'

const props = defineProps<{ address: string }>()

// List state
const listOwner = ref(props.address)
const prefix = ref('')
const filter = ref('')
const extract = ref('')
const limit = ref('50')
const offset = ref('')
const countTotal = ref(false)
const reverse = ref(false)
const nextKey = ref<string | undefined>(undefined)
const total = ref<string | undefined>(undefined)
const error = ref('')
const entries = ref<StorageRow[]>([])

watch(
  () => props.address,
  (addr) => {
    if (!addr) return
    if (!listOwner.value) listOwner.value = addr
  }
)

async function doList(loadMore: boolean) {
  error.value = ''
  const owner = listOwner.value.trim()
  const index_prefix = prefix.value.trim()
  if (!owner) return
  const qs = new URLSearchParams({ owner })
  if (index_prefix) qs.set('index_prefix', index_prefix)
  if (filter.value) qs.set('filter', filter.value)
  if (extract.value) qs.set('extract', extract.value)
  if (limit.value) qs.set('pagination.limit', limit.value)
  if (countTotal.value) qs.set('pagination.count_total', String(countTotal.value))
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
  await doList(false)
}
function resetList() {
  error.value = ''
  nextKey.value = undefined
  total.value = undefined
  entries.value = []
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
  error.value = ''
  if (!canDelete.value) return
  const indexes = deleteIndexes.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s)
  if (indexes.length === 0) return
  await useAxiosRepo(Storage)
    .api()
    .storageDelete({
      owner: props.address,
      indexes,
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
    })
  deleteIndexes.value = ''
  await search()
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
