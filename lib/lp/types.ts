/** Plain-data LP input, safe to postMessage into the worker. */
export interface LpInput {
  readonly prices: number[]
  readonly maxBlockEnergyMwh: number
  readonly etaCharge: number
  readonly etaDischarge: number
  readonly socStartMwh: number
  readonly socMinMwh: number
  readonly socMaxMwh: number
  readonly maxThroughputMwh: number
}

export type SolveStatus = 'optimal' | 'feasible' | 'infeasible' | 'unbounded' | 'undefined' | 'error'

export interface Schedule {
  readonly charge: number[]
  readonly discharge: number[]
  readonly soc: number[]
}

export interface LpSolution {
  readonly status: SolveStatus
  readonly schedule: Schedule | null
  readonly objectiveRs: number
  readonly solveMs: number
  readonly message?: string
}

export interface SensitivityCell {
  readonly rtePct: number
  readonly maxCycles: number
  readonly status: SolveStatus
  readonly grossMarginRs: number
  readonly energyDischargedMwh: number
}

export interface SensitivityRequest {
  readonly base: LpInput
  /** Nameplate capacity and DoD are held fixed; only RTE and cycles vary. */
  readonly usableEnergyMwh: number
  readonly rteGrid: number[]
  readonly cycleGrid: number[]
}

export type WorkerRequest =
  | { readonly id: number; readonly kind: 'solve'; readonly payload: LpInput }
  | { readonly id: number; readonly kind: 'sensitivity'; readonly payload: SensitivityRequest }

export type WorkerResponse =
  | { readonly id: number; readonly ok: true; readonly kind: 'solve'; readonly result: LpSolution }
  | { readonly id: number; readonly ok: true; readonly kind: 'sensitivity'; readonly result: SensitivityCell[] }
  | { readonly id: number; readonly ok: false; readonly error: string }
