'use client'

import { Callout } from '@/components/layout/Callout'
import type { SolveStatus } from '@/lib/lp/types'
import type { ValidationIssue } from '@/lib/types'

/**
 * Plain-language explanations for a solver that did not return an optimum.
 * Each names the constraint that is doing the damage rather than reporting a status code.
 */
const STATUS_COPY: Record<Exclude<SolveStatus, 'optimal' | 'feasible'>, { title: string; detail: string }> = {
  infeasible: {
    title: 'No schedule satisfies every constraint',
    detail:
      'The solver could not find any charge/discharge plan that stays inside the SOC window, respects the power limit, honours the throughput cap and still returns to the starting state of charge at block 96. The usual cause is a state-of-charge window that excludes the starting SOC — check the depth-of-discharge limit against your starting SOC.',
  },
  unbounded: {
    title: 'The problem is unbounded',
    detail:
      'Profit grows without limit, which means a binding constraint is missing. Check that the power rating and energy capacity are both above zero.',
  },
  undefined: {
    title: 'The solver returned no solution',
    detail:
      'GLPK finished without a defined solution. This usually points at a degenerate configuration such as a zero-capacity or zero-power battery.',
  },
  error: {
    title: 'The optimiser failed',
    detail: 'The worker did not return a usable result.',
  },
}

interface SolveNoticeProps {
  readonly issues: readonly ValidationIssue[]
  readonly status: SolveStatus | null
  readonly workerError: string | null
}

export function SolveNotice({ issues, status, workerError }: SolveNoticeProps) {
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const statusCopy =
    status && status !== 'optimal' && status !== 'feasible' ? STATUS_COPY[status] : null

  if (errors.length === 0 && warnings.length === 0 && !statusCopy && !workerError) return null

  return (
    <div className="space-y-2">
      {workerError && (
        <Callout tone="danger" title="The optimiser worker could not run">
          <p>{workerError}</p>
          <p className="text-faint">
            The linear programme runs in a Web Worker. If your browser blocks workers, or the page was opened from a
            file:// URL, the solver cannot start.
          </p>
        </Callout>
      )}

      {errors.map((issue) => (
        <Callout key={issue.field + issue.title} tone="danger" title={issue.title}>
          <p>{issue.detail}</p>
          {issue.fix && <p className="font-medium text-ink/90">Fix: {issue.fix}</p>}
        </Callout>
      ))}

      {statusCopy && errors.length === 0 && (
        <Callout tone="danger" title={statusCopy.title}>
          <p>{statusCopy.detail}</p>
        </Callout>
      )}

      {warnings.map((issue) => (
        <Callout key={issue.field + issue.title} tone="warn" title={issue.title}>
          <p>{issue.detail}</p>
          {issue.fix && <p className="font-medium text-ink/90">Fix: {issue.fix}</p>}
        </Callout>
      ))}
    </div>
  )
}
