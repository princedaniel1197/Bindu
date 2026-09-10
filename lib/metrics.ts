import { BLOCK_HOURS, BLOCKS_PER_DAY } from './constants'
import type { DerivedBattery } from './battery'
import type { Schedule } from './lp/types'
import type { Derivation } from './types'

export interface ScheduleMetrics {
  readonly grossMarginRs: number
  readonly revenueRs: number
  readonly costRs: number
  readonly energyChargedMwh: number
  readonly energyDischargedMwh: number
  readonly effectiveCycles: number
  readonly achievedSpreadRsPerMwh: number
  readonly theoreticalMaxSpreadRsPerMwh: number
  readonly captureRatePct: number
  readonly chargeBlocks: number
  readonly dischargeBlocks: number
  readonly minSocMwh: number
  readonly maxSocMwh: number
  readonly peakPowerMw: number
  readonly throughputUtilisationPct: number
  /** True when the best-case charge and discharge windows would have to share blocks. */
  readonly spreadWindowsOverlap: boolean
}

/** Sums `energy` MWh against the cheapest/dearest blocks, filling one block at a time. */
function weightedTake(sorted: readonly number[], energy: number, blockEnergy: number): number {
  let remaining = energy
  let total = 0
  for (const price of sorted) {
    if (remaining <= 0) break
    const take = Math.min(blockEnergy, remaining)
    total += take * price
    remaining -= take
  }
  return total
}

/**
 * The spread a perfectly-timed operator could have captured moving the same
 * amount of energy: discharge into the dearest blocks, charge from the cheapest,
 * with the efficiency penalty still applied. Power and SOC coupling are ignored,
 * which is what makes it an upper bound.
 */
function theoreticalMaxSpread(
  prices: readonly number[],
  energyDischargedMwh: number,
  blockEnergy: number,
  rte: number,
): { readonly spread: number; readonly overlap: boolean } {
  if (energyDischargedMwh <= 0 || blockEnergy <= 0) return { spread: 0, overlap: false }

  const energyChargedMwh = energyDischargedMwh / rte
  const descending = [...prices].sort((a, b) => b - a)
  const ascending = [...prices].sort((a, b) => a - b)

  const bestRevenue = weightedTake(descending, energyDischargedMwh, blockEnergy)
  const bestCost = weightedTake(ascending, energyChargedMwh, blockEnergy)

  const dischargeBlocks = Math.ceil(energyDischargedMwh / blockEnergy)
  const chargeBlocks = Math.ceil(energyChargedMwh / blockEnergy)

  return {
    spread: (bestRevenue - bestCost) / energyDischargedMwh,
    overlap: dischargeBlocks + chargeBlocks > BLOCKS_PER_DAY,
  }
}

export function computeMetrics(
  schedule: Schedule,
  prices: readonly number[],
  battery: DerivedBattery,
): ScheduleMetrics {
  let revenueRs = 0
  let costRs = 0
  let energyChargedMwh = 0
  let energyDischargedMwh = 0
  let chargeBlocks = 0
  let dischargeBlocks = 0
  let peakPowerMw = 0

  for (let t = 0; t < BLOCKS_PER_DAY; t += 1) {
    const c = schedule.charge[t]
    const d = schedule.discharge[t]
    revenueRs += d * prices[t]
    costRs += c * prices[t]
    energyChargedMwh += c
    energyDischargedMwh += d
    if (c > 0) chargeBlocks += 1
    if (d > 0) dischargeBlocks += 1
    peakPowerMw = Math.max(peakPowerMw, (c + d) / BLOCK_HOURS)
  }

  const rte = battery.etaOneWay ** 2
  const { spread: theoretical, overlap } = theoreticalMaxSpread(
    prices, energyDischargedMwh, battery.maxBlockEnergyMwh, rte,
  )

  const grossMarginRs = revenueRs - costRs
  const achievedSpreadRsPerMwh = energyDischargedMwh > 0 ? grossMarginRs / energyDischargedMwh : 0

  return {
    grossMarginRs,
    revenueRs,
    costRs,
    energyChargedMwh,
    energyDischargedMwh,
    effectiveCycles: battery.usableEnergyMwh > 0 ? energyDischargedMwh / battery.usableEnergyMwh : 0,
    achievedSpreadRsPerMwh,
    theoreticalMaxSpreadRsPerMwh: theoretical,
    captureRatePct: theoretical > 0 ? (achievedSpreadRsPerMwh / theoretical) * 100 : Number.NaN,
    chargeBlocks,
    dischargeBlocks,
    minSocMwh: Math.min(...schedule.soc),
    maxSocMwh: Math.max(...schedule.soc),
    peakPowerMw,
    throughputUtilisationPct:
      battery.maxThroughputMwh > 0 ? (energyDischargedMwh / battery.maxThroughputMwh) * 100 : Number.NaN,
    spreadWindowsOverlap: overlap,
  }
}

export function metricWorkings(m: ScheduleMetrics, battery: DerivedBattery): Record<string, Derivation> {
  return {
    grossMargin: {
      formula: 'gross margin = Σ_t d_t · price_t  −  Σ_t c_t · price_t',
      substitution: `₹${m.revenueRs.toFixed(0)} discharge revenue − ₹${m.costRs.toFixed(0)} charging cost = ₹${m.grossMarginRs.toFixed(0)}`,
      inputs: [
        { label: 'Blocks discharging', value: `${m.dischargeBlocks} of ${BLOCKS_PER_DAY}` },
        { label: 'Blocks charging', value: `${m.chargeBlocks} of ${BLOCKS_PER_DAY}` },
      ],
      notes: ['Energy is metered at the grid connection, so efficiency losses are already inside these two sums.'],
    },
    energyCycled: {
      formula: 'energy cycled = Σ_t d_t  (grid-side discharge)',
      substitution: `${m.energyDischargedMwh.toFixed(3)} MWh discharged, drawn from ${m.energyChargedMwh.toFixed(3)} MWh charged`,
      notes: [`Throughput cap is ${battery.maxThroughputMwh.toFixed(2)} MWh; this run uses ${m.throughputUtilisationPct.toFixed(1)}% of it.`],
    },
    cycles: {
      formula: 'effective cycles = energy discharged ÷ usable energy',
      substitution: `${m.energyDischargedMwh.toFixed(3)} MWh ÷ ${battery.usableEnergyMwh.toFixed(2)} MWh = ${m.effectiveCycles.toFixed(3)}`,
    },
    spread: {
      formula: 'achieved spread = gross margin ÷ energy discharged',
      substitution: `₹${m.grossMarginRs.toFixed(0)} ÷ ${m.energyDischargedMwh.toFixed(3)} MWh = ₹${m.achievedSpreadRsPerMwh.toFixed(2)}/MWh`,
    },
    capture: {
      formula: 'capture rate = achieved spread ÷ theoretical max spread',
      substitution: `₹${m.achievedSpreadRsPerMwh.toFixed(2)} ÷ ₹${m.theoreticalMaxSpreadRsPerMwh.toFixed(2)} = ${m.captureRatePct.toFixed(1)}%`,
      notes: [
        'Theoretical max moves the same energy but ignores SOC coupling and block ordering: it discharges into the dearest blocks and charges from the cheapest, still paying the round-trip efficiency penalty.',
        'It is an upper bound no real schedule can beat, so the ratio never exceeds 100%.',
        ...(m.spreadWindowsOverlap
          ? ['The best-case charge and discharge windows overlap at this throughput, so the bound is loose.']
          : []),
      ],
    },
  }
}
