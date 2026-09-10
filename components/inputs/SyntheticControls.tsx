'use client'

import { NumberField } from '@/components/layout/NumberField'
import { SYNTHETIC_FIELDS } from '@/lib/defaults'
import type { SyntheticConfig } from '@/lib/types'

interface SyntheticControlsProps {
  readonly synthetic: SyntheticConfig
  readonly onChange: <K extends keyof SyntheticConfig>(key: K, value: SyntheticConfig[K]) => void
}

const SLIDER_KEYS = ['peakRsPerMwh', 'troughRsPerMwh', 'volatilityPct'] as const

export function SyntheticControls({ synthetic, onChange }: SyntheticControlsProps) {
  const inverted = synthetic.peakRsPerMwh <= synthetic.troughRsPerMwh

  return (
    <div className="space-y-4">
      {SLIDER_KEYS.map((key) => (
        <NumberField
          key={key}
          spec={SYNTHETIC_FIELDS[key]}
          value={synthetic[key]}
          withSlider
          onChange={(value) => onChange(key, value)}
        />
      ))}

      <div className="flex items-end gap-2 border-t border-edgeSoft pt-4">
        <div className="flex-1">
          <NumberField
            spec={SYNTHETIC_FIELDS.seed}
            value={synthetic.seed}
            onChange={(value) => onChange('seed', Math.trunc(value))}
          />
        </div>
        <button
          type="button"
          onClick={() => onChange('seed', Math.floor(Math.random() * 1_000_000))}
          className="rounded-md border border-edge bg-raised px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink"
        >
          Reroll
        </button>
      </div>

      {inverted && (
        <p className="text-2xs leading-relaxed text-warn">
          Peak is not above trough, so the generated shape is flat or inverted. The optimiser will find little or no
          arbitrage.
        </p>
      )}
    </div>
  )
}
