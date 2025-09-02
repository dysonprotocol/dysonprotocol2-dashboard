<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import TxRecord from '@/orm/models/tx/TxRecord'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

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
    <div v-if="isLoading" class="flex justify-center items-center py-12">Loading…</div>

    <div v-else-if="loadError" class="rounded-md border border-destructive/30 p-3 text-destructive">
      {{ loadError }}
    </div>

    <div v-else-if="record" class="flex flex-col gap-4">
      <!-- Summary -->
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent class="gap-2">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="text-muted-foreground">Hash</div>
              <div class="font-mono break-all">{{ record.hash }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Height</div>
              <div>
                <RouterLink :to="`/block/${height}`" class="underline underline-offset-2">
                  {{ height }}
                </RouterLink>
              </div>
            </div>
            <div>
              <div class="text-muted-foreground">Msg Types</div>
              <div class="font-mono break-all">
                {{ (msgTypes as any).join(', ') || '-' }}
              </div>
            </div>
            <div>
              <div class="text-muted-foreground">Time</div>
              <div>{{ formatTime(timestamp) }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Status</div>
              <div>
                <Badge v-if="code === '0'" variant="secondary">Success</Badge>
                <Badge v-else variant="destructive">Failed {{ codespace }} {{ code }}</Badge>
              </div>
            </div>
            <div>
              <div class="text-muted-foreground">Gas</div>
              <div>{{ gasUsed }}/{{ gasWanted }} ({{ gasEfficiency(gasUsed, gasWanted) }})</div>
            </div>
            <div>
              <div class="text-muted-foreground">Memo</div>
              <div class="break-words">{{ memo || '-' }}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Fee / Tip -->
      <Card>
        <CardHeader>
          <CardTitle>Fee</CardTitle>
        </CardHeader>
        <CardContent class="gap-2">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <div class="text-muted-foreground">Amount</div>
              <div>{{ joinCoins(feeCoins as any) || '-' }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Gas Limit</div>
              <div>{{ gasLimit }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Payer / Granter</div>
              <div class="break-all">
                {{ payer || '-' }}<span v-if="granter"> / {{ granter }}</span>
              </div>
            </div>
          </div>
          <div class="h-px bg-border my-2" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="text-muted-foreground">Tip</div>
              <div>{{ joinCoins(tipCoins as any) || '-' }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Tipper</div>
              <div class="break-all">{{ tipper || '-' }}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Signers -->
      <Card>
        <CardHeader>
          <CardTitle>Signers</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead>PubKey</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(s, i) in signerInfos" :key="i">
                  <TableCell>{{ i + 1 }}</TableCell>
                  <TableCell>{{ (s?.mode_info as any)?.single?.mode || '-' }}</TableCell>
                  <TableCell>{{ String((s?.sequence as any) ?? '0') }}</TableCell>
                  <TableCell class="font-mono break-all">{{
                    (s?.public_key as any)?.type_url || '-'
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="!signerInfos.length">
                  <TableCell colspan="4" class="italic text-muted-foreground"
                    >No signer infos.</TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <!-- Messages with inline events -->
      <Card>
        <CardHeader>
          <CardTitle>Messages ({{ msgs.length }})</CardTitle>
        </CardHeader>
        <CardContent class="gap-2">
          <div v-if="!msgs.length" class="text-muted-foreground">No messages.</div>
          <div v-else class="flex flex-col gap-3">
            <div v-for="(m, i) in msgs" :key="i" class="rounded-md border p-3">
              <div class="font-mono break-all mb-2">
                {{ (m as any)['@type'] || (m as any).type_url || 'unknown' }}
              </div>
              <pre class="whitespace-pre-wrap break-words border rounded p-2">{{
                JSON.stringify(m, null, 2)
              }}</pre>
              <div class="mt-3">
                <div class="text-muted-foreground mb-1">Events for msg {{ i }}</div>
                <div class="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Attributes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <template
                        v-for="(ev, ei) in eventsByMsgIndex[String(i)] || []"
                        :key="`msg-${i}-ev-${ei}`"
                      >
                        <TableRow>
                          <TableCell class="font-mono">{{
                            String((ev as any)?.type || '')
                          }}</TableCell>
                          <TableCell>
                            <div class="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow
                                    v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                                    :key="`msg-${i}-att-${ei}-${ai}`"
                                  >
                                    <TableCell class="font-mono">{{
                                      String((a as any)?.key || '')
                                    }}</TableCell>
                                    <TableCell class="font-mono break-all">
                                      {{ String((a as any)?.value || '') }}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow v-if="!((ev as any)?.attributes || []).length">
                                    <TableCell colspan="2" class="italic text-muted-foreground"
                                      >No attributes.</TableCell
                                    >
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      </template>
                      <template
                        v-for="(ev, ei) in typedEventsByMsgIndex[String(i)] || []"
                        :key="`msg-${i}-tev-${ei}`"
                      >
                        <TableRow>
                          <TableCell class="font-mono">{{
                            String((ev as any)?.type || '')
                          }}</TableCell>
                          <TableCell>
                            <div class="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow
                                    v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                                    :key="`msg-${i}-tatt-${ei}-${ai}`"
                                  >
                                    <TableCell class="font-mono">{{
                                      String((a as any)?.key || '')
                                    }}</TableCell>
                                    <TableCell class="font-mono break-all">
                                      {{ String((a as any)?.value || '') }}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow v-if="!((ev as any)?.attributes || []).length">
                                    <TableCell colspan="2" class="italic text-muted-foreground"
                                      >No attributes.</TableCell
                                    >
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      </template>
                      <TableRow
                        v-if="
                          !(
                            eventsByMsgIndex[String(i)]?.length ||
                            typedEventsByMsgIndex[String(i)]?.length
                          )
                        "
                      >
                        <TableCell colspan="2" class="italic text-muted-foreground"
                          >No events.</TableCell
                        >
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Logs & Events -->
      <Card>
        <CardHeader>
          <CardTitle>Logs & Events</CardTitle>
        </CardHeader>
        <CardContent class="gap-2">
          <div>
            <div class="text-muted-foreground">Raw Log</div>
            <pre class="whitespace-pre-wrap break-words">{{ rawLog || '-' }}</pre>
          </div>
          <div class="h-px bg-border my-2" />
          <div class="font-semibold">Transaction Events</div>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Attributes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(ev, i) in txLevelEvents" :key="`tx-ev-${i}`">
                  <TableCell class="font-mono">{{ String((ev as any)?.type || '') }}</TableCell>
                  <TableCell>
                    <div class="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="(a, ai) in ((ev as any)?.attributes as any[]) || []"
                            :key="`tx-att-${i}-${ai}`"
                          >
                            <TableCell class="font-mono">{{
                              String((a as any)?.key || '')
                            }}</TableCell>
                            <TableCell class="font-mono break-all">
                              {{ String((a as any)?.value || '') }}
                            </TableCell>
                          </TableRow>
                          <TableRow v-if="!((ev as any)?.attributes || []).length">
                            <TableCell colspan="2" class="italic text-muted-foreground"
                              >No attributes.</TableCell
                            >
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!txLevelEvents.length">
                  <TableCell colspan="2" class="italic text-muted-foreground"
                    >No transaction events.</TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
