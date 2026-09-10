'use client'

import { useShowWorking } from '@/components/layout/Working'
import { SENSITIVITY_MAX_CYCLES, SENSITIVITY_RTE_PCT } from '@/lib/constants'
import { formatNumber, formatPct, formatRsCompact } from '@/lib/format'
import type { SensitivityCell } from '@/lib/lp/types'

interface SensitivityGridProps {
  readonly cells: readonly SensitivityCell[] | null
  readonly pending: boolean
  readonly error: string | null
  readonly currentRtePct: number
  readonly currentMaxCycles: number
}

const APPROX = 1e-9

function isCurrent(cell: SensitivityCell, rtePct: number, maxCycles: number): boolean {
  return Math.abs(cell.rtePct - rtePct) < APPROX && Math.abs(cell.maxCycles - maxCycles) < APPROX
}

export function SensitivityGrid({
  cells, pending, error, currentRtePct, currentMaxCycles,
}: SensitivityGridProps) {
  const showWorking = useShowWorking()

  if (error) {
    return <p className="text-2xs leading-relaxed text-danger">Sensitivity run failed: {error}</p>
  }

  if (!cells) {
    return (
      <p className="text-2xs text-muted">
        {pending ? 'Solving 16 linear programmes…' : 'Sensitivity runs once the base case solves.'}
      </p>
    )
  }

  const lookup = new Map(cells.map((cell) => [`${cell.rtePct}|${cell.maxCycles}`, cell]))
  const margins = cells.filter((c) => c.status === 'optimal' || c.status === 'feasible').map((c) => c.grossMarginRs)
  const best = margins.length > 0 ? Math.max(...margins) : 0
  const worst = margins.length > 0 ? Math.min(...margins) : 0
  const range = best - worst

  const onGrid = cells.some((cell) => isCurrent(cell, currentRtePct, currentMaxCycles))
  const currentCell = cells.find((cell) => isCurrent(cell, currentRtePct, currentMaxCycles)) ?? null

  return (
    <div className={`space-y-3 transition-opacity ${pending ? 'opacity-50' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="label-xs px-2 py-2 text-left">
                RTE \ cycles
              </th>
              {SENSITIVITY_MAX_CYCLES.map((cycles) => (
                <th
                  key={cycles}
                  className={`num px-2 py-2 text-right text-2xs font-medium ${
                    Math.abs(cycles - currentMaxCycles) < APPROX ? 'text-price' : 'text-faint'
                  }`}
                >
                  {formatNumber(cycles, 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SENSITIVITY_RTE_PCT.map((rte) => (
              <tr key={rte}>
                <th
                  className={`num px-2 py-1.5 text-left text-2xs font-medium ${
                    Math.abs(rte - currentRtePct) < APPROX ? 'text-price' : 'text-faint'
                  }`}
                >
                  {rte}%
                </th>
                {SENSITIVITY_MAX_CYCLES.map((cycles) => {
                  const cell = lookup.get(`${rte}|${cycles}`)
                  if (!cell) {
                    return (
                      <td key={cycles} className="px-1 py-1">
                        <div className="rounded border border-edgeSoft bg-raised/40 px-2 py-2 text-center text-2xs text-faint">
                          —
                        </div>
                      </td>
                    )
                  }

                  const solved = cell.status === 'optimal' || cell.status === 'feasible'
                  const intensity = solved && range > 0 ? (cell.grossMarginRs - worst) / range : 0
                  const here = isCurrent(cell, currentRtePct, currentMaxCycles)

                  return (
                    <td key={cycles} className="px-1 py-1">
                      <div
                        className={`relative rounded border px-2 py-2 text-right transition-colors ${
                          here ? 'border-price ring-1 ring-price/50' : 'border-edgeSoft'
                        }`}
                        style={{
                          backgroundColor: solved
                            ? `rgba(46, 208, 149, ${0.05 + intensity * 0.22})`
                            : 'transparent',
                        }}
                        title={
                          solved
                            ? `RTE ${rte}%, ${cycles} cycles/day → ${formatNumber(cell.energyDischargedMwh, 2)} MWh discharged`
                            : `Solver status: ${cell.status}`
                        }
                      >
                        {here && (
                          <span className="absolute left-1.5 top-1.5 rounded-sm bg-price px-1 text-[8px] font-bold uppercase tracking-wide text-base">
                            now
                          </span>
                        )}
                        <p className={`num text-xs font-semibold ${solved ? 'text-ink' : 'text-danger'}`}>
                          {solved ? formatRsCompact(cell.grossMarginRs) : cell.status}
                        </p>
                        {solved && (
                          <p className="num text-[9px] text-muted">
                            {formatNumber(cell.energyDischargedMwh, 1)} MWh
                          </p>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!onGrid && (
        <p className="text-2xs leading-relaxed text-warn">
          Your configuration ({formatPct(currentRtePct, 1)} RTE, {formatNumber(currentMaxCycles, 2)} cycles) does not
          land on a grid point, so no cell is marked <span className="font-semibold">now</span>. The grid axes are
          fixed at {SENSITIVITY_RTE_PCT.join('/')}% and {SENSITIVITY_MAX_CYCLES.join('/')} cycles.
        </p>
      )}

      {currentCell && (
        <p className="text-2xs leading-relaxed text-muted">
          Current cell earns {formatRsCompact(currentCell.grossMarginRs)}/day. The best cell on this grid earns{' '}
          {formatRsCompact(best)}/day — a spread of {formatRsCompact(range)} between the best and worst corner.
        </p>
      )}

      {showWorking && (
        <div className="rounded-md border border-edgeSoft bg-base/60 p-2.5">
          <p className="font-mono text-2xs text-price">
            each cell = full 96-block LP re-solved with η = √RTE and throughput cap = cycles × usable energy
          </p>
          <ul className="mt-1.5 space-y-1 text-2xs leading-relaxed text-muted">
            <li className="flex gap-1.5">
              <span aria-hidden className="text-faint">—</span>
              <span>
                Only RTE and the cycle cap vary. Power rating, energy capacity, DoD limit, starting SOC and the price
                series are held at your current values.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span aria-hidden className="text-faint">—</span>
              <span>Shading runs from the weakest to the strongest cell in this grid, not against any absolute scale.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
