import DenomMetadata from '@/orm/models/bank/DenomMetadata'

export function formatTimestamp(value: string): string {
  if (!value) return ''
  const s = String(value).trim()
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) {
    const ms = s.length <= 10 ? n * 1000 : n
    const d = new Date(ms)
    return isNaN(d.getTime()) ? s : d.toLocaleString()
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString()
}

export function formatCoin(c?: { amount?: string; denom?: string } | null): string {
  const amount = String(c?.amount || '0')
  const denom = String(c?.denom || '')
  if (!denom) return amount
  const norm = DenomMetadata.normalize({ amount, denom })
  return `${norm.display.amount} ${norm.display.denom}`
}

export function formatGasPrice(task: {
  task_gas_limit?: string | number
  task_gas_fee?: { amount?: string; denom?: string } | null
}): string {
  const limitNum = Number(task?.task_gas_limit || '0')
  if (!Number.isFinite(limitNum) || limitNum <= 0) return ''
  const fee = task?.task_gas_fee || {}
  const denom = String(fee?.denom || '')
  const amount = String(fee?.amount || '0')
  if (!denom) return ''
  const norm = DenomMetadata.normalize({ amount, denom })
  const displayAmount = Number(norm.display.amount || '0')
  const price = displayAmount / limitNum
  const pretty = Number.isFinite(price)
    ? price.toLocaleString(undefined, { maximumFractionDigits: 8 })
    : '0'
  return `${pretty} ${norm.display.denom}/gas`
}
