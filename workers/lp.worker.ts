import GLPK from 'glpk.js'
import { BLOCKS_PER_DAY } from '../lib/constants'
import { buildLpModel, extractSchedule } from '../lib/lp/model'
import type {
  LpInput, LpSolution, SensitivityCell, SensitivityRequest, SolveStatus,
  WorkerRequest, WorkerResponse,
} from '../lib/lp/types'

/**
 * Typed view of the worker global. Declared structurally rather than pulling in
 * the webworker lib, which collides with the DOM lib used by the rest of the app.
 */
const ctx = self as unknown as {
  postMessage(data: WorkerResponse): void
  addEventListener(type: 'message', handler: (event: { data: WorkerRequest }) => void): void
}

interface GlpkResult {
  readonly result: { readonly status: number; readonly z: number; readonly vars: Record<string, number> }
}

interface GlpkModule {
  readonly GLP_MAX: number
  readonly GLP_DB: number
  readonly GLP_UP: number
  readonly GLP_FX: number
  readonly GLP_OPT: number
  readonly GLP_FEAS: number
  readonly GLP_INFEAS: number
  readonly GLP_NOFEAS: number
  readonly GLP_UNBND: number
  readonly GLP_MSG_OFF: number
  solve(lp: unknown, options?: unknown): GlpkResult | Promise<GlpkResult>
}

/**
 * The browser build of glpk.js resolves asynchronously and inlines its own
 * WASM worker, so the published type (a synchronous factory) does not describe it.
 */
const createGlpk = GLPK as unknown as () => Promise<GlpkModule>

let glpkPromise: Promise<GlpkModule> | null = null
function getGlpk(): Promise<GlpkModule> {
  if (!glpkPromise) glpkPromise = createGlpk()
  return glpkPromise
}

function toStatus(glpk: GlpkModule, status: number): SolveStatus {
  if (status === glpk.GLP_OPT) return 'optimal'
  if (status === glpk.GLP_FEAS) return 'feasible'
  if (status === glpk.GLP_NOFEAS || status === glpk.GLP_INFEAS) return 'infeasible'
  if (status === glpk.GLP_UNBND) return 'unbounded'
  return 'undefined'
}

async function solve(input: LpInput): Promise<LpSolution> {
  const glpk = await getGlpk()
  const started = Date.now()

  const lp = buildLpModel(input, glpk)
  const res = await Promise.resolve(
    glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: true }),
  )

  const status = toStatus(glpk, res.result.status)
  const solveMs = Date.now() - started

  if (status !== 'optimal' && status !== 'feasible') {
    return { status, schedule: null, objectiveRs: 0, solveMs }
  }

  const schedule = extractSchedule(res.result.vars, input)

  // Recompute the objective from the snapped schedule so the headline figure
  // matches the schedule the user is shown, not the raw solver value.
  let objectiveRs = 0
  for (let t = 0; t < BLOCKS_PER_DAY; t += 1) {
    objectiveRs += (schedule.discharge[t] - schedule.charge[t]) * input.prices[t]
  }

  return { status, schedule, objectiveRs, solveMs }
}

async function sensitivity(request: SensitivityRequest): Promise<SensitivityCell[]> {
  const cells: SensitivityCell[] = []

  for (const rtePct of request.rteGrid) {
    const eta = Math.sqrt(rtePct / 100)
    for (const maxCycles of request.cycleGrid) {
      const input: LpInput = {
        ...request.base,
        etaCharge: eta,
        etaDischarge: eta,
        maxThroughputMwh: maxCycles * request.usableEnergyMwh,
      }
      const solution = await solve(input)
      const energyDischargedMwh = solution.schedule
        ? solution.schedule.discharge.reduce((sum, v) => sum + v, 0)
        : 0
      cells.push({
        rtePct,
        maxCycles,
        status: solution.status,
        grossMarginRs: solution.objectiveRs,
        energyDischargedMwh,
      })
    }
  }

  return cells
}

ctx.addEventListener('message', (event) => {
  const request = event.data
  const run = async (): Promise<void> => {
    try {
      if (request.kind === 'solve') {
        ctx.postMessage({ id: request.id, ok: true, kind: 'solve', result: await solve(request.payload) })
      } else {
        ctx.postMessage({ id: request.id, ok: true, kind: 'sensitivity', result: await sensitivity(request.payload) })
      }
    } catch (error) {
      ctx.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  void run()
})
