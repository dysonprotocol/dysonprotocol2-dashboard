<template>
  <div class="mx-auto space-y-8 max-w-lg">
    <SimpleRegisterName @registered="onRegistered" />

    <div v-if="isLoadingAll" class="opacity-70 mt-2">Loading…</div>
    <div v-else-if="allError" class="text-error mt-2">
      {{ allError }}
    </div>
    <div v-else class="mt-2">
      <div v-if="nftsView.length === 0" class="opacity-70">No names found.</div>
      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Valuation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nft in nftsView" :key="nft.id">
              <td class="font-mono">
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
              <td>
                <router-link :to="`/names/${nft.id}`" class="link">
                  <span v-if="formatValuation(nft).label"
                    >{{ formatValuation(nft).amount }} {{ formatValuation(nft).label }}</span
                  >
                  <span v-else>—</span>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import SimpleRegisterName from '@/components/names/SimpleRegisterName.vue'
import NftItem from '@/orm/models/nft/NftItem'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

function onRegistered() {
  loadAllNames()
}

const isLoadingAll = ref(false)
const allError = ref('')
const repo = useRepo(NftItem)
const api = useAxiosRepo(NftItem).api()
function getDisplayInfoForBase(baseDenom) {
  // Minimal: assume udys -> dys2
  if (String(baseDenom || '') === 'udys') return { display: 'dys2', exponent: 6 }
  return { display: String(baseDenom || ''), exponent: 0 }
}

function baseToDisplayFor(amountBase, baseDenom) {
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

function formatValuation(nft) {
  const coin = nft?.data?.valuation || { amount: '0', denom: '' }
  const denom = String(coin?.denom || '')
  if (!denom) return { amount: '0', label: '' }
  const amount = String(coin?.amount || '0')
  const label = getDisplayInfoForBase(denom).display
  return { amount: baseToDisplayFor(amount, denom), label }
}

async function loadAllNames() {
  isLoadingAll.value = true
  allError.value = ''
  try {
    let next_key
    let page = 1
    // prime first page
    const first = await api.fetchNfts({ class_id: 'nameservice.dys', limit: '200' })
    next_key = first.next_key
    // loop next pages if any
    while (next_key) {
      const more = await api.fetchNfts({ class_id: 'nameservice.dys', next_key, limit: '200' })
      next_key = more.next_key
      page = (more.page || page) + 1
    }
  } catch (e) {
    allError.value = e?.message || 'Failed to load names'
  } finally {
    isLoadingAll.value = false
  }
}

onMounted(() => loadAllNames())

const nftsView = computed(() => {
  const arr = repo.query().where('class_id', 'nameservice.dys').get()
  arr.sort((a, b) => {
    const aa = BigInt(a?.data?.valuation?.amount || '0')
    const bb = BigInt(b?.data?.valuation?.amount || '0')
    if (aa === bb) return String(a?.id || '').localeCompare(String(b?.id || ''))
    return aa > bb ? -1 : 1
  })
  return arr
})
</script>
