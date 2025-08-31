<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold">
      TanStack DB-style Demo
    </h1>

    <form
      class="grid gap-3 max-w-2xl"
      @submit.prevent
    >
      <label class="grid gap-1">
        <span class="text-sm opacity-70">Owner address</span>
        <input
          v-model.trim="address"
          type="text"
          class="input input-bordered"
          placeholder="dys2..."
        >
      </label>

      <div class="text-sm opacity-70">
        REST Base: {{ apiBase }}
      </div>

      <div class="flex items-center gap-2">
        <button
          class="btn btn-primary"
          :disabled="isAnyLoading"
          @click="refetchAll"
        >
          Query
        </button>
        <span
          v-if="isAnyLoading"
          class="loading loading-spinner loading-sm"
        />
        <span
          v-if="isAnyError"
          class="text-error"
        >Error</span>
      </div>
    </form>

    <div class="grid gap-6 md:grid-cols-2">
      <section class="space-y-2">
        <h2 class="font-semibold">
          Bank denoms
        </h2>
        <div class="text-xs opacity-70">
          {{ balancesUrl }}
        </div>
        <div
          v-if="balancesLoading"
          class="text-sm opacity-70"
        >
          Loading balances…
        </div>
        <div
          v-else-if="balancesError"
          class="text-error text-sm"
        >
          {{ balancesErrorMessage }}
        </div>
        <div v-else>
          <div
            v-if="balanceTable.getRowModel().rows.length === 0"
            class="p-3 text-sm opacity-70 border rounded"
          >
            No balances
          </div>
          <div
            v-else
            class="overflow-x-auto rounded border"
          >
            <table class="table w-full">
              <thead>
                <tr
                  v-for="headerGroup in balanceTable.getHeaderGroups()"
                  :key="headerGroup.id"
                >
                  <th
                    v-for="header in headerGroup.headers"
                    :key="header.id"
                    :colSpan="header.colSpan"
                    class="px-3 py-2 text-left border-b"
                  >
                    <FlexRender
                      v-if="!header.isPlaceholder"
                      :render="header.column.columnDef.header"
                      :props="header.getContext()"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in balanceTable.getRowModel().rows"
                  :key="row.id"
                  class="hover"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                    class="px-3 py-2 border-b"
                  >
                    <FlexRender
                      :render="cell.column.columnDef.cell"
                      :props="cell.getContext()"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="space-y-2">
        <h2 class="font-semibold">
          Owned NFTs
        </h2>
        <div class="text-xs opacity-70">
          {{ nftsUrl }}
        </div>
        <div
          v-if="nftsLoading"
          class="text-sm opacity-70"
        >
          Loading NFTs…
        </div>
        <div
          v-else-if="nftsError"
          class="text-error text-sm"
        >
          {{ nftsErrorMessage }}
        </div>
        <div v-else>
          <div
            v-if="nftTable.getRowModel().rows.length === 0"
            class="p-3 text-sm opacity-70 border rounded"
          >
            No NFTs
          </div>
          <div
            v-else
            class="overflow-x-auto rounded border"
          >
            <table class="table w-full">
              <thead>
                <tr
                  v-for="headerGroup in nftTable.getHeaderGroups()"
                  :key="headerGroup.id"
                >
                  <th
                    v-for="header in headerGroup.headers"
                    :key="header.id"
                    :colSpan="header.colSpan"
                    class="px-3 py-2 text-left border-b"
                  >
                    <FlexRender
                      v-if="!header.isPlaceholder"
                      :render="header.column.columnDef.header"
                      :props="header.getContext()"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in nftTable.getRowModel().rows"
                  :key="row.id"
                  class="hover"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                    class="px-3 py-2 border-b"
                  >
                    <FlexRender
                      :render="cell.column.columnDef.cell"
                      :props="cell.getContext()"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <details
      v-if="isAnyError"
      class="border rounded p-3"
    >
      <summary class="cursor-pointer select-none">
        Errors
      </summary>
      <pre class="p-3 rounded border border-error text-error overflow-auto max-h-[40vh]"><code>{{
        `balances: ${balancesErrorMessage || 'ok'}\n` +
          `nfts: ${nftsErrorMessage || 'ok'}`
      }}</code></pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useStorage } from '@vueuse/core'
import { useRestLiveCollection } from '@/composables/useRestLiveCollection'
import { gt } from '@tanstack/db'
import axios from 'axios'
import { FlexRender, getCoreRowModel, useVueTable, createColumnHelper } from '@tanstack/vue-table'

const apiBase = computed(() =>
  typeof window !== 'undefined' && typeof window.resolveRestUrl === 'function'
    ? window.resolveRestUrl()
    : ''
)

const address = useStorage('demoTanDb.address', '')
const enabled = computed(() => Boolean(apiBase.value && String(address.value).trim()))

// Balances via useRestLiveCollection + live query

const balances = useRestLiveCollection<BalancesResponse, Coin, string>({
  id: 'balances',
  pathTemplate: '/cosmos/bank/v1beta1/balances/{address}',
  params: computed(() => ({ address: address.value, 'pagination.limit': 1000 })),
  apiBase,
  enabled,
  selectItems: (raw) => raw?.balances ?? [],
  getKey: (c) => c.denom,
})

const balancesLive = balances.useQuery((q) =>
  q
    .from({ bal: balances.collection.value })
    .where(({ bal }) => gt(bal.amount, '0'))
    .select(({ bal }) => ({ denom: bal.denom, amount: bal.amount }))
)

// NFTs via useRestLiveCollection + live query
const nftsCol = useRestLiveCollection<NftsResponse, NftItem, string>({
  id: 'nfts',
  pathTemplate: '/dysonprotocol/nft/v1beta1/nfts',
  params: computed(() => ({ owner: address.value, 'pagination.limit': 200 })),
  apiBase,
  enabled,
  selectItems: (raw) => raw?.nfts ?? [],
  getKey: (n) => `${n.class_id}:${n.id}`,
})

const nftsLive = nftsCol.useQuery((q) => q.from({ n: nftsCol.collection.value }))

// Denom metadata via useRestLiveCollection
const denomsMeta = useRestLiveCollection<DenomsMetadataResponse, Metadata, string>({
  id: 'denoms-metadata',
  pathTemplate: '/cosmos/bank/v1beta1/denoms_metadata',
  params: computed(() => ({ 'pagination.limit': 1000 })),
  apiBase,
  enabled: computed(() => Boolean(apiBase.value)),
  selectItems: (raw) => raw?.metadatas ?? [],
  getKey: (m) => String(m.base || ''),
})

const denoms = computed(() => balancesLive.data.value ?? [])

const nfts = computed(() => (nftsLive.data.value ?? []).filter((n) => n?.class_id && n?.id))

const denomToDisplay = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  const arr = denomsMeta.resource.data.value?.metadatas ?? []
  for (const md of arr) {
    const base = String(md?.base || '')
    if (!base) continue
    const display = String(md?.display || '')
    map[base] = display || base
  }
  return map
})
function displayDenomFor(base: string): string {
  return denomToDisplay.value[base] || base
}

// Balances table
interface BalanceRow {
  denom: string
  amount: string
}
const balColHelper = createColumnHelper<BalanceRow>()
const balanceColumns = [
  balColHelper.accessor('denom', {
    header: () => 'Denom',
    cell: (info) => displayDenomFor(info.getValue()),
  }),
  balColHelper.accessor((row) => row.denom, {
    id: 'baseDenom',
    header: () => 'Base denom',
    cell: (info) => {
      const base = info.getValue()
      const disp = displayDenomFor(base)
      return disp !== base ? base : ''
    },
  }),
  balColHelper.accessor('amount', {
    header: () => 'Amount',
    cell: (info) => info.getValue(),
  }),
]
const balanceTable = useVueTable({
  get data() {
    return denoms.value as BalanceRow[]
  },
  columns: balanceColumns,
  getCoreRowModel: getCoreRowModel(),
})

// NFTs table
const nftColHelper = createColumnHelper<NftItem>()
const nftColumns = [
  nftColHelper.accessor('class_id', {
    header: () => 'Class',
    cell: (info) => info.getValue(),
  }),
  nftColHelper.accessor('id', {
    header: () => 'ID',
    cell: (info) => info.getValue(),
  }),
]
const nftTable = useVueTable({
  get data() {
    return nfts.value as NftItem[]
  },
  columns: nftColumns,
  getCoreRowModel: getCoreRowModel(),
})

const balancesLoading = computed(() => balancesLive.isLoading.value)
const balancesError = computed(() => balances.resource.isError.value)
const balancesReason = computed(() => balances.resource.failureReason.value)
const balancesUrl = computed(() => balances.resource.url.value)
const refetchBalances = () => balances.resource.refetch()
const balancesErrorMessage = computed(() => {
  if (!balancesError.value) return ''
  const e = balancesReason?.value as any
  return e?.message || 'Failed to load balances'
})
const nftsLoading = computed(() => nftsLive.isLoading.value)
const nftsError = computed(() => nftsCol.resource.isError.value)
const nftsReason = computed(() => nftsCol.resource.failureReason.value)
const nftsUrl = computed(() => nftsCol.resource.url.value)
const refetchNfts = () => nftsCol.resource.refetch()
const nftsErrorMessage = computed(() => {
  if (!nftsError.value) return ''
  const e = nftsReason?.value as any
  return e?.message || 'Failed to load NFTs'
})

const isAnyLoading = computed(() => balancesLoading.value || nftsLoading.value)
const isAnyError = computed(() => balancesError.value || nftsError.value)

// URLs come from useRestResource

function refetchAll() {
  refetchBalances()
  refetchNfts()
}

// helpers

interface Coin {
  denom: string
  amount: string
}

interface BalancesResponse {
  balances?: Coin[]
}

interface DenomUnit {
  denom: string
  exponent?: number
  aliases?: string[]
}

interface Metadata {
  description?: string
  base?: string
  display?: string
  name?: string
  symbol?: string
  denom_units?: DenomUnit[]
}

interface DenomsMetadataResponse {
  metadatas?: Metadata[]
}

interface NftItem {
  class_id: string
  id: string
  uri?: string
  data?: unknown
}

interface NftsResponse {
  nfts?: NftItem[]
  pagination?: { next_key?: string }
}
</script>

<style scoped></style>
