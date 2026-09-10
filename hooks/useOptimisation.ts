'use client'

import { useEffect, useRef, useState } from 'react'
import { solveLp, solveSensitivity } from '@/lib/lp/client'
import type { LpInput, LpSolution, SensitivityCell, SensitivityRequest } from '@/lib/lp/types'

export interface AsyncState<T> {
  readonly data: T | null
  readonly pending: boolean
  readonly error: string | null
}

const IDLE: AsyncState<never> = { data: null, pending: false, error: null }

/**
 * Runs one LP per settled input. A monotonic token discards responses from
 * superseded requests, so a slow solve can never overwrite a newer result.
 */
export function useOptimisation(input: LpInput | null, enabled: boolean): AsyncState<LpSolution> {
  const [state, setState] = useState<AsyncState<LpSolution>>(IDLE)
  const token = useRef(0)

  useEffect(() => {
    if (!enabled || !input) {
      setState(IDLE)
      return
    }

    token.current += 1
    const current = token.current
    setState((prev) => ({ data: prev.data, pending: true, error: null }))

    solveLp(input)
      .then((result) => {
        if (token.current !== current) return
        setState({ data: result, pending: false, error: null })
      })
      .catch((error: unknown) => {
        if (token.current !== current) return
        setState({
          data: null,
          pending: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }, [input, enabled])

  return state
}

export function useSensitivity(
  request: SensitivityRequest | null,
  enabled: boolean,
): AsyncState<SensitivityCell[]> {
  const [state, setState] = useState<AsyncState<SensitivityCell[]>>(IDLE)
  const token = useRef(0)

  useEffect(() => {
    if (!enabled || !request) {
      setState(IDLE)
      return
    }

    token.current += 1
    const current = token.current
    setState((prev) => ({ data: prev.data, pending: true, error: null }))

    solveSensitivity(request)
      .then((result) => {
        if (token.current !== current) return
        setState({ data: result, pending: false, error: null })
      })
      .catch((error: unknown) => {
        if (token.current !== current) return
        setState({
          data: null,
          pending: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }, [request, enabled])

  return state
}
