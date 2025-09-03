import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import LatestBlock, { NodeInfo } from '@/orm/models/base/TendermintService'

let started = false
let timer: ReturnType<typeof setTimeout> | null = null
let delayMs = 1000
const WS_ONLY_DELAY = 15000
let ws: globalThis.WebSocket | null = null
let wsFailures = 0
let wsActive = false
let wsPushSeenAt = 0
const WS_STALE_MS = 15000

export function startLatestBlockPoller() {
  if (started) return
  started = true
  console.info('[tm.poll] start')
  const latestApi = useAxiosRepo(LatestBlock).api()

  async function tick() {
    try {
      if (wsActive) {
        console.debug('[tm.poll] skip fetch; wsActive')
        delayMs = WS_ONLY_DELAY
      } else {
        console.debug('[tm.poll] fetching latest (ws inactive)')
        await latestApi.fetch()
        delayMs = 1000
      }
    } catch (e) {
      console.error('[latestBlockPoller]', e)
      delayMs = 2000
    } finally {
      if (timer) globalThis.clearTimeout(timer)
      timer = setTimeout(tick, delayMs)
    }
  }

  function parseRpcWsUrl(addr: string): string | null {
    if (!addr) return null
    // addr examples: tcp://127.0.0.1:26657
    try {
      const url = new globalThis.URL(addr.replace('tcp://', 'http://'))
      const proto =
        globalThis.location && globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${proto}//${url.hostname}:${url.port}/websocket`
      console.info('[tm.ws] url', wsUrl)
      return wsUrl
    } catch (e) {
      console.error('[tm.ws] parseRpcWsUrl error', addr, e)
      return null
    }
  }

  function ensureWebSocket() {
    try {
      console.debug('[tm.ws] ensure')
      const info = useRepo(NodeInfo).find('default') as { rpc_address?: string } | undefined
      const wsUrl = parseRpcWsUrl(String(info?.rpc_address || ''))
      if (!wsUrl) {
        console.warn('[tm.ws] missing wsUrl from rpc_address; fetching NodeInfo')
        try {
          void useAxiosRepo(NodeInfo)
            .api()
            .fetch()
            .then(() => console.debug('[tm.ws] NodeInfo fetched'))
            .catch((e: unknown) => console.error('[tm.ws] NodeInfo fetch error', e))
        } catch (e) {
          console.error('[tm.ws] ensure fetch NodeInfo error', e)
        }
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
      ws.onopen = () => {
        wsActive = true
        wsFailures = 0
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
          wsPushSeenAt = Date.now()
          // Optional minimal debug for visibility
          try {
            const msg = JSON.parse(String(ev?.data ?? '{}')) as {
              result?: {
                events?: Record<string, unknown>
                data?: { type?: string; value?: unknown }
              }
            }
            const evType =
              (msg?.result?.events && Object.keys(msg.result!.events!)[0]) ||
              msg?.result?.data?.type ||
              ''
            if (evType) console.debug('[tm.ws] event', evType)
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
                  lrepo.save({
                    height,
                    time: String((header?.time as string | undefined) || ''),
                    proposer_address: String(
                      (header?.proposer_address as string | undefined) || ''
                    ),
                    chain_id: String((header?.chain_id as string | undefined) || ''),
                    hash: String(blockId?.hash ?? ''),
                  })
                  console.debug('[tm.ws] upsert latest', { height })
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
        wsActive = false
        wsFailures += 1
        ws = null
        // Fallback to polling continues; try to reconnect with backoff based on failures
        const backoff = Math.min(30000, 1000 * 2 ** Math.min(5, wsFailures))
        console.warn('[tm.ws] close', { code: ev?.code, reason: ev?.reason, backoff })
        globalThis.setTimeout(ensureWebSocket, backoff)
      }
      ws.onerror = (err) => {
        console.error('[tm.ws] error', err)
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

  // Kick off once; ws will refresh latest on push, polling remains as safety net
  ensureWebSocket()
  tick()
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
