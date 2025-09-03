<template>
  <div class="space-y-4 max-w-xl mx-auto">
    <h2 class="text-lg font-medium">Names: {{ address }}</h2>

    <div>
      <h3 class="font-semibold">Names owned by this address and resolve to this address</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ ownedAndResolvingHere.length }}</code>
      </div>
      <div v-if="ownedAndResolvingHereView.length === 0" class="opacity-70">No names</div>
      <div v-else class="overflow-x-auto mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Valuation</th>
              <th>View details</th>
              <th>Go to dwapp</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nft in ownedAndResolvingHereView" :key="nft.id">
              <td class="font-mono">{{ nft.id }}</td>
              <td>
                <span v-if="formatValuation(nft).label"
                  >{{ formatValuation(nft).amount }} {{ formatValuation(nft).label }}</span
                >
                <span v-else>—</span>
              </td>
              <td>
                <RouterLink :to="{ name: 'NameDetails', params: { name: nft.id } }" class="link"
                  >View details</RouterLink
                >
              </td>
              <td>
                <a
                  :href="`/redirect-to-dwapp/${nft.id}`"
                  class="link inline-flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ nft.id }}
                  <ArrowTopRightOnSquareIcon class="w-4 h-4 inline-block ml-1" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h3 class="font-semibold">Names owned by other addresses and resolving to this address</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ notOwnedResolvingHere.length }}</code>
      </div>
      <div v-if="notOwnedResolvingHereView.length === 0" class="opacity-70">No names</div>
      <div v-else class="overflow-x-auto mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Valuation</th>
              <th>View details</th>
              <th>Go to dwapp</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nft in notOwnedResolvingHereView" :key="nft.id">
              <td class="font-mono">{{ nft.id }}</td>
              <td>
                <span v-if="formatValuation(nft).label"
                  >{{ formatValuation(nft).amount }} {{ formatValuation(nft).label }}</span
                >
                <span v-else>—</span>
              </td>
              <td>
                <RouterLink :to="{ name: 'NameDetails', params: { name: nft.id } }" class="link"
                  >View details</RouterLink
                >
              </td>
              <td>
                <a
                  :href="`/redirect-to-dwapp/${nft.id}`"
                  class="link inline-flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ nft.id }}
                  <ArrowTopRightOnSquareIcon class="w-4 h-4 inline-block ml-1" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h3 class="font-semibold">Names owned by this address resolving to other addresses</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ ownedResolvingElsewhere.length }}</code>
      </div>
      <div v-if="ownedResolvingElsewhereView.length === 0" class="opacity-70">No names</div>
      <div v-else class="overflow-x-auto mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Valuation</th>
              <th>View details</th>
              <th>Go to dwapp</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nft in ownedResolvingElsewhereView" :key="nft.id">
              <td class="font-mono">{{ nft.id }}</td>
              <td>
                <span v-if="formatValuation(nft).label"
                  >{{ formatValuation(nft).amount }} {{ formatValuation(nft).label }}</span
                >
                <span v-else>—</span>
              </td>
              <td>
                <RouterLink :to="{ name: 'NameDetails', params: { name: nft.id } }" class="link"
                  >View details</RouterLink
                >
              </td>
              <td>
                <a
                  :href="`/redirect-to-dwapp/${nft.id}`"
                  class="link inline-flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ nft.id }}
                  <ArrowTopRightOnSquareIcon class="w-4 h-4 inline-block ml-1" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NftItem from '@/orm/models/nft/NftItem'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ address: string }>()

const repo = useRepo(NamesByDestination)
const byDest = computed<any[]>(() =>
  (repo.all() as any[]).filter((r) => r.destination === props.address)
)
const byDestNames = computed<string[]>(() => byDest.value.map((r: any) => String(r?.name || '')))

const itemRepo = useRepo(NftItem)
const ownedNames = computed<string[]>(() =>
  (
    itemRepo
      .all()
      .filter((n: any) => n.class_id === 'nameservice.dys' && n.owner === props.address) as any[]
  ).map((n: any) => String(n.id))
)

const ownedAndResolvingHere = computed<string[]>(() => {
  const ownedSet = new Set(ownedNames.value)
  return byDestNames.value.filter((n) => ownedSet.has(n))
})
const notOwnedResolvingHere = computed<string[]>(() => {
  const ownedSet = new Set(ownedNames.value)
  return byDestNames.value.filter((n) => !ownedSet.has(n))
})
const ownedResolvingElsewhere = computed<string[]>(() => {
  const byDestSet = new Set(byDestNames.value)
  return ownedNames.value.filter((n) => !byDestSet.has(n))
})

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: props.address })
  await useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner: props.address })
  await ensureNotOwnedResolvingHereLoaded()
}

watchEffect(() => {
  if (props.address) void refresh()
})

// ---- Helpers for valuation display ----
function getDisplayInfoForBase(baseDenom: string) {
  if (String(baseDenom || '') === 'udys') return { display: 'dys2', exponent: 6 }
  return { display: String(baseDenom || ''), exponent: 0 }
}

function baseToDisplayFor(amountBase: string, baseDenom: string) {
  const { exponent } = getDisplayInfoForBase(baseDenom)
  const s = String(amountBase || '0')
  const exp = Number(exponent || 0)
  if (exp <= 0) return s
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`.replace(/\.0+$/, '')
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
}

function formatValuation(nft: any) {
  const coin = nft?.data?.valuation || { amount: '0', denom: '' }
  const denom = String(coin?.denom || '')
  if (!denom) return { amount: '0', label: '' }
  const amount = String(coin?.amount || '0')
  const label = getDisplayInfoForBase(denom).display
  return { amount: baseToDisplayFor(amount, denom), label }
}

// ---- Build list and ensure missing NFTs are fetched ----
const nftsView = computed<any[]>(() => {
  const set = new Set<string>([...byDestNames.value, ...ownedNames.value])
  const arr: any[] = []
  for (const id of set) {
    const rec = (itemRepo
      .query()
      .where('class_id', (v: string) => v === 'nameservice.dys')
      .where('id', (v: string) => v === id)
      .first() || { id }) as any
    if (!rec.id) rec.id = id
    arr.push(rec)
  }
  arr.sort((a, b) => {
    const aa = BigInt(a?.data?.valuation?.amount || '0')
    const bb = BigInt(b?.data?.valuation?.amount || '0')
    if (aa === bb) return String(a?.id || '').localeCompare(String(b?.id || ''))
    return aa > bb ? -1 : 1
  })
  return arr
})

function idsToNfts(ids: string[]) {
  const arr: any[] = []
  for (const id of ids) {
    const rec = (itemRepo
      .query()
      .where('class_id', (v: string) => v === 'nameservice.dys')
      .where('id', (v: string) => v === id)
      .first() || { id }) as any
    if (!rec.id) rec.id = id
    arr.push(rec)
  }
  arr.sort((a, b) => {
    const aa = BigInt(a?.data?.valuation?.amount || '0')
    const bb = BigInt(b?.data?.valuation?.amount || '0')
    if (aa === bb) return String(a?.id || '').localeCompare(String(b?.id || ''))
    return aa > bb ? -1 : 1
  })
  return arr
}

const ownedAndResolvingHereView = computed<any[]>(() => idsToNfts(ownedAndResolvingHere.value))
const notOwnedResolvingHereView = computed<any[]>(() => idsToNfts(notOwnedResolvingHere.value))
const ownedResolvingElsewhereView = computed<any[]>(() => idsToNfts(ownedResolvingElsewhere.value))

async function ensureNotOwnedResolvingHereLoaded() {
  const repo = useRepo(NftItem)
  const missing: string[] = []
  for (const id of notOwnedResolvingHere.value) {
    const rec = repo
      .query()
      .where('class_id', (v: string) => v === 'nameservice.dys')
      .where('id', (v: string) => v === id)
      .first()
    if (!rec) missing.push(id)
  }
  if (missing.length === 0) return
  const api = useAxiosRepo(NftItem).api()
  await Promise.all(missing.map((id) => api.fetchNft('nameservice.dys', id)))
}
</script>
