'use client'

import { createContext, useContext } from 'react'
import type { Derivation } from '@/lib/types'

const WorkingContext = createContext(false)

export const WorkingProvider = WorkingContext.Provider

export function useShowWorking(): boolean {
  return useContext(WorkingContext)
}

/**
 * Renders the derivation behind a number. Nothing is shown unless the global
 * "show working" toggle is on, so every figure on the page can be traced back
 * to its formula and its inputs without cluttering the default view.
 */
export function Working({ derivation }: { derivation: Derivation }) {
  const enabled = useShowWorking()
  if (!enabled) return null

  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-edgeSoft bg-base/60 p-2.5">
      <p className="font-mono text-2xs leading-relaxed text-price">{derivation.formula}</p>
      {derivation.substitution && (
        <p className="num text-2xs leading-relaxed text-ink/80">{derivation.substitution}</p>
      )}
      {derivation.inputs && derivation.inputs.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-0.5">
          {derivation.inputs.map((input) => (
            <div key={input.label} className="contents">
              <dt className="text-2xs text-faint">{input.label}</dt>
              <dd className="num text-2xs text-ink/70">{input.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {derivation.notes && derivation.notes.length > 0 && (
        <ul className="space-y-1 pt-0.5">
          {derivation.notes.map((note) => (
            <li key={note} className="flex gap-1.5 text-2xs leading-relaxed text-muted">
              <span aria-hidden className="text-faint">—</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
