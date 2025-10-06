<template>
  <div class="container">
    <h1>IBC Transfers · {{ peer?.name || otherChainId }}</h1>

    <section class="panel">
      <h3 class="title">Addresses</h3>
      <form class="form" @submit.prevent="refresh">
        <label>
          Local address
          <input v-model="localAddress" placeholder="dys2..." />
        </label>
        <label>
          Remote address
          <input v-model="remoteAddress" placeholder="cosmos1..." />
        </label>
        <div>
          <button type="submit">Refresh</button>
        </div>
      </form>
      <div class="hint">
        Channel mapping: local {{ peer?.localChannelId }} ⇄ remote {{ peer?.remoteChannelId }}
      </div>
    </section>

    <section class="panel">
      <h3 class="title">Balances</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>local denom</th>
              <th>local amount</th>
              <th>remote denom</th>
              <th>remote amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key">
              <td>{{ row.local.displayDenom }}</td>
              <td>{{ row.local.displayAmount }}</td>
              <td>{{ row.remote.displayDenom }}</td>
              <td>{{ row.remote.displayAmount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/orm/http'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import { getIbcTransferPeerById } from '../../config/ibcTransfers'

type Coin = { denom: string; amount: string }
type RemoteBalancesResp = { balances?: Coin[]; pagination?: { next_key?: string | null } }
type RemoteDenomsResp = {
  metadatas?: Array<{
    base?: string
    display?: string
    denom_units?: Array<{ denom: string; exponent: number; aliases?: string[] }>
  }>
  pagination?: { next_key?: string | null }
}

const route = useRoute()

const otherChainId = computed(() => String(route.params.other_chain_id || ''))
const peer = computed(() => getIbcTransferPeerById(otherChainId.value))

const localAddress = ref('')
const remoteAddress = ref('')
const error = ref('')

// Data holders
const localBalances = ref<Coin[]>([])
const remoteBalances = ref<Coin[]>([])
const remoteMetadata = ref<Map<string, { display: string; exponent: number }>>(new Map())
const localMetadata = ref<Map<string, { display: string; exponent: number }>>(new Map())
const denomHashCache = ref<Map<string, string>>(new Map())

const rows = computed(() => {
  // Map native<->ibc for this specific channel.
  // Remote native → local ibc: denom = transfer/{remoteChannelId}/{denom}
  // Local native → remote ibc: remote denom = transfer/{localChannelId}/{denom}
  const p = peer.value
  if (!p) return []

  const remoteByBase = new Map(
    remoteBalances.value.map((c) => [normalizeIbcDenom(c.denom), c.amount])
  )
  const localByBase = new Map(
    localBalances.value.map((c) => [normalizeIbcDenom(c.denom), c.amount])
  )

  const out: Array<{
    key: string
    local: { displayDenom: string; displayAmount: string }
    remote: { displayDenom: string; displayAmount: string }
  }> = []

  // 1) Remote native → local ibc (only include rows that join with local side)
  for (const [remoteBase, amt] of remoteByBase.entries()) {
    if (remoteBase.startsWith('ibc/')) continue // native only on remote
    const localIbcDenom = `transfer/${p.remoteChannelId}/${remoteBase}`
    const localIbcHash = denomHashCache.value.get(localIbcDenom) || ''
    const localBase = normalizeIbcDenom(localIbcHash ? `ibc/${localIbcHash}` : localIbcDenom)
    const localAmt = localByBase.get(localBase)
    if (localAmt == null) continue // inner-join behavior
    const remoteDisp = toDisplay(remoteBase, amt, remoteMetadata.value)
    const localDisp = toDisplay(localBase, localAmt, localMetadata.value)
    out.push({
      key: `remote-native:${remoteBase}`,
      local: { displayDenom: localDisp.denom, displayAmount: localDisp.amount },
      remote: { displayDenom: remoteDisp.denom, displayAmount: remoteDisp.amount },
    })
  }

  // 2) Local native → remote ibc (only include rows that join with remote side)
  for (const [localBase, amt] of localByBase.entries()) {
    if (localBase.startsWith('ibc/')) continue // native only on local
    const remoteIbcDenom = `transfer/${p.localChannelId}/${localBase}`
    const remoteIbcHash = denomHashCache.value.get(remoteIbcDenom) || ''
    const remoteBase = normalizeIbcDenom(remoteIbcHash ? `ibc/${remoteIbcHash}` : remoteIbcDenom)
    const remoteAmt = remoteByBase.get(remoteBase)
    if (remoteAmt == null) continue // inner-join behavior
    const localDisp = toDisplay(localBase, amt, localMetadata.value)
    const remoteDisp = toDisplay(remoteBase, remoteAmt, remoteMetadata.value)
    out.push({
      key: `local-native:${localBase}`,
      local: { displayDenom: localDisp.denom, displayAmount: localDisp.amount },
      remote: { displayDenom: remoteDisp.denom, displayAmount: remoteDisp.amount },
    })
  }

  return out
})

onMounted(async () => {
  const ql = String((route.query.local as string) || '')
  const qr = String((route.query.remote as string) || '')
  if (ql) localAddress.value = ql
  if (qr) remoteAddress.value = qr
  await refresh()
})

watch(
  () => route.query,
  async () => {
    const ql = String((route.query.local as string) || '')
    const qr = String((route.query.remote as string) || '')
    if (ql) localAddress.value = ql
    if (qr) remoteAddress.value = qr
  }
)

async function refresh() {
  error.value = ''
  try {
    // Load local first so localBalances/metadata are ready before computing remote denom hashes
    await loadLocal()
    await loadRemote()
  } catch (e: any) {
    error.value = e?.message || 'Failed to load'
  }
}

async function loadLocal() {
  const addr = localAddress.value.trim()
  if (!addr) return
  // Local spendable balances
  await useAxiosRepo(SpendableBalance).api().fetchAll(addr)
  const list = (useRepo(SpendableBalance).query().where('address', addr).get() as any[]) || []
  localBalances.value = list.map((r) => ({ denom: String(r.denom), amount: String(r.amount) }))
  // Local denoms metadata from store
  await useAxiosRepo(DenomMetadata).api().fetchAll()
  localMetadata.value = buildMetadataLookup()
}

async function loadRemote() {
  const addr = remoteAddress.value.trim()
  const p = peer.value
  if (!addr || !p) return
  // Fetch remote balances (first page, limit 1000)
  const balancesUrl = `${p.rest_address}/cosmos/bank/v1beta1/balances/${encodeURIComponent(addr)}?pagination.limit=1000`
  const b = await fetchJson<RemoteBalancesResp>(balancesUrl)
  remoteBalances.value = (b?.balances || []).map((c) => ({
    denom: String(c.denom),
    amount: String(c.amount),
  }))

  // Fetch remote denom metadata (first page, limit 1000)
  const mdUrl = `${p.rest_address}/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=1000`
  const md = await fetchJson<RemoteDenomsResp>(mdUrl)
  remoteMetadata.value = buildRemoteMetadataLookup(md?.metadatas || [])

  // Compute denom hashes for mapping (N requests) for both directions
  const toHash = new Set<string>()
  // remote native -> local ibc
  for (const c of remoteBalances.value)
    if (!c.denom.startsWith('ibc/')) toHash.add(`transfer/${p.remoteChannelId}/${c.denom}`)
  // local native -> remote ibc
  for (const c of localBalances.value)
    if (!c.denom.startsWith('ibc/')) toHash.add(`transfer/${p.localChannelId}/${c.denom}`)
  await computeIbcDenomHashes(Array.from(toHash))
}

function buildMetadataLookup(): Map<string, { display: string; exponent: number }> {
  const map = new Map<string, { display: string; exponent: number }>()
  const list = (useRepo(DenomMetadata).all() as any[]) || []
  for (const m of list) {
    const base = String(m.base || '')
    const display = String(m.display || base)
    const units =
      (m.denom_units as Array<{ denom: string; exponent: number; aliases?: string[] }>) || []
    const unit = units.find((u) => u.denom === display || (u.aliases || []).includes(display))
    const exp = Number(unit?.exponent || 0)
    map.set(base, { display, exponent: exp })
  }
  return map
}

function buildRemoteMetadataLookup(
  list: Array<{
    base?: string
    display?: string
    denom_units?: Array<{ denom: string; exponent: number; aliases?: string[] }>
  }>
): Map<string, { display: string; exponent: number }> {
  const map = new Map<string, { display: string; exponent: number }>()
  for (const m of list) {
    const base = String(m.base || '')
    if (!base) continue
    const display = String(m.display || base)
    const units =
      (m.denom_units as
        | Array<{ denom: string; exponent: number; aliases?: string[] }>
        | undefined) || []
    const unit = units.find((u) => u.denom === display || (u.aliases || []).includes(display))
    const exp = Number(unit?.exponent || 0)
    map.set(base, { display, exponent: exp })
  }
  return map
}

function toDisplay(
  baseDenom: string,
  baseAmount: string,
  md: Map<string, { display: string; exponent: number }>
) {
  // If metadata is missing, treat as exponent=0 and display=base
  const meta = md.get(baseDenom) || { display: baseDenom, exponent: 0 }
  const exp = Number(meta.exponent || 0)
  const s = String(baseAmount || '0')
  if (exp <= 0) return { denom: meta.display, amount: s }
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    const out = `0.${pad}${s}`.replace(/\.0+$/, '')
    return { denom: meta.display, amount: out }
  }
  const i = s.length - exp
  const out = `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
  return { denom: meta.display, amount: out }
}

async function computeIbcDenomHashes(denoms: string[]) {
  const map = new Map(denomHashCache.value)
  for (const d of denoms) {
    if (map.has(d)) continue
    try {
      const { data } = await api.get(`/ibc/apps/transfer/v1/denom_hashes/${encodeURIComponent(d)}`)
      const hash = String((data as any)?.hash || '')
      if (hash) map.set(d, hash)
    } catch {
      // Fallback: compute SHA-256 locally per ICS-20 (ibc/ + SHA256(trace))
      try {
        const hash = await sha256HexUpper(d)
        if (hash) map.set(d, hash)
      } catch (err) {
        console.warn('[IbcTransferDetail] denom hash local compute failed for', d, err)
      }
    }
  }
  denomHashCache.value = map
}

function normalizeIbcDenom(denom: string) {
  if (!denom) return ''
  if (!denom.startsWith('ibc/')) return denom
  const hash = denom.slice(4)
  return `ibc/${hash.toUpperCase()}`
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

async function sha256HexUpper(input: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex.toUpperCase()
}
</script>

<style scoped>
.container {
  display: block;
  padding: 16px;
}
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.title {
  margin: 0 0 8px 0;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}
.table-wrap {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}
thead th {
  font-size: 12px;
  color: #6b7280;
}
.error {
  color: #dc2626;
  margin-top: 8px;
}
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
button {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
</style>
