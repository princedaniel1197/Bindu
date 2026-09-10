/** Physical and market-structure constants. These are definitions, not assumptions. */
export const BLOCKS_PER_DAY = 96
export const BLOCK_HOURS = 0.25
export const HOURS_PER_DAY = 24
export const DAYS_PER_YEAR = 365
export const KWH_PER_MWH = 1000
export const KW_PER_MW = 1000

/** Values below this are treated as solver noise and snapped to zero. */
export const SOLVER_EPSILON = 1e-7

/** Sensitivity grid axes, fixed by spec. */
export const SENSITIVITY_RTE_PCT = [80, 85, 90, 95] as const
export const SENSITIVITY_MAX_CYCLES = [1.0, 1.5, 2.0, 2.5] as const

/** Convert a 15-minute block index (0-95) to a clock label. */
export function blockToClock(block: number): string {
  const minutes = block * (HOURS_PER_DAY * 60) / BLOCKS_PER_DAY
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Inclusive clock span covered by a block, e.g. "18:30-18:45". */
export function blockToSpan(block: number): string {
  return `${blockToClock(block)}-${blockToClock(block + 1)}`
}
