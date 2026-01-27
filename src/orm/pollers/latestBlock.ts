import { ref, type Ref } from 'vue'
import { useRepo } from 'pinia-orm'
import LatestBlock from '@/orm/models/base/TendermintService'

import { ensureGlobalCrontaskEventSync } from '@/orm/subscriptions/crontaskEvents'
import { ensureGlobalBankTransferSync } from '@/orm/subscriptions/bankTransferEvents'
import { ensureGlobalIbcEventSync } from '@/orm/subscriptions/ibcEvents'
import { useWallet } from '@/composables/useWallet'

export type ChainStatus = 'connecting' | 'connected' | 'error'
const chainStatus: Ref<ChainStatus> = ref('connecting')
export { chainStatus }

let started = false
let timer: ReturnType<typeof setTimeout> | null = null
// polling disabled; keep symbols removed to satisfy linter
let ws: globalThis.WebSocket | null = null
let wsFailures = 0
// wsActive no longer needed when polling disabled
// removed unused wsPushSeenAt/WS_STALE_MS

function parseEventAttributeValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    return JSON.parse(trimmed)
  } catch (e: unknown) {
    return trimmed
  }
}

export function startLatestBlockPoller() {
  if (started) return
  started = true
  console.info('[tm.poll] start')
  // Disable HTTP polling; rely on WebSocket push updates only

  // Start global crontask event sync with known-creator filter
  try {
    const { unlockedWallets } = useWallet()
    const isKnownCreator = (address: string) => {
      const a = String(address || '').trim()
      if (!a) return false
      try {
        const list =
          (unlockedWallets as { value?: Array<{ address?: string }> } | undefined)?.value || []
        return list.some((w) => String(w?.address || '') === a)
      } catch (e) {
        console.error('[tm.ws] known-creator check error', e)
        return false
      }
    }
    ensureGlobalCrontaskEventSync({ isKnownCreator })
    const isKnownAddress = (address: string) => {
      const a = String(address || '').trim()
      if (!a) return false
      try {
        const list =
          (unlockedWallets as { value?: Array<{ address?: string }> } | undefined)?.value || []
        return list.some((w) => String(w?.address || '') === a)
      } catch (e) {
        console.error('[tm.ws] known-address check error', e)
        return false
      }
    }
    ensureGlobalBankTransferSync({ isKnownAddress })
    ensureGlobalIbcEventSync()
  } catch (e) {
    console.error('[tm.ws] init crontask sync error', e)
  }

  function parseRpcWsUrl(): string | null {
    // Always use Vite proxy path to Tendermint RPC WS: /rpc/websocket
    try {
      const hasLocation = typeof globalThis !== 'undefined' && !!globalThis.location
      if (!hasLocation) return null
      const wsUrl = `/rpc/websocket`
      console.info('[tm.ws] url', wsUrl)
      return wsUrl
    } catch (e) {
      console.error('[tm.ws] build ws url error', e)
      return null
    }
  }

  function ensureWebSocket() {
    try {
      console.debug('[tm.ws] ensure')
      const wsUrl = parseRpcWsUrl()
      if (!wsUrl) {
        console.warn('[tm.ws] missing wsUrl; waiting for browser environment')
        globalThis.setTimeout(ensureWebSocket, 1000)
        return
      }
      if (typeof globalThis.WebSocket === 'undefined') {
        console.warn('[tm.ws] WebSocket API unavailable in this environment')
        return
      }
      if (
        ws &&
        (ws.readyState === globalThis.WebSocket.OPEN ||
          ws.readyState === globalThis.WebSocket.CONNECTING)
      ) {
        console.debug('[tm.ws] already open/connecting; skip new socket')
        return
      }
      ws = new globalThis.WebSocket(wsUrl)
      chainStatus.value = 'connecting'
      ws.onopen = () => {
        wsFailures = 0
        chainStatus.value = 'connected'
        console.info('[tm.ws] open')
        ws!.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'subscribe',
            id: 1,
            params: { query: "tm.event='NewBlock'" },
          })
        )
        ws!.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'subscribe',
            id: 2,
            params: { query: "tm.event='Tx'" },
          })
        )
        console.debug('[tm.ws] subscribed NewBlock, Tx')
      }
      ws.onmessage = async (ev) => {
        // On any event, refresh latest block once; adaptive loop will handle pacing
        try {
          // Optional minimal debug for visibility
          try {
            const msg = JSON.parse(String(ev?.data ?? '{}')) as {
              result?: {
                events?: Record<string, unknown>
                data?: { type?: string; value?: unknown }
              }
            }
            // Upsert latest block directly from WS to avoid HTTP when possible
            const data = msg?.result?.data
            if (data && typeof data === 'object') {
              const typ = String(data.type || '')
              if (typ.includes('NewBlock') || typ.includes('NewBlockHeader')) {
                const value = (data as { value?: unknown }).value as
                  | {
                      block?: { header?: Record<string, unknown> }
                      header?: Record<string, unknown>
                      block_id?: { hash?: unknown }
                      result_finalize_block?: {
                        tx_results?: unknown[]
                      }
                    }
                  | undefined
                const header = (value?.block?.header || value?.header || {}) as Record<
                  string,
                  unknown
                >
                const blockId = (value?.block_id || {}) as { hash?: unknown }
                const lrepo = useRepo(LatestBlock)
                const height = String((header?.height as string | number | undefined) || '')
                if (height) {
                  const timestamp = String((header?.time as string | undefined) || '')
                  lrepo.save({
                    singleton: 'default',
                    height,
                    time: timestamp,
                    proposer_address: String(
                      (header?.proposer_address as string | undefined) || ''
                    ),
                    chain_id: String((header?.chain_id as string | undefined) || ''),
                    hash: String(blockId?.hash ?? ''),
                  })
                  // Extract tx_count from result_finalize_block.tx_results
                  const txResults = (value?.result_finalize_block?.tx_results || []) as unknown[]
                  const txCount = Array.isArray(txResults) ? txResults.length : 0
                  // Emit event for components to react to new blocks with full data
                  if (typeof globalThis.dispatchEvent === 'function') {
                    globalThis.dispatchEvent(
                      new CustomEvent('dys:newblock', {
                        detail: { height, timestamp, tx_count: txCount },
                      })
                    )
                  }

                  // Skip storing streaming TxBlock in ORM to prevent memory leak
                  // On-demand fetches via fetchSummary will populate the repo when needed
                }

                // Emit all chain events as CustomEvents
                try {
                  const canDispatch =
                    typeof globalThis !== 'undefined' &&
                    typeof (globalThis as { dispatchEvent?: unknown }).dispatchEvent ===
                      'function' &&
                    typeof (globalThis as { CustomEvent?: unknown }).CustomEvent === 'function'
                  if (canDispatch) {
                    const fb = (
                      value as {
                        result_finalize_block?: {
                          events?: Array<{
                            type?: string
                            attributes?: Array<{ key?: string; value?: unknown; index?: unknown }>
                          }>
                          tx_results?: Array<{
                            events?: Array<{
                              type?: string
                              attributes?: Array<{
                                key?: string
                                value?: unknown
                                index?: unknown
                              }>
                            }>
                          }>
                        }
                      }
                    )?.result_finalize_block
                    type ChainEventAttr = { key?: string; value?: unknown; index?: unknown }
                    type ChainEvent = { type?: string; attributes?: ChainEventAttr[] }
                    const rawEvents = (fb && fb.events) || []
                    const rawTxResults = (fb && fb.tx_results) || []
                    const listA: ChainEvent[] = Array.isArray(rawEvents)
                      ? (rawEvents as ChainEvent[])
                      : []
                    const listB: ChainEvent[] = Array.isArray(rawTxResults)
                      ? rawTxResults.flatMap((r: { events?: ChainEvent[] }) =>
                          Array.isArray(r?.events) ? (r.events as ChainEvent[]) : []
                        )
                      : []
                    const all: ChainEvent[] = [...listA, ...listB]
                    // Skip generic event names that conflict with browser/IDE built-ins
                    const SKIP_EVENTS = new Set(['message', 'error', 'load', 'unload'])
                    for (const ev of all) {
                      const evtType = String(ev.type).trim()
                      const attrs = ev.attributes
                      if (!evtType || !attrs || !attrs.length || SKIP_EVENTS.has(evtType)) continue
                      const detail: Record<string, unknown> = {}
                      for (const a of attrs) {
                        const k = String(a.key).trim()
                        if (!k) continue
                        const parsedValue = parseEventAttributeValue(a.value)
                        if (Object.prototype.hasOwnProperty.call(detail, k)) {
                          const cur = detail[k]
                          detail[k] = Array.isArray(cur)
                            ? [...cur, parsedValue]
                            : [cur, parsedValue]
                        } else {
                          detail[k] = parsedValue
                        }
                      }
                      const CE = globalThis.CustomEvent
                      if (CE) globalThis.dispatchEvent(new CE(evtType, { detail }))
                    }
                  }
                } catch (e) {
                  console.error('[tm.ws] emit events error', e)
                }
              }
            }
          } catch (e) {
            const rawType = typeof (ev as { data?: unknown })?.data
            const rawSample =
              rawType === 'string'
                ? String((ev as { data?: string }).data).slice(0, 160) + '…'
                : rawType
            console.error('[tm.ws] parse error', { rawType, rawSample, error: e })
          }
          // Do not fetch on push; WS writes latest directly
        } catch (e) {
          console.error('[tm.ws] onmessage handler error', e)
        }
      }
      ws.onclose = (ev) => {
        wsFailures += 1
        ws = null
        chainStatus.value = wsFailures > 0 ? 'error' : 'connecting'
        // Fallback to polling continues; try to reconnect with backoff based on failures
        const backoff = Math.min(30000, 1000 * 2 ** Math.min(5, wsFailures))
        console.warn('[tm.ws] close', { code: ev?.code, reason: ev?.reason, backoff })
        globalThis.setTimeout(ensureWebSocket, backoff)
      }
      ws.onerror = (err) => {
        console.error('[tm.ws] error', err)
        chainStatus.value = 'error'
        try {
          ws?.close()
        } catch (e) {
          console.error('[tm.ws] error during close', e)
        }
      }
    } catch (e) {
      console.error('[latestBlockPoller][ws] ensure error', e)
    }
  }

  // Kick off once; ws will refresh latest on push
  ensureWebSocket()
}

export function stopLatestBlockPoller() {
  started = false
  if (timer) globalThis.clearTimeout(timer)
  timer = null
  try {
    ws?.close()
  } catch (e) {
    console.error('[tm.ws] stop close error', e)
  }
  ws = null
}
