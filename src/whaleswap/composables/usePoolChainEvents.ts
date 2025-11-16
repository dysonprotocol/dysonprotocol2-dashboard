/* eslint-env browser */
import { onMounted, onUnmounted, watch, ref, type MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { useWhaleswapClient } from './useWhaleswapClient'
import { upsertPoolSnapshot } from './useWhaleswapPool'

const POOL_CHAIN_EVENTS = [
  'dysonprotocol.whaleswap.v1.EventPoolCreated',
  'dysonprotocol.whaleswap.v1.EventPoolUpdate',
  'dysonprotocol.whaleswap.v1.EventPoolSwap',
  'dysonprotocol.whaleswap.v1.EventPoolLiquidityAdded',
  'dysonprotocol.whaleswap.v1.EventPoolLiquidityRemoved',
  'dysonprotocol.whaleswap.v1.EventLeveragePositionOpened',
  'dysonprotocol.whaleswap.v1.EventLeveragePositionClosed',
  'dysonprotocol.whaleswap.v1.EventLeverageCollateralAdded',
  'dysonprotocol.whaleswap.v1.EventLeverageCollateralRemoved',
  'dysonprotocol.whaleswap.v1.EventLeverageLiquidationInitialized',
  'dysonprotocol.whaleswap.v1.EventLeverageLiquidationFinalized',
  'dysonprotocol.whaleswap.v1.EventLeveragePositionCovered',
  'dysonprotocol.whaleswap.v1.EventLeveragePositionPartiallyClosed',
] as const

export function usePoolChainEvents(poolId: MaybeRefOrGetter<string | number | undefined>) {
  const client = useWhaleswapClient()
  const currentPoolId = ref('')
  const pendingRefresh = new Set<string>()

  watch(
    () => toValue(poolId),
    (val) => {
      currentPoolId.value = normalizePoolId(val)
      console.debug('[pool.events] watch poolId', { raw: val, normalized: currentPoolId.value })
    },
    { immediate: true }
  )

  async function refreshPool(id: string) {
    if (!id || pendingRefresh.has(id)) return
    pendingRefresh.add(id)
    console.debug('[pool.events] refreshPool start', { id })
    try {
      const response = await client.pool({ poolId: id })
      if (response?.pool) {
        console.debug('[pool.events] refreshPool fetched pool', {
          id,
          pool: response.pool,
        })
        await upsertPoolSnapshot(response.pool)
        console.debug('[pool.events] refreshPool inserted pool', {
          id,
          updated_height: response.pool.updated_height,
        })
      } else {
        console.warn('[pool.events] refreshPool missing pool in response', { id, response })
      }
      console.debug('[pool.events] refreshPool success', { id })
    } catch (error) {
      console.error('[pool.events] refresh error', { id, error })
    } finally {
      pendingRefresh.delete(id)
    }
  }

  function handleEvent(event: globalThis.Event) {
    console.debug('[pool.events] handleEvent raw', { event })
    if (!(event instanceof globalThis.CustomEvent)) {
      console.debug('[pool.events] skip non CustomEvent', { type: event.type })
      return
    }
    if (!currentPoolId.value) {
      console.debug('[pool.events] skip missing currentPoolId')
      return
    }
    const detail = event.detail as Record<string, unknown> | undefined
    if (!detail) {
      console.debug('[pool.events] skip missing detail')
      return
    }
    const eventPoolId = normalizePoolId(
      detail.pool_id ?? detail.poolId ?? detail.pool ?? detail.position_pool_id
    )
    console.debug('[pool.events] handleEvent detail', {
      type: event.type,
      detail,
      eventPoolId,
      currentPoolId: currentPoolId.value,
    })
    if (!eventPoolId || eventPoolId !== currentPoolId.value) {
      console.debug('[pool.events] skip event (mismatch)')
      return
    }
    void refreshPool(eventPoolId)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    console.debug('[pool.events] mounting listeners', { events: POOL_CHAIN_EVENTS })
    POOL_CHAIN_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleEvent as unknown as globalThis.EventListener)
    })
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') return
    console.debug('[pool.events] unmounting listeners')
    POOL_CHAIN_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleEvent as unknown as globalThis.EventListener)
    })
  })
}

function normalizePoolId(value: unknown): string {
  console.debug('[pool.events] normalizePoolId raw', { value })
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizePoolId(entry)
      if (normalized) return normalized
    }
    return ''
  }
  if (typeof value === 'number' || typeof value === 'bigint') return value.toString()
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}
