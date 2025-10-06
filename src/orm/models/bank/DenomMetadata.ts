import { Model, useRepo } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type DenomUnit = { denom: string; exponent: number; aliases?: string[] }
type Metadata = {
  description?: string
  denom_units?: DenomUnit[]
  base?: string
  display?: string
  name?: string
  symbol?: string
  uri?: string
  uri_hash?: string
}

export class DenomMetadata extends Model {
  static entity = 'denoms_metadata'
  static primaryKey = 'base'

  static fields() {
    return {
      base: this.string(''),
      description: this.string(''),
      display: this.string(''),
      name: this.string(''),
      symbol: this.string(''),
      uri: this.string(''),
      uri_hash: this.string(''),
      denom_units: this.attr([] as DenomUnit[]),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAll(this: Request) {
          return this.get(`/cosmos/bank/v1beta1/denoms_metadata`, {
            params: { 'pagination.limit': 1000 },
            dataTransformer: ({ data }: { data: { metadatas?: Metadata[] } }) =>
              (Array.isArray(data?.metadatas) ? data.metadatas : []).map((m) => ({
                base: m.base || '',
                description: m.description || '',
                display: m.display || '',
                name: m.name || '',
                symbol: m.symbol || '',
                uri: m.uri || '',
                uri_hash: m.uri_hash || '',
                denom_units: Array.isArray(m.denom_units) ? m.denom_units : [],
              })),
          })
        },
        async fetchOne(this: Request, denom: string) {
          return this.get(`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(denom)}`, {
            dataTransformer: ({ data }: { data: { metadata?: Metadata } }) => {
              const m = data?.metadata
              return m
                ? [
                    {
                      base: m.base || '',
                      description: m.description || '',
                      display: m.display || '',
                      name: m.name || '',
                      symbol: m.symbol || '',
                      uri: m.uri || '',
                      uri_hash: m.uri_hash || '',
                      denom_units: Array.isArray(m.denom_units) ? m.denom_units : [],
                    },
                  ]
                : []
            },
          })
        },
      },
    },
  }

  // Intentionally no cache controls; callers can refetch via api().fetchAll()

  static getOptions(args: { allowedBases?: string[] } = {}) {
    const allowed = Array.isArray(args.allowedBases) ? args.allowedBases : []
    const list = useRepo(DenomMetadata).all() as unknown as Array<{
      base: string
      display: string
      name: string
      denom_units: Array<{ denom: string; exponent: number; aliases?: string[] }>
    }>
    const bases = allowed.length > 0 ? allowed : list.map((m) => m.base)
    const out: Array<{ display: string; name: string; base: string; exponent: number }> = []
    for (const base of bases) {
      const md = list.find((m) => m.base === base)
      if (!md) {
        out.push({ display: base, name: base, base, exponent: 0 })
        continue
      }
      const display = md.display || base
      const unit = (md.denom_units || []).find(
        (u) => u.denom === display || (u.aliases || []).includes(display)
      )
      const exponent = Number(unit?.exponent || 0)
      out.push({ display, name: md.name || display || base, base, exponent })
    }
    return out
  }

  static normalize(args: { amount: string | number | bigint; denom: string }) {
    const denom = String(args.denom || '')
    const rawAmount = args.amount as unknown

    const all = useRepo(DenomMetadata).all() as unknown as Array<{
      base: string
      display: string
      denom_units: Array<{ denom: string; exponent: number; aliases?: string[] }>
      name?: string
    }>

    const findUnit = (
      md: (typeof all)[number],
      d: string
    ): { denom: string; exponent: number; aliases?: string[] } | null =>
      (md.denom_units || []).find((u) => u.denom === d || (u.aliases || []).includes(d)) || null

    const toBaseAmount = (val: unknown, exp: number): bigint => {
      const s = typeof val === 'bigint' ? val.toString() : String(val || '0').trim()
      if (!s.includes('.')) return BigInt(s || '0') * 10n ** BigInt(exp)
      const [a, bRaw = ''] = s.split('.')
      const frac = bRaw.slice(0, exp)
      const pad = Math.max(0, exp - frac.length)
      const baseStr = (a || '0') + (frac + '0'.repeat(pad))
      return BigInt(baseStr || '0')
    }

    const finalize = (md: (typeof all)[number], baseAmount: bigint) => {
      const baseDenom = md.base
      const displayDenom = md.display || baseDenom
      const displayUnit =
        (md.denom_units || []).find(
          (u) => u.denom === displayDenom || (u.aliases || []).includes(displayDenom)
        ) || null
      const displayExp = Number(displayUnit?.exponent || 0)
      let displayAmountStr = baseAmount.toString()
      if (displayExp > 0) {
        const scale = 10n ** BigInt(displayExp)
        const intPart = baseAmount / scale
        const fracPart = baseAmount % scale
        displayAmountStr =
          fracPart === 0n
            ? intPart.toString()
            : `${intPart.toString()}.${fracPart.toString().padStart(displayExp, '0').replace(/0+$/, '')}`
      }
      return {
        base: { amount: baseAmount.toString(), denom: baseDenom },
        display: { amount: displayAmountStr, denom: displayDenom },
        metadata: md,
      }
    }

    // 1) Exact base match
    const mdBase = all.find((m) => String(m.base) === denom)
    if (mdBase) {
      const exp = Number(findUnit(mdBase, denom)?.exponent || 0)
      return finalize(mdBase, toBaseAmount(rawAmount, exp))
    }

    // 2) Unit match
    for (const md of all) {
      const unit = findUnit(md, denom)
      if (!unit) continue
      return finalize(md, toBaseAmount(rawAmount, Number(unit.exponent || 0)))
    }

    // 3) Unknown denom passthrough (exponent 0)
    const s = typeof rawAmount === 'bigint' ? rawAmount.toString() : String(rawAmount || '0')
    const baseAmount = BigInt(s.includes('.') ? s.replace(/\..*$/, '') : s)
    return {
      base: { amount: baseAmount.toString(), denom },
      display: { amount: baseAmount.toString(), denom },
      metadata: {
        base: denom,
        display: denom,
        denom_units: [{ denom, exponent: 0 }],
        name: denom,
      },
    }
  }
}

export default DenomMetadata
