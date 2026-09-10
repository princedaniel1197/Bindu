'use client'

import { NumberField } from '@/components/layout/NumberField'
import { BATTERY_FIELDS } from '@/lib/defaults'
import type { BatteryConfig } from '@/lib/types'

interface BatteryInputsProps {
  readonly battery: BatteryConfig
  readonly onChange: <K extends keyof BatteryConfig>(key: K, value: BatteryConfig[K]) => void
  readonly invalidFields: ReadonlySet<string>
}

const SIZE_KEYS = ['powerMw', 'energyMwh'] as const
const LIMIT_KEYS = ['rtePct', 'dodLimitPct', 'startSocPct', 'maxCyclesPerDay'] as const

export function BatteryInputs({ battery, onChange, invalidFields }: BatteryInputsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {SIZE_KEYS.map((key) => (
          <NumberField
            key={key}
            spec={BATTERY_FIELDS[key]}
            value={battery[key]}
            invalid={invalidFields.has(key)}
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </div>

      <div className="space-y-4 border-t border-edgeSoft pt-4">
        {LIMIT_KEYS.map((key) => (
          <NumberField
            key={key}
            spec={BATTERY_FIELDS[key]}
            value={battery[key]}
            invalid={invalidFields.has(key)}
            withSlider
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </div>
    </div>
  )
}
