<template>
  <h2
    id="tx"
    class="text-xl font-semibold"
  >
    Tx
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Tx: By Hash
      </h3>
      <input
        v-model="txHash"
        class="input w-full"
        placeholder="tx hash"
      >
      <button
        class="btn btn-primary"
        @click="loadByHash"
      >
        Fetch
      </button>
      <div class="text-sm mt-2">
        height=<code>{{ one?.height }}</code> code=<code>{{ one?.code }}</code>
      </div>
      <div
        v-if="byHashError"
        class="text-sm text-red-600"
      >
        {{ byHashError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Tx: Search
      </h3>
      <input
        v-model="query"
        class="input w-full"
        placeholder="events or query string"
      >
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="search"
        >
          Search
        </button>
      </div>
      <div
        v-if="searchError"
        class="text-sm text-red-600"
      >
        {{ searchError }}
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li
          v-for="r in all"
          :key="r.hash"
        >
          <span class="font-mono">{{ r.hash }}</span>
          <span class="opacity-70">
            h=<code>{{ r.height }}</code> code=<code>{{ r.code }}</code></span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Tx: Block With Txs
      </h3>
      <input
        v-model="blockHeight"
        class="input w-full"
        placeholder="height"
      >
      <button
        class="btn btn-primary"
        @click="loadBlock"
      >
        Fetch Block
      </button>
      <div class="text-sm">
        count=<code>{{ countInBlock }}</code>
      </div>
      <div
        v-if="blockError"
        class="text-sm text-red-600"
      >
        {{ blockError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import TxRecord from '../../orm/models/tx/TxRecord'

const recordRepo = useRepo(TxRecord)

const all = computed(
  () =>
    recordRepo.all() as unknown as Array<{
      hash: string
      height: string
      code: string
    }>
)
const one = computed(() => (all.value.length ? all.value[0] : undefined))
const countInBlock = computed(() => all.value.length)

const txHash = ref('')
const query = ref('')
const blockHeight = ref('')
const byHashError = ref('')
const searchError = ref('')
// no pagination errors; single-page search
const blockError = ref('')

// Single page: no pagination state

async function loadByHash() {
  byHashError.value = ''
  try {
    await useAxiosRepo(TxRecord).api().fetchByHash(txHash.value)
  } catch (e: any) {
    console.error(e)
    byHashError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}

async function search() {
  searchError.value = ''
  try {
    await useAxiosRepo(TxRecord).api().searchInit({ query: query.value })
  } catch (e: any) {
    console.error(e)
    searchError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}

// loadMore removed (single page)

async function loadBlock() {
  blockError.value = ''
  try {
    await useAxiosRepo(TxRecord).api().fetchBlockWithTxs(blockHeight.value)
  } catch (e: any) {
    console.error(e)
    blockError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}
</script>
