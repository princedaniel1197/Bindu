'use client'

import { Stat } from '@/components/layout/Stat'
import { useShowWorking } from '@/components/layout/Working'
import type { DerivedBattery } from '@/lib/battery'
import { economicsWorkings, type EconomicsResult } from '@/lib/economics'
import { formatNumber, formatPct, formatRsCompact, formatYears } from '@/lib/format'
import type { BatteryConfig, EconomicsConfig } from '@/lib/types'

interface EconomicsPanelProps {
  readonly result: EconomicsResult
  readonly battery: BatteryConfig
  readonly economics: EconomicsConfig
  readonly derived: DerivedBattery
  readonly dailyGrossMarginRs: number
  readonly synthetic: boolean
}

export function EconomicsPanel({
  result, battery, economics, derived, dailyGrossMarginRs, synthetic,
}: EconomicsPanelProps) {
  const workings = economicsWorkings(result, battery, economics, derived, dailyGrossMarginRs)
  const showWorking = useShowWorking()
  const hurdleCleared = result.irrPct !== null && result.irrPct >= economics.discountRatePct

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="Capex"
          value={formatRsCompact(result.capexRs)}
          sub={`${formatNumber(battery.energyMwh, 1)} MWh at ₹${formatNumber(economics.capexRsPerKwh, 0)}/kWh`}
          derivation={workings.capex}
        />
        <Stat
          label="Annual O&M"
          value={formatRsCompact(result.annualOmRs)}
          sub={`${formatNumber(battery.powerMw, 1)} MW at ₹${formatNumber(economics.omRsPerKwPerYr, 0)}/kW/yr`}
          derivation={workings.om}
        />
        <Stat
          label="Year-1 revenue"
          value={formatRsCompact(result.year1RevenueRs)}
          sub={`365 days at ${formatRsCompact(dailyGrossMarginRs)}/day`}
          derivation={workings.annualRevenue}
          synthetic={synthetic}
        />
        <Stat
          label={`NPV at ${formatPct(economics.discountRatePct, 1)}`}
          value={formatRsCompact(result.npvRs)}
          tone={result.npvRs > 0 ? 'good' : 'bad'}
          sub={`over ${economics.projectLifeYrs} yr, no residual value`}
          derivation={workings.npv}
          synthetic={synthetic}
        />
        <Stat
          label="Project IRR"
          value={result.irrPct === null ? 'none' : formatPct(result.irrPct, 2)}
          tone={result.irrPct === null ? 'bad' : hurdleCleared ? 'good' : 'bad'}
          sub={
            result.irrPct === null
              ? 'cashflows never recover the capex'
              : hurdleCleared
                ? `clears the ${formatPct(economics.discountRatePct, 1)} hurdle`
                : `below the ${formatPct(economics.discountRatePct, 1)} hurdle`
          }
          derivation={workings.irr}
          synthetic={synthetic}
        />
        <Stat
          label="Simple payback"
          value={result.simplePaybackYrs === null ? 'never' : formatYears(result.simplePaybackYrs, 2)}
          tone={
            result.simplePaybackYrs === null
              ? 'bad'
              : result.simplePaybackYrs <= economics.projectLifeYrs
                ? 'good'
                : 'bad'
          }
          sub={
            result.discountedPaybackYrs === null
              ? 'discounted payback not reached in life'
              : `discounted payback ${formatYears(result.discountedPaybackYrs, 2)}`
          }
          derivation={workings.payback}
          synthetic={synthetic}
        />
      </div>

      <div className="rounded-md border border-warn/30 bg-warn/[0.05] px-3 py-2.5">
        <p className="text-2xs leading-relaxed text-warn/90">
          <span className="font-semibold">One day, scaled.</span> Every annual figure above repeats this single
          optimised day 365 times. Real revenue depends on a year of price shapes, not one. Treat these as the
          economics of this scenario, not a project forecast.
        </p>
      </div>

      {showWorking && (
        <div className="overflow-x-auto rounded-md border border-edgeSoft">
          <table className="w-full min-w-[640px] border-collapse text-2xs">
            <thead>
              <tr className="border-b border-edgeSoft bg-raised/60">
                <th className="px-2.5 py-2 text-left font-medium text-faint">Yr</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">Capacity retained</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">Revenue</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">O&amp;M</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">Net</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">DF</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">Discounted</th>
                <th className="px-2.5 py-2 text-right font-medium text-faint">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.year} className="border-b border-edgeSoft/60 last:border-0">
                  <td className="num px-2.5 py-1.5 text-ink/70">{row.year}</td>
                  <td className="num px-2.5 py-1.5 text-right text-ink/70">{formatPct(row.retention * 100, 2)}</td>
                  <td className="num px-2.5 py-1.5 text-right text-ink/70">{formatRsCompact(row.revenueRs)}</td>
                  <td className="num px-2.5 py-1.5 text-right text-ink/70">−{formatRsCompact(row.omRs)}</td>
                  <td
                    className={`num px-2.5 py-1.5 text-right ${row.netRs >= 0 ? 'text-discharge' : 'text-danger'}`}
                  >
                    {formatRsCompact(row.netRs)}
                  </td>
                  <td className="num px-2.5 py-1.5 text-right text-faint">{row.discountFactor.toFixed(4)}</td>
                  <td className="num px-2.5 py-1.5 text-right text-ink/70">{formatRsCompact(row.discountedRs)}</td>
                  <td
                    className={`num px-2.5 py-1.5 text-right ${
                      row.cumulativeDiscountedRs >= result.capexRs ? 'text-discharge' : 'text-muted'
                    }`}
                  >
                    {formatRsCompact(row.cumulativeDiscountedRs)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-edge bg-raised/40">
                <td className="px-2.5 py-2 font-medium text-faint" colSpan={6}>
                  Less capex {formatRsCompact(result.capexRs)} → NPV
                </td>
                <td
                  className={`num px-2.5 py-2 text-right font-semibold ${
                    result.npvRs >= 0 ? 'text-discharge' : 'text-danger'
                  }`}
                  colSpan={2}
                >
                  {formatRsCompact(result.npvRs)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
