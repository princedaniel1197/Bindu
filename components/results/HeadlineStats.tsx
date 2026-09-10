'use client'

import { Stat } from '@/components/layout/Stat'
import type { DerivedBattery } from '@/lib/battery'
import { formatNumber, formatPct, formatRs, formatRsCompact } from '@/lib/format'
import { metricWorkings, type ScheduleMetrics } from '@/lib/metrics'

interface HeadlineStatsProps {
  readonly metrics: ScheduleMetrics
  readonly battery: DerivedBattery
  readonly synthetic: boolean
}

export function HeadlineStats({ metrics, battery, synthetic }: HeadlineStatsProps) {
  const workings = metricWorkings(metrics, battery)
  const captureKnown = Number.isFinite(metrics.captureRatePct)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Stat
        label="Daily gross margin"
        value={formatRsCompact(metrics.grossMarginRs)}
        sub={`${formatRs(metrics.revenueRs)} sold − ${formatRs(metrics.costRs)} bought`}
        tone={metrics.grossMarginRs > 0 ? 'good' : metrics.grossMarginRs < 0 ? 'bad' : 'muted'}
        derivation={workings.grossMargin}
        synthetic={synthetic}
      />

      <Stat
        label="Energy cycled"
        value={`${formatNumber(metrics.energyDischargedMwh, 2)} MWh`}
        sub={`${formatNumber(metrics.energyChargedMwh, 2)} MWh charged · ${formatPct(metrics.throughputUtilisationPct)} of throughput cap`}
        derivation={workings.energyCycled}
        synthetic={synthetic}
      />

      <Stat
        label="Effective cycles"
        value={formatNumber(metrics.effectiveCycles, 3)}
        sub={`against a ${formatNumber(battery.maxThroughputMwh, 2)} MWh daily cap`}
        derivation={workings.cycles}
        synthetic={synthetic}
      />

      <Stat
        label="Achieved spread"
        value={`${formatRs(metrics.achievedSpreadRsPerMwh, 0)}/MWh`}
        sub={`theoretical best ${formatRs(metrics.theoreticalMaxSpreadRsPerMwh, 0)}/MWh`}
        derivation={workings.spread}
        synthetic={synthetic}
      />

      <Stat
        label="Capture rate"
        value={captureKnown ? formatPct(metrics.captureRatePct) : '—'}
        sub={
          captureKnown
            ? 'share of the perfectly-timed spread this schedule realises'
            : 'undefined while the battery does not cycle'
        }
        tone={captureKnown && metrics.captureRatePct >= 70 ? 'good' : 'default'}
        derivation={workings.capture}
        synthetic={synthetic}
      />

      <Stat
        label="SOC range used"
        value={`${formatNumber(metrics.minSocMwh, 1)}–${formatNumber(metrics.maxSocMwh, 1)} MWh`}
        sub={`window allows ${formatNumber(battery.socMinMwh, 1)}–${formatNumber(battery.socMaxMwh, 1)} MWh · peak ${formatNumber(metrics.peakPowerMw, 2)} MW`}
        derivation={{
          formula: 'SOC_t = SOC_0 + Σ_{s≤t} (c_s · η_c − d_s / η_d)',
          substitution: `SOC_0 = ${formatNumber(battery.socStartMwh, 2)} MWh, η one-way = ${battery.etaOneWay.toFixed(4)}`,
          notes: [
            'The terminal constraint forces SOC at block 96 back to SOC_0, so the day is self-contained.',
            `Peak power drawn was ${formatNumber(metrics.peakPowerMw, 2)} MW against a ${formatNumber(battery.maxBlockEnergyMwh * 4, 2)} MW rating.`,
          ],
        }}
        synthetic={synthetic}
      />
    </div>
  )
}
