<template>
  <div class="space-y-4 w-full mx-auto md:w-3/4">
    <div class="flex items-baseline justify-between gap-2">
      <h1 class="text-2xl font-semibold">
        Denoms for <span class="font-mono">{{ routeName }}</span>
      </h1>
      <RouterLink
        :to="{ name: 'NameDetails', params: { name: routeName } }"
        class="link link-primary text-sm"
      >
        ← Back to <span class="font-mono">{{ routeName }}</span>
      </RouterLink>
    </div>

    <div class="rounded-box p-4 w-full">
      <div class="flex items-center justify-between mb-2">
        <div class="font-medium">Denoms</div>
        <div class="text-sm opacity-70">{{ items.length }} total</div>
      </div>
      <div v-if="isLoading" class="opacity-70">Loading…</div>
      <div v-else-if="error" class="text-error">{{ error }}</div>
      <div v-else>
        <div v-if="items.length === 0" class="opacity-70">No denoms.</div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Denom</th>
                <th>Display</th>
                <th class="text-right">Supply (base)</th>
                <th class="text-right">Supply (display)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in items" :key="it.denom">
                <td class="font-mono">
                  <RouterLink
                    :to="{ name: 'NameDenomDetail', params: { name: routeName, denom: it.denom } }"
                    class="link link-primary"
                  >
                    {{ it.denom }}
                  </RouterLink>
                </td>
                <td>
                  <span class="font-mono">{{ it.displayLabel }}</span>
                  <span v-if="it.unitInfo" class="opacity-70 text-xs ml-2"
                    >exp={{ it.unitInfo.exponent }}</span
                  >
                </td>
                <td class="text-right font-mono">{{ it.supplyBase.amount }}</td>
                <td class="text-right font-mono">
                  {{ it.supplyDisplay.amount }} {{ it.supplyDisplay.denom }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import DenomsByName from '@/orm/models/nameservice/DenomsByName'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import Supply from '@/orm/models/bank/Supply'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))

const isLoading = ref(false)
const error = ref('')

interface RowItem {
  denom: string
  displayLabel: string
  unitInfo: { denom: string; exponent: number; aliases?: string[] } | null
  supplyBase: { amount: string; denom: string }
  supplyDisplay: { amount: string; denom: string }
}
const items = ref<RowItem[]>([])

async function loadAll() {
  isLoading.value = true
  error.value = ''
  items.value = []
  try {
    const name = routeName.value
    if (!name) return

    // Fetch name->denoms, all denom metadata, and then supply per denom
    await Promise.all([useAxiosRepo(DenomsByName).api().fetchInit({ name })])

    const denoms = (
      useRepo(DenomsByName).all() as unknown as Array<{ name: string; denom: string }>
    )
      .filter((r) => r.name === name)
      .map((r) => r.denom)

    // Fetch metadata only for the specific denoms
    await Promise.all(denoms.map((d) => useAxiosRepo(DenomMetadata).api().fetchOne(d)))

    const rows: RowItem[] = denoms.map((denom) => {
      const norm = DenomMetadata.normalize({ amount: '0', denom })
      const displayDenom = norm.display.denom
      const unitInfo =
        (norm.metadata?.denom_units || []).find(
          (u: { denom: string; aliases?: string[] }) =>
            u.denom === displayDenom || (u.aliases || []).includes(displayDenom)
        ) || null
      return {
        denom,
        displayLabel: displayDenom,
        unitInfo,
        supplyBase: { amount: '0', denom },
        supplyDisplay: { amount: '0', denom: displayDenom },
      }
    })

    // Fetch supplies in parallel
    await Promise.all(
      rows.map(async (row) => {
        try {
          await useAxiosRepo(Supply).api().fetchByDenom(row.denom)
          const rec = (useRepo(Supply).find(row.denom) as any) || null
          const amount = String(rec?.amount || '0')
          row.supplyBase = { amount, denom: row.denom }
          const norm = DenomMetadata.normalize({ amount, denom: row.denom })
          row.supplyDisplay = { amount: norm.display.amount, denom: norm.display.denom }
        } catch (e) {
          console.error(e)
        }
      })
    )

    items.value = rows
  } catch (e: any) {
    error.value = e?.message || 'Failed to load denoms'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

watchEffect(() => {
  if (!routeName.value) return
  void loadAll()
})
</script>
