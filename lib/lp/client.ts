import type { LpInput, LpSolution, SensitivityCell, SensitivityRequest, WorkerRequest, WorkerResponse } from './types'

interface Pending {
  readonly resolve: (value: never) => void
  readonly reject: (reason: Error) => void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function failAll(message: string): void {
  pending.forEach((entry) => entry.reject(new Error(message)))
  pending.clear()
}

function ensureWorker(): Worker {
  if (worker) return worker

  const created = new Worker(new URL('../../workers/lp.worker.ts', import.meta.url))

  created.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data
    const entry = pending.get(response.id)
    if (!entry) return
    pending.delete(response.id)
    if (response.ok) {
      ;(entry.resolve as (value: unknown) => void)(response.result)
    } else {
      entry.reject(new Error(response.error))
    }
  }

  created.onerror = (event: ErrorEvent) => {
    // A worker-level failure invalidates every request in flight.
    failAll(event.message || 'The optimiser worker failed to start.')
    worker?.terminate()
    worker = null
  }

  worker = created
  return created
}

function dispatch<T>(build: (id: number) => WorkerRequest): Promise<T> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('The optimiser only runs in the browser.'))
  }
  return new Promise<T>((resolve, reject) => {
    const id = nextId
    nextId += 1
    pending.set(id, { resolve: resolve as (value: never) => void, reject })
    try {
      ensureWorker().postMessage(build(id))
    } catch (error) {
      pending.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

export function solveLp(payload: LpInput): Promise<LpSolution> {
  return dispatch<LpSolution>((id) => ({ id, kind: 'solve', payload }))
}

export function solveSensitivity(payload: SensitivityRequest): Promise<SensitivityCell[]> {
  return dispatch<SensitivityCell[]>((id) => ({ id, kind: 'sensitivity', payload }))
}
