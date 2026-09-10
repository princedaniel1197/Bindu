'use client'

import { Working } from '@/components/layout/Working'
import { deriveBatteryWorkings, type DerivedBattery } from '@/lib/battery'
import { formatNumber } from '@/lib/format'
import type { BatteryConfig } from '@/lib/types'

interface DerivedPanelProps {
  readonly battery: BatteryConfig
  readonly derived: DerivedBattery
}

export function DerivedPanel({ battery, derived }: DerivedPanelProps) {
  const workings = deriveBatteryWorkings(battery, derived)

  const rows: readonly { readonly key: string; readonly label: string; readonly value: string }[] = [
    { key: 'duration', label: 'Duration', value: `${formatNumber(derived.durationHrs, 2)} h` },
    { key: 'usable', label: 'Usable energy', value: `${formatNumber(derived.usableEnergyMwh, 2)} MWh` },
    {
      key: 'socWindow',
      label: 'SOC window',
      value: `${formatNumber(derived.socMinMwh, 2)}–${formatNumber(derived.socMaxMwh, 2)} MWh`,
    },
    { key: 'eta', label: 'One-way efficiency', value: derived.etaOneWay.toFixed(4) },
    { key: 'blockEnergy', label: 'Energy per block', value: `${formatNumber(derived.maxBlockEnergyMwh, 3)} MWh` },
    { key: 'throughput', label: 'Throughput cap', value: `${formatNumber(derived.maxThroughputMwh, 2)} MWh/day` },
  ]

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-baseline justify-between gap-3 border-b border-edgeSoft pb-1.5">
            <span className="text-xs text-muted">{row.label}</span>
            <span className="num text-xs font-medium text-ink">{row.value}</span>
          </div>
          <Working derivation={workings[row.key]} />
        </div>
      ))}
    </div>
  )
}
