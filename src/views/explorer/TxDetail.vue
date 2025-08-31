<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import TxRecord from '@/orm/models/tx/TxRecord'

const route = useRoute()
const hash = computed(() => String(route.params.hash || ''))
const api = useAxiosRepo(TxRecord).api()
const repo = useRepo(TxRecord)

const isLoading = ref(false)
const loadError = ref('')

type AnyRec = Record<string, unknown>

const record = computed(() => repo.find(hash.value) as AnyRec | null)

const height = computed(() => String((record.value?.height as string) || ''))
const timestamp = computed(() => String((record.value?.timestamp as string) || ''))
const code = computed(() => String((record.value?.code as string | number | undefined) ?? '0'))
const codespace = computed(() => String((record.value?.codespace as string | undefined) || ''))
const rawLog = computed(() => String((record.value?.raw_log as string | undefined) || ''))
const txBody = computed(() => ((record.value?.tx as AnyRec)?.body as AnyRec) || {})
const txAuth = computed(() => ((record.value?.tx as AnyRec)?.auth_info as AnyRec) || {})
const txResponse = computed(() => (record.value?.tx_response as AnyRec) || {})

const memo = computed(() => String((txBody.value?.memo as string | undefined) || ''))
const msgs = computed(() =>
  Array.isArray(txBody.value?.messages) ? (txBody.value.messages as AnyRec[]) : []
)
const msgTypes = computed(() =>
  msgs.value
    .map((m) => String((m['@type'] as string) || (m.type_url as string) || ''))
    .filter(Boolean)
)

const fee = computed(() => (txAuth.value?.fee as AnyRec) || {})
const feeCoins = computed(() =>
  Array.isArray(fee.value?.amount) ? (fee.value.amount as AnyRec[]) : []
)
const gasLimit = computed(() =>
  String((fee.value?.gas_limit as string | number | undefined) ?? '0')
)
const payer = computed(() => String((fee.value?.payer as string | undefined) || ''))
const granter = computed(() => String((fee.value?.granter as string | undefined) || ''))
const tip = computed(() => (txAuth.value?.tip as AnyRec) || {})
const tipCoins = computed(() =>
  Array.isArray(tip.value?.amount) ? (tip.value.amount as AnyRec[]) : []
)
const tipper = computed(() => String((tip.value?.tipper as string | undefined) || ''))

const signerInfos = computed(() =>
  Array.isArray(txAuth.value?.signer_infos) ? (txAuth.value.signer_infos as AnyRec[]) : []
)

const gasUsed = computed(() =>
  String(
    (record.value?.gas_used as string | number | undefined) ??
      (txResponse.value?.gas_used as string | number | undefined) ??
      '0'
  )
)
const gasWanted = computed(() =>
  String(
    (record.value?.gas_wanted as string | number | undefined) ??
      (txResponse.value?.gas_wanted as string | number | undefined) ??
      '0'
  )
)

function formatTime(t?: string) {
  if (!t) return ''
  return new Date(t).toLocaleString()
}

function gasEfficiency(used: string, wanted: string) {
  const u = Number(used)
  const w = Number(wanted)
  if (!Number.isFinite(u) || !Number.isFinite(w) || w <= 0) return '-'
  return `${((u / w) * 100).toFixed(1)}%`
}

function joinCoins(list: Array<{ denom?: string; amount?: string }>) {
  if (!Array.isArray(list) || list.length === 0) return ''
  return list.map((c) => `${String(c.amount ?? '0')} ${String(c.denom ?? '')}`.trim()).join(', ')
}

const typedLogs = computed(() =>
  Array.isArray((txResponse.value as AnyRec)?.logs)
    ? ((txResponse.value as AnyRec).logs as AnyRec[])
    : []
)
const events = computed(() =>
  Array.isArray((txResponse.value as AnyRec)?.events)
    ? ((txResponse.value as AnyRec).events as AnyRec[])
    : []
)

function msgIndexFromEvent(ev: AnyRec): number | null {
  const attrs = (ev?.attributes as AnyRec[]) || []
  for (const a of attrs) {
    if (String(a?.key) === 'msg_index') {
      const n = Number(a?.value)
      return Number.isFinite(n) ? n : null
    }
  }
  return null
}

const eventsByMsgIndex = computed(() => {
  const map: Record<string, AnyRec[]> = {}
  for (const ev of events.value) {
    const idx = msgIndexFromEvent(ev)
    if (idx === null) continue
    const k = String(idx)
    if (!map[k]) map[k] = []
    map[k].push(ev)
  }
  return map
})

const txLevelEvents = computed(() => events.value.filter((ev) => msgIndexFromEvent(ev) === null))

const typedEventsByMsgIndex = computed(() => {
  const map: Record<string, AnyRec[]> = {}
  for (const l of typedLogs.value) {
    const idx = String((l as AnyRec)?.msg_index ?? '')
    if (!idx) continue
    const arr = (((l as AnyRec)?.events as AnyRec[]) || []) as AnyRec[]
    if (!map[idx]) map[idx] = []
    map[idx].push(...arr)
  }
  return map
})

// messageIndexes removed; events are shown inline under each message

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    if (hash.value) await api.fetchByHash(hash.value)
  } catch (e) {
    console.error('TxDetail load failed', e)
    loadError.value = (e as Error).message || String(e)
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="w-full max-w-6xl mx-auto p-4 flex flex-col gap-4">
    <div class="breadcrumbs text-sm">
      <ul>
        <li><router-link to="/txs" class="link link-hover">Transactions</router-link></li>
        <li v-if="hash">{{ String(hash).slice(0, 12) }}…</li>
      </ul>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div v-else-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="record" class="flex flex-col gap-4">
      <!-- Summary -->
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Summary</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <div class="text-base-content/60">Hash</div>
              <div class="font-mono text-xs break-all">{{ record.hash }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Height</div>
              <div>
                <RouterLink :to="`/block/${height}`" class="link link-hover">{{
                  height
                }}</RouterLink>
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Msg Types</div>
              <div class="text-xs font-mono break-all">
                {{ (msgTypes as any).join(', ') || '-' }}
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Time</div>
              <div>{{ formatTime(timestamp) }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Status</div>
              <div>
                <span v-if="code === '0'" class="badge badge-success">Success</span>
                <span v-else class="badge badge-error">Failed {{ codespace }} {{ code }}</span>
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Gas</div>
              <div class="text-xs">
                {{ gasUsed }}/{{ gasWanted }} ({{ gasEfficiency(gasUsed, gasWanted) }})
              </div>
            </div>
            <div>
              <div class="text-base-content/60">Memo</div>
              <div class="text-xs break-words">{{ memo || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fee / Tip -->
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Fee</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <div class="text-base-content/60">Amount</div>
              <div class="text-xs">{{ joinCoins(feeCoins as any) || '-' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Gas Limit</div>
              <div class="text-xs">{{ gasLimit }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Payer / Granter</div>
              <div class="text-xs break-all">
                {{ payer || '-' }}<span v-if="granter"> / {{ granter }}</span>
              </div>
            </div>
          </div>
          <div class="divider my-2" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <div class="text-base-content/60">Tip</div>
              <div class="text-xs">{{ joinCoins(tipCoins as any) || '-' }}</div>
            </div>
            <div>
              <div class="text-base-content/60">Tipper</div>
              <div class="text-xs break-all">{{ tipper || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Signers -->
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Signers</div>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mode</th>
                  <th>Sequence</th>
                  <th>PubKey</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in signerInfos" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td>{{ (s?.mode_info as any)?.single?.mode || '-' }}</td>
                  <td>{{ String((s?.sequence as any) ?? '0') }}</td>
                  <td class="font-mono break-all">{{ (s?.public_key as any)?.type_url || '-' }}</td>
                </tr>
                <tr v-if="!signerInfos.length">
                  <td colspan="4" class="text-base-content/60 italic">No signer infos.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Messages with inline events -->
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Messages ({{ msgs.length }})</div>
          <div v-if="!msgs.length" class="text-sm text-base-content/60">No messages.</div>
          <div v-else class="flex flex-col gap-3 text-xs">
            <div v-for="(m, i) in msgs" :key="i" class="bg-base-200 rounded-box p-3">
              <div class="font-mono break-all mb-2">
                {{ (m as any)['@type'] || (m as any).type_url || 'unknown' }}
              </div>
              <pre class="whitespace-pre-wrap break-words p-2 bg-base-100 rounded">{{
                JSON.stringify(m, null, 2)
              }}</pre>
              <div class="mt-3">
                <div class="text-base-content/60 mb-1">Events for msg {{ i }}</div>
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full text-xs">
                    <thead>
                      <tr>
                        <th>Event Type</th>
                        <th>Attributes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template
                        v-for="(ev, ei) in eventsByMsgIndex[String(i)] || []"
                        :key="`msg-${i}-ev-${ei}`"
                      >
                        <tr>
                          <td class="font-mono">{{ String((ev as any)?.type || '') }}</td>
                          <td>
                            <div class="overflow-x-auto">
                              <table class="table table-compact w-full text-[11px]">
                                <thead>
                                  <tr>
                                    <th>Key</th>
                                    <th>Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr
                                    v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                                    :key="`msg-${i}-att-${ei}-${ai}`"
                                  >
                                    <td class="font-mono">{{ String((a as any)?.key || '') }}</td>
                                    <td class="font-mono break-all">
                                      {{ String((a as any)?.value || '') }}
                                    </td>
                                  </tr>
                                  <tr v-if="!((ev as any)?.attributes || []).length">
                                    <td colspan="2" class="text-base-content/60 italic">
                                      No attributes.
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </template>
                      <template
                        v-for="(ev, ei) in typedEventsByMsgIndex[String(i)] || []"
                        :key="`msg-${i}-tev-${ei}`"
                      >
                        <tr>
                          <td class="font-mono">{{ String((ev as any)?.type || '') }}</td>
                          <td>
                            <div class="overflow-x-auto">
                              <table class="table table-compact w-full text-[11px]">
                                <thead>
                                  <tr>
                                    <th>Key</th>
                                    <th>Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr
                                    v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                                    :key="`msg-${i}-tatt-${ei}-${ai}`"
                                  >
                                    <td class="font-mono">{{ String((a as any)?.key || '') }}</td>
                                    <td class="font-mono break-all">
                                      {{ String((a as any)?.value || '') }}
                                    </td>
                                  </tr>
                                  <tr v-if="!((ev as any)?.attributes || []).length">
                                    <td colspan="2" class="text-base-content/60 italic">
                                      No attributes.
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </template>
                      <tr
                        v-if="
                          !(
                            eventsByMsgIndex[String(i)]?.length ||
                            typedEventsByMsgIndex[String(i)]?.length
                          )
                        "
                      >
                        <td colspan="2" class="text-base-content/60 italic">No events.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs & Events -->
      <div class="card bg-base-100">
        <div class="card-body gap-2">
          <div class="font-semibold">Logs & Events</div>
          <div class="text-sm">
            <div class="text-base-content/60">Raw Log</div>
            <pre class="whitespace-pre-wrap break-words text-xs">{{ rawLog || '-' }}</pre>
          </div>
          <div class="divider my-2" />
          <div class="font-semibold">Transaction Events</div>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full text-xs">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Attributes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ev, i) in txLevelEvents" :key="`tx-ev-${i}`">
                  <td class="font-mono">{{ String((ev as any)?.type || '') }}</td>
                  <td>
                    <div class="overflow-x-auto">
                      <table class="table table-compact w-full text-[11px]">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                            :key="`tx-att-${i}-${ai}`"
                          >
                            <td class="font-mono">{{ String((a as any)?.key || '') }}</td>
                            <td class="font-mono break-all">
                              {{ String((a as any)?.value || '') }}
                            </td>
                          </tr>
                          <tr v-if="!((ev as any)?.attributes || []).length">
                            <td colspan="2" class="text-base-content/60 italic">No attributes.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr v-if="!txLevelEvents.length">
                  <td colspan="2" class="text-base-content/60 italic">No transaction events.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
