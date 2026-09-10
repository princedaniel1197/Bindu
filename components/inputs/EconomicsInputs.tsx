'use client'

import { NumberField } from '@/components/layout/NumberField'
import { ECONOMICS_FIELDS } from '@/lib/defaults'
import type { EconomicsConfig } from '@/lib/types'

interface EconomicsInputsProps {
  readonly economics: EconomicsConfig
  readonly onChange: <K extends keyof EconomicsConfig>(key: K, value: EconomicsConfig[K]) => void
  readonly invalidFields: ReadonlySet<string>
}

const KEYS = [
  'capexRsPerKwh',
  'omRsPerKwPerYr',
  'projectLifeYrs',
  'discountRatePct',
  'degradationPctPerYr',
] as const

export function EconomicsInputs({ economics, onChange, invalidFields }: EconomicsInputsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map((key) => (
          <NumberField
            key={key}
            spec={ECONOMICS_FIELDS[key]}
            value={economics[key]}
            invalid={invalidFields.has(key)}
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </div>
      <p className="rounded-md border border-edgeSoft bg-base/50 px-2.5 py-2 text-2xs leading-relaxed text-muted">
        Fields marked <span className="font-semibold text-warn">assumption</span> have no sourced default. They are
        starting points for you to replace with your own project&apos;s numbers, not figures taken from any market.
      </p>
    </div>
  )
}
