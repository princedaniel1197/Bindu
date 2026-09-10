import { BLOCKS_PER_DAY, SOLVER_EPSILON } from '../constants'
import { snap } from '../format'
import type { LpInput, Schedule } from './types'

export interface GlpConstants {
  readonly GLP_MAX: number
  readonly GLP_DB: number
  readonly GLP_UP: number
  readonly GLP_FX: number
}

interface LpVar { readonly name: string; readonly coef: number }
interface LpRow {
  readonly name: string
  readonly vars: LpVar[]
  readonly bnds: { readonly type: number; readonly lb: number; readonly ub: number }
}

export interface GlpkLp {
  readonly name: string
  readonly objective: { readonly direction: number; readonly name: string; readonly vars: LpVar[] }
  readonly subjectTo: LpRow[]
  readonly bounds: { readonly name: string; readonly type: number; readonly lb: number; readonly ub: number }[]
}

export const chargeVar = (t: number): string => `c${t}`
export const dischargeVar = (t: number): string => `d${t}`

/**
 * Perfect-foresight arbitrage LP over 96 blocks.
 *
 *   max  Σ_t (d_t − c_t) · price_t
 *   s.t. 0 ≤ c_t ≤ P·Δt,  0 ≤ d_t ≤ P·Δt
 *        SOC_t = SOC_0 + Σ_{s≤t} (c_s·η_c − d_s/η_d)   ∈ [SOC_min, SOC_max]
 *        Σ_t d_t ≤ max_cycles · usable_energy
 *        SOC_95 = SOC_0
 *
 * The recursive SOC balance is expanded into a running sum so each block's SOC
 * is a single linear row over the charge/discharge variables that precede it.
 */
export function buildLpModel(input: LpInput, glp: GlpConstants): GlpkLp {
  const {
    prices, maxBlockEnergyMwh, etaCharge, etaDischarge,
    socStartMwh, socMinMwh, socMaxMwh, maxThroughputMwh,
  } = input

  const objectiveVars: LpVar[] = []
  const bounds: GlpkLp['bounds'] = []
  for (let t = 0; t < BLOCKS_PER_DAY; t += 1) {
    objectiveVars.push({ name: dischargeVar(t), coef: prices[t] })
    objectiveVars.push({ name: chargeVar(t), coef: -prices[t] })
    bounds.push({ name: chargeVar(t), type: glp.GLP_DB, lb: 0, ub: maxBlockEnergyMwh })
    bounds.push({ name: dischargeVar(t), type: glp.GLP_DB, lb: 0, ub: maxBlockEnergyMwh })
  }

  const subjectTo: LpRow[] = []

  // SOC corridor for every block except the last, expressed relative to SOC_0.
  const running: LpVar[] = []
  for (let t = 0; t < BLOCKS_PER_DAY; t += 1) {
    running.push({ name: chargeVar(t), coef: etaCharge })
    running.push({ name: dischargeVar(t), coef: -1 / etaDischarge })

    if (t < BLOCKS_PER_DAY - 1) {
      subjectTo.push({
        name: `soc_${t}`,
        vars: running.slice(),
        bnds: { type: glp.GLP_DB, lb: socMinMwh - socStartMwh, ub: socMaxMwh - socStartMwh },
      })
    }
  }

  // Terminal condition: end where you started. Net SOC movement over the day is zero.
  subjectTo.push({
    name: 'soc_terminal',
    vars: running.slice(),
    bnds: { type: glp.GLP_FX, lb: 0, ub: 0 },
  })

  // Throughput cap standing in for cycle life.
  subjectTo.push({
    name: 'throughput',
    vars: Array.from({ length: BLOCKS_PER_DAY }, (_, t) => ({ name: dischargeVar(t), coef: 1 })),
    bnds: { type: glp.GLP_UP, lb: 0, ub: maxThroughputMwh },
  })

  return {
    name: 'bess_arbitrage',
    objective: { direction: glp.GLP_MAX, name: 'gross_margin_rs', vars: objectiveVars },
    subjectTo,
    bounds,
  }
}

/** Rebuilds the SOC trajectory from the solved charge/discharge decisions. */
export function extractSchedule(
  vars: Record<string, number>,
  input: LpInput,
): Schedule {
  const charge: number[] = []
  const discharge: number[] = []
  const soc: number[] = []

  let level = input.socStartMwh
  for (let t = 0; t < BLOCKS_PER_DAY; t += 1) {
    const c = snap(Math.max(0, vars[chargeVar(t)] ?? 0), SOLVER_EPSILON)
    const d = snap(Math.max(0, vars[dischargeVar(t)] ?? 0), SOLVER_EPSILON)
    charge.push(c)
    discharge.push(d)
    level += c * input.etaCharge - d / input.etaDischarge
    soc.push(level)
  }

  return { charge, discharge, soc }
}
