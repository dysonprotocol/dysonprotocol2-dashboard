import { computed, watchEffect } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useLiveQuery } from '@tanstack/vue-db'
import { useCosmosBankClient } from './useCosmosBankClient'
import { denomMetadataCollection, type DenomMetadataRow } from './useWhaleswapDB'
import type { DenomMetadata } from '../utils/types'
import { upsertCollectionRow } from '../utils/collections'

const log = (...args: unknown[]) => {
  console.debug('[useDenomMetadata]', ...args)
}

export function useDenomMetadata() {
  const bankClient = useCosmosBankClient()

  const metadataQuery = useQuery({
    queryKey: ['cosmos', 'bank', 'denoms-metadata'],
    queryFn: async () => {
      const rows: DenomMetadata[] = []
      let nextKey: string | undefined
      do {
        const response = await bankClient.denomsMetadata({
          pagination: {
            key: nextKey,
            limit: '200',
          },
        })
        if (Array.isArray(response.metadatas)) {
          rows.push(...response.metadatas)
        }
        nextKey = response.pagination?.next_key
      } while (nextKey)
      log('fetch:page', { rows: rows.length, hasNext: Boolean(nextKey) })
      return rows
    },
    staleTime: 10 * 60 * 1000,
  })

  watchEffect(() => {
    const metadatas = metadataQuery.data.value
    console.log(
      '[useDenomMetadata:watchEffect] metadatas:',
      metadatas?.length ?? 0,
      'isLoading:',
      metadataQuery.isLoading.value
    )
    if (!Array.isArray(metadatas) || metadatas.length === 0) return
    const timestamp = new Date().toISOString()
    for (const metadata of metadatas) {
      const row: DenomMetadataRow = {
        ...metadata,
        primary_unit: metadata.display,
        updated_time: timestamp,
      }
      console.log('[useDenomMetadata:upsert] base:', metadata.base, 'display:', metadata.display)
      void upsertCollectionRow(denomMetadataCollection, metadata.base, row)
    }
  })

  // Use query data directly instead of live query for reactivity
  const baseIndex = computed(() => {
    const map = new Map<string, DenomMetadataRow>()
    const metadatas = metadataQuery.data.value ?? []
    for (const metadata of metadatas) {
      map.set(metadata.base, {
        ...metadata,
        primary_unit: metadata.display,
        updated_time: new Date().toISOString(),
      })
    }
    return map
  })

  const aliasIndex = computed(() => {
    const map = new Map<string, string>()
    const metadatas = metadataQuery.data.value ?? []
    for (const metadata of metadatas) {
      map.set(metadata.base, metadata.base)
      if (metadata.display) map.set(metadata.display, metadata.base)
      for (const unit of metadata.denom_units ?? []) {
        map.set(unit.denom, metadata.base)
        for (const alias of unit.aliases ?? []) {
          map.set(alias, metadata.base)
        }
      }
    }
    return map
  })

  function toBaseDenom(value: string) {
    return aliasIndex.value.get(value) ?? value
  }

  function resolveDisplayDenom(value: string) {
    const base = toBaseDenom(value)
    return baseIndex.value.get(base)?.display ?? base
  }

  function getMetadata(value: string) {
    const base = toBaseDenom(value)
    return baseIndex.value.get(base)
  }

  function normalize(args: { amount: string | number | bigint; denom: string }) {
    const inputDenom = String(args.denom || '')
    const rawAmount = args.amount as unknown

    // Resolve metadata for the base denom corresponding to the input
    const base = toBaseDenom(inputDenom)
    const md = baseIndex.value.get(base)

    // Helper to find a unit entry by denom or alias
    const findUnit = (
      denom: string
    ): { denom: string; exponent: number; aliases?: string[] } | null => {
      const units = md?.denom_units || []
      for (const u of units) {
        if (u.denom === denom) return u
        if ((u.aliases || []).includes(denom)) return u
      }
      return null
    }

    const toBaseAmount = (val: unknown, exp: number): bigint => {
      const s = typeof val === 'bigint' ? val.toString() : String(val || '0').trim()
      if (!s.includes('.')) return BigInt(s || '0') * 10n ** BigInt(exp)
      const [a, bRaw = ''] = s.split('.')
      const frac = bRaw.slice(0, exp)
      const pad = Math.max(0, exp - frac.length)
      const baseStr = (a || '0') + (frac + '0'.repeat(pad))
      return BigInt(baseStr || '0')
    }

    const finalize = (baseAmount: bigint) => {
      const baseDenom = md?.base || base
      const displayDenom = md?.display || baseDenom
      const displayUnit = findUnit(displayDenom)
      const displayExp = Number(displayUnit?.exponent || 0)
      let displayAmountStr = baseAmount.toString()
      if (displayExp > 0) {
        const scale = 10n ** BigInt(displayExp)
        const intPart = baseAmount / scale
        const fracPart = baseAmount % scale
        displayAmountStr =
          fracPart === 0n
            ? intPart.toString()
            : `${intPart.toString()}.${fracPart
                .toString()
                .padStart(displayExp, '0')
                .replace(/0+$/, '')}`
      }
      return {
        base: { amount: baseAmount.toString(), denom: baseDenom },
        display: { amount: displayAmountStr, denom: displayDenom },
        metadata: md || ({} as any),
      }
    }

    // If we have metadata for the base denom, use the input denom's exponent
    if (md) {
      const unit = findUnit(inputDenom) || findUnit(base) || { exponent: 0 }
      const exp = Number(unit?.exponent || 0)
      return finalize(toBaseAmount(rawAmount, exp))
    }

    // Fallback passthrough when no metadata found
    const s = typeof rawAmount === 'bigint' ? rawAmount.toString() : String(rawAmount || '0')
    const baseAmount = BigInt(s.includes('.') ? s.replace(/\..*$/, '') : s)
    return {
      base: { amount: baseAmount.toString(), denom: inputDenom },
      display: { amount: baseAmount.toString(), denom: inputDenom },
      metadata: {
        base: inputDenom,
        display: inputDenom,
        denom_units: [{ denom: inputDenom, exponent: 0 }],
        name: inputDenom,
      },
    }
  }

  function normalizePair(base: string, quote: string) {
    return {
      base: toBaseDenom(base),
      quote: toBaseDenom(quote),
    }
  }

  return {
    data: computed(() => metadataQuery.data.value ?? []),
    isLoading: metadataQuery.isLoading,
    error: metadataQuery.error,
    resolveDisplayDenom,
    resolveBaseDenom: toBaseDenom,
    normalizePair,
    getMetadata,
    normalize,
    refetch: metadataQuery.refetch,
  }
}
