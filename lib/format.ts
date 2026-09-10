const inGrouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatRs(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `₹${formatNumber(value, decimals)}`
}

/** Indian short scale: crore above 1e7, lakh above 1e5. */
export function formatRsCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${formatNumber(abs / 1e7, 2)} Cr`
  if (abs >= 1e5) return `${sign}₹${formatNumber(abs / 1e5, 2)} L`
  return `${sign}₹${inGrouping.format(abs)}`
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatNumber(value, decimals)}%`
}

export function formatYears(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatNumber(value, decimals)} yr`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Snap solver noise to zero so schedules read cleanly. */
export function snap(value: number, epsilon: number): number {
  return Math.abs(value) < epsilon ? 0 : value
}
