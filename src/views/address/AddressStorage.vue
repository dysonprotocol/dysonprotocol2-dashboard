<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">
      Storage — <code>{{ address }}</code>
    </h2>

    <div class="grid md:grid-cols-3 gap-2">
      <input
        v-model="prefix"
        class="input w-full"
        placeholder="index_prefix"
      >
      <input
        v-model="filter"
        class="input w-full"
        placeholder="filter (optional)"
      >
      <input
        v-model="extract"
        class="input w-full"
        placeholder="extract (optional)"
      >
    </div>
    <div class="flex gap-2">
      <button
        class="btn btn-primary btn-sm"
        @click="initList"
      >
        Init
      </button>
      <button
        class="btn btn-sm"
        @click="loadMore"
      >
        Load More
      </button>
    </div>

    <form
      class="grid md:grid-cols-3 gap-2 items-end"
      @submit.prevent="submitSet"
    >
      <div>
        <label class="text-xs">Set index</label>
        <input
          v-model="setIndex"
          class="input w-full"
          placeholder="index"
        >
      </div>
      <div>
        <label class="text-xs">Data</label>
        <input
          v-model="setData"
          class="input w-full"
          placeholder="string data"
        >
      </div>
      <button
        class="btn btn-primary"
        type="submit"
        :disabled="!canSet"
      >
        Set
      </button>
    </form>

    <form
      class="grid md:grid-cols-3 gap-2 items-end"
      @submit.prevent="submitDelete"
    >
      <div>
        <label class="text-xs">Delete indexes (comma-separated)</label>
        <input
          v-model="deleteIndexes"
          class="input w-full"
          placeholder="idx1,idx2"
        >
      </div>
      <div class="text-xs opacity-70">
        Owner: <code>{{ address }}</code>
      </div>
      <button
        class="btn btn-warning"
        type="submit"
        :disabled="!canDelete"
      >
        Delete
      </button>
    </form>

    <div class="text-sm opacity-70">
      count: <code>{{ entries.length }}</code>
    </div>
    <ul class="list-disc pl-6 text-sm">
      <li
        v-for="e in entries"
        :key="e.index + ':' + e.extract"
      >
        <span class="font-mono">{{ e.index }}</span>
        <span class="opacity-70"> — {{ e.data }}</span>
      </li>
      <li
        v-if="entries.length === 0"
        class="opacity-70"
      >
        No entries
      </li>
    </ul>

    <div
      v-if="error"
      class="text-sm text-red-600"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Storage from '@/orm/models/storage/Storage'
import { useWallet } from '@/composables/useWallet'

const props = defineProps<{ address: string }>()

const repo = useRepo(Storage)
const prefix = ref('')
const filter = ref('')
const extract = ref('')
const nextKey = ref<string | undefined>(undefined)
const error = ref('')

const entries = computed<any[]>(() =>
  (repo.all() as any[]).filter((e) => e.owner === props.address)
)

async function doList(loadMore: boolean) {
  error.value = ''
  if (!props.address || !prefix.value.trim()) return
  const res = await useAxiosRepo(Storage)
    .api()
    .storageList({
      owner: props.address,
      index_prefix: prefix.value,
      filter: filter.value || undefined,
      extract: extract.value || undefined,
      next_key: loadMore ? nextKey.value : undefined,
      limit: '50',
    })
  nextKey.value = res.next_key
}

async function initList() {
  await doList(false)
}
async function loadMore() {
  await doList(true)
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
  await initList()
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
  await initList()
}
</script>
