<template>
  <section class="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6">
    <div class="breadcrumbs text-sm">
      <ul>
        <li>
          <router-link to="/blocks" class="link link-hover">Blocks</router-link>
        </li>
        <li v-if="actualDisplayHeight">Block {{ actualDisplayHeight }}</li>
      </ul>
    </div>

    <div class="flex items-center justify-between">
      <h1 v-if="actualDisplayHeight" class="text-2xl font-bold">Block {{ actualDisplayHeight }}</h1>
      <div class="flex gap-2">
        <router-link v-if="prevHeight" :to="`/block/${prevHeight}`" class="btn btn-sm btn-outline"
          >← Prev</router-link
        >
        <router-link v-if="nextHeight" :to="`/block/${nextHeight}`" class="btn btn-sm btn-outline"
          >Next →</router-link
        >
      </div>
    </div>

    <div v-if="isLoadingMeta || isLoadingTxs" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div v-else-if="errorMeta || errorTxs" class="alert alert-error">
      <span>{{ errorMeta || errorTxs }}</span>
    </div>

    <div v-else>
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Header</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <div class="text-base-content/60">Time</div>
              <div>{{ headerTime }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Proposer</div>
              <div class="break-all">{{ block?.header?.proposer_address || '' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Block Hash</div>
              <div class="font-mono text-xs break-all">{{ block?.block_id?.hash || '' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">App Hash</div>
              <div class="font-mono text-xs break-all">{{ block?.header?.app_hash || '' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Data Hash</div>
              <div class="font-mono text-xs break-all">{{ block?.header?.data_hash || '' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Results Hash</div>
              <div class="font-mono text-xs break-all">
                {{ block?.header?.last_results_hash || '' }}
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Validators Hash</div>
              <div class="font-mono text-xs break-all">
                {{ block?.header?.validators_hash || '' }}
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Consensus Hash</div>
              <div class="font-mono text-xs break-all">
                {{ block?.header?.consensus_hash || '' }}
              </div>
            </div>
          </div>
          <div class="divider my-2" />
          <div class="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div class="text-base-content/60">Txs</div>
              <div>{{ txCount }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Success</div>
              <div>{{ successCount }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Gas Used</div>
              <div>{{ gasUsedTotal }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100">
        <div class="card-body gap-3">
          <div class="font-semibold">Validators</div>
          <div class="overflow-x-auto">
            <div v-if="!valoperResolved" class="flex justify-center items-center py-4">
              <span class="loading loading-spinner loading-sm" />
            </div>
            <table v-else class="table table-zebra w-full" data-testid="validators-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Voting Power</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in validators" :key="v.address">
                  <td class="font-mono text-xs break-all">
                    <router-link
                      :to="{
                        name: 'ValidatorDetails',
                        params: { valAddress: valconsToValoper(v.address) },
                      }"
                      class="link link-hover"
                    >
                      {{ v.address }}
                    </router-link>
                  </td>
                  <td class="text-xs">{{ v.voting_power }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold">Transactions</div>
            <div class="text-sm text-base-content/60">{{ txs.length }} txs</div>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Msg Types</th>
                  <th>Code</th>
                  <th>Gas</th>
                  <th>Gas Efficiency</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in txs" :key="t.hash">
                  <td class="font-mono text-xs break-all">
                    <router-link :to="`/txs/${t.hash}`" class="link link-primary">
                      <TxHashDisplay :hash="t.hash" :truncate="5" />
                    </router-link>
                  </td>
                  <td class="text-xs font-mono break-all">{{ msgTypes(t.hash) || '-' }}</td>
                  <td class="text-xs">{{ t.code }}</td>
                  <td class="text-xs">{{ t.gas_used }}/{{ t.gas_wanted }}</td>
                  <td class="text-xs">{{ gasEfficiencyRow(t) }}</td>
                  <td class="text-xs">{{ formatTime(t.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="!txs.length" class="text-base-content/60 italic p-4">No transactions.</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import TendermintBlock from '@/orm/models/tendermint/Block'
import TxRecord from '@/orm/models/tx/TxRecord'
import { ValidatorSetByHeight } from '@/orm/models/base/TendermintService'
import TxHashDisplay from '@/components/TxHashDisplay.vue'
import Validator from '@/orm/models/staking/Validator'

const route = useRoute()
const tmRepo = useRepo(TendermintBlock)
const tmApi = useAxiosRepo(TendermintBlock).api()
const txRepo = useRepo(TxRecord)
const txApi = useAxiosRepo(TxRecord).api()
const vsetRepo = useRepo(ValidatorSetByHeight)
const vsetApi = useAxiosRepo(ValidatorSetByHeight).api()
const validatorRepo = useRepo(Validator)
const validatorApi = useAxiosRepo(Validator).api()
const valoperResolved = computed(() => {
  // When we can map at least one valcons -> valoper, assume resolution ready
  const heightKey = String(actualBlockHeight.value || heightStr.value)
  const set = vsetRepo.where('height', (x: string) => x === heightKey).get()
  if (!Array.isArray(set) || set.length === 0) return false
  const all = validatorRepo.all() as any[]
  if (!Array.isArray(all) || all.length === 0) return false
  // Build an index: base64 pubkey -> operator
  const byKey = new Map<string, string>()
  for (const v of all) {
    const k = v?.consensus_pubkey?.key
    if (typeof k === 'string' && k) byKey.set(k, String(v?.operator_address || ''))
  }
  return set.every((r: any) => {
    const pk = r?.pub_key?.key
    return typeof pk === 'string' && !!byKey.get(pk)
  })
})

const isLoadingMeta = ref(false)
const isLoadingTxs = ref(false)
const errorMeta = ref<string | null>(null)
const errorTxs = ref<string | null>(null)
const actualBlockHeight = ref<string | null>(null)

const heightStr = computed(() => {
  const h = route.params.height
  const s = Array.isArray(h) ? h[0] : h
  return String(s || '')
})
const heightNum = computed(() => {
  if (heightStr.value === 'latest') return -1 // Special case for latest
  const n = Number(heightStr.value)
  return Number.isFinite(n) ? n : 0
})

const actualDisplayHeight = computed(() => {
  return (
    actualBlockHeight.value ||
    block.value?.height ||
    (heightStr.value !== 'latest' ? heightStr.value : null)
  )
})

const prevHeight = computed(() => (heightNum.value > 1 ? heightNum.value - 1 : null))
const nextHeight = computed(() => (heightNum.value > 0 ? heightNum.value + 1 : null))

const block = computed(() => {
  // First try to find by heightStr, then try to find the latest block record
  return (
    tmRepo.find(heightStr.value) ||
    (heightStr.value === 'latest'
      ? tmRepo.all().find((b: any) => b.height && !isNaN(Number(b.height)))
      : null)
  )
})
const txs = computed<TxRow[]>(() =>
  txRepo
    .where('height', (x: string) => x === String(heightStr.value))
    .get()
    .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
    .map((r: any) => ({
      hash: String(r?.hash || ''),
      code: String(r?.code ?? '0'),
      codespace: String(r?.codespace || ''),
      gas_used: String(r?.gas_used ?? '0'),
      gas_wanted: String(r?.gas_wanted ?? '0'),
      info: String(r?.info || ''),
      timestamp: String(r?.timestamp || ''),
    }))
)

const txCount = computed(() => txs.value.length)
const successCount = computed(() => txs.value.filter((t) => t.code === '0').length)
const gasUsedTotal = computed(() => {
  let sum = 0
  for (const t of txs.value) {
    const n = Number(t.gas_used)
    if (Number.isFinite(n)) sum += n
  }
  return String(sum)
})

const headerTime = computed(() => {
  const t = (block.value?.header?.time as string | undefined) || ''
  return t ? new Date(t).toLocaleString() : ''
})

function formatTime(t?: string) {
  if (!t) return ''
  return new Date(t).toLocaleString()
}

const validators = computed<ValidatorRow[]>(() =>
  vsetRepo
    .where('height', (x: string) => x === String(actualBlockHeight.value || heightStr.value))
    .get()
    .map((r: any) => ({
      address: String(r?.address || ''),
      voting_power: String(r?.voting_power ?? '0'),
      pubkey: String(r?.pub_key?.key || ''),
    }))
)

function msgTypes(hash: string): string {
  const rec = txRepo.find(hash) as any
  const msgs = rec?.tx?.body?.messages
  if (!Array.isArray(msgs) || msgs.length === 0) return ''
  const list = msgs.map((m: any) => String(m?.type_url || m?.['@type'] || '')).filter(Boolean)
  return list.join(', ')
}

function gasEfficiencyRow(t: TxRow): string {
  const used = Number(t.gas_used)
  const wanted = Number(t.gas_wanted)
  if (!Number.isFinite(used) || !Number.isFinite(wanted) || wanted <= 0) return '-'
  const pct = (used / wanted) * 100
  return `${pct.toFixed(1)}%`
}

function valconsToValoper(valconsAddr: string): string | null {
  // correlate by consensus pubkey value
  const all = validatorRepo.all() as any[]
  if (!Array.isArray(all) || all.length === 0) return null
  // Build an index: base64 pubkey -> operator
  const byKey = new Map<string, string>()
  for (const v of all) {
    const k = v?.consensus_pubkey?.key
    if (typeof k === 'string' && k) byKey.set(k, String(v?.operator_address || ''))
  }
  // Find the row in vset by address and grab its pubkey
  const row = vsetRepo
    .where('height', (x: string) => x === String(actualBlockHeight.value || heightStr.value))
    .get()
    .find((r: any) => String(r?.address || '') === valconsAddr)
  const pubkey = row?.pub_key?.key
  if (typeof pubkey !== 'string' || !pubkey) return null
  return byKey.get(pubkey) || null
}

// Pagination removed; we load all transactions for the block
const pageSize = '50'
const nextKey = ref<string | undefined>()
const page = ref<number | undefined>()

async function runFetch() {
  if (!heightNum.value || (heightNum.value < 1 && heightNum.value !== -1)) {
    console.error('Invalid height validation failed:', {
      heightStr: heightStr.value,
      heightNum: heightNum.value,
    })
    errorMeta.value = 'Invalid height'
    errorTxs.value = 'Invalid height'
    return
  }
  errorMeta.value = null
  errorTxs.value = null
  isLoadingMeta.value = true
  isLoadingTxs.value = true
  const h = heightStr.value

  try {
    let actualHeight = h

    // First get the actual height if using "latest"
    if (h === 'latest') {
      const latestResp = await fetch('/cosmos/base/tendermint/v1beta1/blocks/latest')
      const latestData = await latestResp.json()
      actualHeight = latestData?.sdk_block?.header?.height || h
      actualBlockHeight.value = actualHeight

      // Store block data manually since fetchWithTxs doesn't work with "latest"
      const blockData = {
        block_id: latestData?.block_id || {},
        header: latestData?.sdk_block?.header || {},
        data: latestData?.sdk_block?.data || {},
        evidence: latestData?.sdk_block?.evidence || {},
        last_commit: latestData?.sdk_block?.last_commit || {},
      }
      // Store with both keys so it can be found
      tmRepo.save({ height: h, ...blockData })
      tmRepo.save({ height: actualHeight, ...blockData })
    } else {
      // For numeric heights, use the normal fetchWithTxs method
      await tmApi.fetchWithTxs(h)
      actualHeight = h
    }

    // Use the specific height for all subsequent calls to avoid race conditions
    const loadAllTxs = async () => {
      try {
        // First page
        const res: any = await txApi.searchInit({
          query: `tx.height=${actualHeight}`,
          limit: pageSize,
        })
        nextKey.value = res?.next_key
        page.value = res?.next_key ? undefined : res?.page
        const lim = Number(res?.limit || pageSize)
        const ret = Number(res?.returned || 0)
        if (!res?.next_key && !(ret >= lim)) page.value = undefined
        // Keep loading while we have a next key
        while (nextKey.value) {
          const more: any = await txRepo.api().searchLoadMore({
            query: `tx.height=${actualHeight}`,
            limit: pageSize,
            next_key: nextKey.value,
            page: page.value,
          })
          nextKey.value = more?.next_key
          page.value = more?.next_key ? undefined : more?.page
          const lim2 = Number(more?.limit || pageSize)
          const ret2 = Number(more?.returned || 0)
          if (!more?.next_key && !(ret2 >= lim2)) page.value = undefined
        }
      } catch (e) {
        console.error('loadAllTxs failed', e)
        errorTxs.value = (e as Error)?.message || 'Failed to load transactions'
      } finally {
        isLoadingTxs.value = false
      }
    }

    const txP = loadAllTxs()

    const vsetP = vsetApi
      .fetch(actualHeight)
      .then((result: any) => {
        // Validate that we got validators - this should never be empty
        const validators = vsetRepo.where('height', (x: string) => x === String(actualHeight)).get()
        if (!validators || validators.length === 0) {
          console.error('CRITICAL: No validators found for block', actualHeight)
          console.error('API result:', result)
          throw new Error(`No validators found for block ${actualHeight}`)
        }
        return result
      })
      .catch((e: unknown) => {
        console.error('Validators fetch failed for height', actualHeight, ':', e)
        console.error('Full error details:', JSON.stringify(e, null, 2))
        throw e
      })

    await Promise.allSettled([txP, vsetP])

    // Ensure staking validators are available to correlate pubkeys → operator
    try {
      if (validatorRepo.all().length === 0) await validatorApi.fetchAll()
    } catch (e) {
      console.warn('Failed to prefetch staking validators for correlation', e)
    }
  } catch (e) {
    console.error('fetchWithTxs failed', e)
    errorMeta.value = (e as Error)?.message || 'Failed to load block'
  } finally {
    isLoadingMeta.value = false
  }
}

// removed loadMore: we load all txs for the block eagerly

onMounted(runFetch)
watch(
  () => route.params.height,
  () => runFetch()
)
</script>

<script lang="ts">
export interface TxRow {
  hash: string
  code: string
  codespace: string
  gas_used: string
  gas_wanted: string
  info: string
  timestamp: string
}
export interface ValidatorRow {
  address: string
  voting_power: string
  pubkey?: string
}
// Back-compat alias in case of stray references
export type ValRow = ValidatorRow
</script>
