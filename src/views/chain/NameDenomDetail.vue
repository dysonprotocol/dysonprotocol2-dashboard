<template>
  <div class="space-y-4 w-full mx-auto md:w-1/2">
    <div class="flex items-baseline justify-between gap-2">
      <h1 class="text-2xl font-semibold">
        Denom: <span class="font-mono">{{ routeDenom }}</span>
      </h1>
      <RouterLink
        :to="{ name: 'NameDetails', params: { name: routeName } }"
        class="link link-primary text-sm"
      >
        ← Back to <span class="font-mono">{{ routeName }}</span>
      </RouterLink>
    </div>

    <div class="rounded-box p-4 w-full">
      <div class="font-medium mb-2">Metadata</div>
      <div v-if="isLoadingMetadata" class="opacity-70">Loading…</div>
      <div v-else-if="metadataError" class="text-error">{{ metadataError }}</div>
      <table v-else class="table table-sm">
        <tbody>
          <tr>
            <th>Base</th>
            <td class="font-mono">{{ metadata?.base || '—' }}</td>
          </tr>
          <tr>
            <th>Display</th>
            <td class="font-mono">{{ metadata?.display || '—' }}</td>
          </tr>
          <tr>
            <th>Name</th>
            <td>{{ metadata?.name || '—' }}</td>
          </tr>
          <tr>
            <th>Symbol</th>
            <td class="font-mono">{{ metadata?.symbol || '—' }}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td class="whitespace-pre-wrap">{{ metadata?.description || '—' }}</td>
          </tr>
          <tr>
            <th>URI</th>
            <td class="break-all">
              <a
                v-if="metadata?.uri"
                :href="metadata.uri"
                target="_blank"
                class="link link-primary"
              >
                {{ metadata.uri }}
              </a>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Units</th>
            <td>
              <div v-if="(metadata?.denom_units || []).length === 0">—</div>
              <ul v-else class="text-sm space-y-1">
                <li v-for="u in metadata?.denom_units || []" :key="u.denom" class="font-mono">
                  {{ u.denom }} · exp={{ u.exponent }}
                  <span v-if="u.aliases && u.aliases.length > 0" class="opacity-70">
                    (aliases: {{ u.aliases.join(', ') }})
                  </span>
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-box p-4 w-full">
      <div class="font-medium mb-2">Supply</div>
      <div v-if="isLoadingSupply" class="opacity-70">Loading…</div>
      <div v-else-if="supplyError" class="text-error">{{ supplyError }}</div>
      <table v-else class="table table-sm">
        <tbody>
          <tr>
            <th>Base</th>
            <td class="font-mono">
              <span class="font-bold">{{ supplyBase.amount }} </span>
              {{ supplyBase.denom }}
            </td>
          </tr>
          <tr>
            <th>Display</th>
            <td class="font-mono">
              <span class="font-bold">{{ supplyDisplay.amount }} </span>
              {{ supplyDisplay.denom }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-box p-4 w-full">
      <div class="font-medium mb-2">Owners</div>
      <div v-if="isLoadingOwners" class="opacity-70">Loading…</div>
      <div v-else-if="ownersError" class="text-error">{{ ownersError }}</div>
      <div v-else>
        <div v-if="owners.length === 0" class="opacity-70">No owners.</div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Owner</th>

                <th class="text-right">Amount (display)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in owners" :key="o.address">
                <td>
                  <AddressDisplay :address="o.address" :truncate="8" />
                </td>

                <td class="text-right font-mono">{{ toDisplay(o.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="rounded-box p-4 w-full">
      <div class="font-medium mb-2">Denom Actions</div>
      <div class="space-y-4">
        <DenomSetDescriptionForm :name="routeName" :denom="routeDenom" />
        <DenomSetURIForm />
        <DenomSetMetadataForm />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import AddressDisplay from '@/components/AddressDisplay.vue'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import Supply from '@/orm/models/bank/Supply'
import DenomOwner from '@/orm/models/bank/DenomOwner'
import DenomSetDescriptionForm from '@/components/names/DenomSetDescriptionForm.vue'
import DenomSetURIForm from '@/components/names/DenomSetURIForm.vue'
import DenomSetMetadataForm from '@/components/names/DenomSetMetadataForm.vue'
import MintCoinsForm from '@/components/names/MintCoinsForm.vue'
import BurnCoinsForm from '@/components/names/BurnCoinsForm.vue'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))
const routeDenom = computed(() => String(route.params.denom || ''))

// ---- Metadata ----
const isLoadingMetadata = ref(false)
const metadataError = ref('')
const metadata = ref<{
  base: string
  description?: string
  display?: string
  name?: string
  symbol?: string
  uri?: string
  uri_hash?: string
  denom_units?: Array<{ denom: string; exponent: number; aliases?: string[] }>
} | null>(null)

// ---- Supply ----
const isLoadingSupply = ref(false)
const supplyError = ref('')
const supplyBase = ref<{ amount: string; denom: string }>({ amount: '0', denom: '' })
const supplyDisplay = ref<{ amount: string; denom: string }>({ amount: '0', denom: '' })

// ---- Owners ----
const isLoadingOwners = ref(false)
const ownersError = ref('')
const owners = ref<Array<{ address: string; amount: string }>>([])

function toDisplay(amountBase: string) {
  const norm = DenomMetadata.normalize({ amount: amountBase, denom: routeDenom.value })
  return `${norm.display.amount} ${norm.display.denom}`
}

async function loadMetadata(denom: string) {
  isLoadingMetadata.value = true
  metadataError.value = ''
  metadata.value = null
  try {
    if (!denom) return
    await useAxiosRepo(DenomMetadata).api().fetchOne(denom)
    const all = useRepo(DenomMetadata).all() as unknown as Array<{
      base: string
      display: string
      description?: string
      name?: string
      symbol?: string
      uri?: string
      uri_hash?: string
      denom_units: Array<{ denom: string; exponent: number; aliases?: string[] }>
    }>
    const md = all.find(
      (m) =>
        m.base === denom ||
        (m.denom_units || []).some((u) => u.denom === denom || (u.aliases || []).includes(denom))
    )
    metadata.value = md || null
  } catch (e: any) {
    metadataError.value = e?.message || 'Failed to load metadata'
    console.error(e)
  } finally {
    isLoadingMetadata.value = false
  }
}

async function loadSupply(denom: string) {
  isLoadingSupply.value = true
  supplyError.value = ''
  supplyBase.value = { amount: '0', denom }
  supplyDisplay.value = { amount: '0', denom }
  try {
    if (!denom) return
    await useAxiosRepo(Supply).api().fetchByDenom(denom)
    const repo = useRepo(Supply)
    const rec = (repo.find(denom) as any) || null
    const amount = String(rec?.amount || '0')
    supplyBase.value = { amount, denom }
    const norm = DenomMetadata.normalize({ amount, denom })
    supplyDisplay.value = { amount: norm.display.amount, denom: norm.display.denom }
  } catch (e: any) {
    supplyError.value = e?.message || 'Failed to load supply'
    console.error(e)
  } finally {
    isLoadingSupply.value = false
  }
}

async function loadOwners(denom: string) {
  isLoadingOwners.value = true
  ownersError.value = ''
  owners.value = []
  try {
    if (!denom) return
    await useAxiosRepo(DenomOwner).api().fetchOwnersByQuery(denom)
    const repo = useRepo(DenomOwner)
    const list = (
      repo
        .query()
        .where('denom', (v: string) => v === denom)
        .get() as unknown as Array<{ denom: string; address: string; amount: string }>
    ).map((o) => ({ address: o.address, amount: o.amount }))
    list.sort((a, b) => {
      const A = BigInt(String(a.amount || '0'))
      const B = BigInt(String(b.amount || '0'))
      if (A === B) return 0
      return A > B ? -1 : 1
    })
    owners.value = list
  } catch (e: any) {
    ownersError.value = e?.message || 'Failed to load owners'
    console.error(e)
  } finally {
    isLoadingOwners.value = false
  }
}

async function reload() {
  const denom = routeDenom.value
  await Promise.all([loadMetadata(denom), loadSupply(denom), loadOwners(denom)])
}

watchEffect(() => {
  if (!routeDenom.value) return
  void reload()
})
</script>
