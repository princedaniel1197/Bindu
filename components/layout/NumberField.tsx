'use client'

import { useState } from 'react'
import { clamp } from '@/lib/format'
import type { FieldSpec } from '@/lib/types'
import { useShowWorking } from './Working'

function trim(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)))
}

interface NumberFieldProps {
  readonly spec: FieldSpec
  readonly value: number
  readonly onChange: (value: number) => void
  readonly invalid?: boolean
  readonly withSlider?: boolean
}

/**
 * Numeric input that keeps a local draft while the field has focus, so typing
 * is never fought by re-formatting. Values outside the field's range are held
 * as a draft and clamped on blur rather than pushed into the model.
 */
export function NumberField({ spec, value, onChange, invalid = false, withSlider = false }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const showWorking = useShowWorking()

  const shown = draft ?? trim(value, spec.decimals)
  const parsed = Number(shown)
  const pending = draft !== null && (!Number.isFinite(parsed) || parsed < spec.min || parsed > spec.max)

  const handleType = (raw: string) => {
    setDraft(raw)
    const next = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(next) && next >= spec.min && next <= spec.max) {
      onChange(next)
    }
  }

  const handleBlur = () => {
    const next = Number(draft ?? shown)
    if (draft !== null && Number.isFinite(next)) onChange(clamp(next, spec.min, spec.max))
    setDraft(null)
  }

  const ring = invalid
    ? 'border-danger/70 focus-within:border-danger'
    : pending
      ? 'border-warn/70 focus-within:border-warn'
      : 'border-edge focus-within:border-price/70'

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="flex items-baseline gap-1.5 text-xs font-medium text-ink/85" title={spec.help}>
          {spec.label}
          {spec.assumption && (
            <span
              title="No sourced default exists for this field. The value is an assumption you own."
              className="cursor-help rounded-sm border border-warn/40 px-1 text-[8px] font-bold uppercase tracking-wider text-warn"
            >
              assumption
            </span>
          )}
        </label>
        {spec.unit && <span className="text-2xs text-faint">{spec.unit}</span>}
      </div>

      <div className={`flex items-center rounded-md border bg-raised transition-colors ${ring}`}>
        <input
          type="number"
          inputMode="decimal"
          className="num w-full bg-transparent px-2.5 py-1.5 text-[13px] text-ink outline-none"
          value={shown}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          aria-label={`${spec.label}${spec.unit ? ` in ${spec.unit}` : ''}`}
          aria-invalid={invalid || pending}
          onChange={(event) => handleType(event.target.value)}
          onBlur={handleBlur}
        />
      </div>

      {withSlider && (
        <input
          type="range"
          className="mt-0.5"
          value={Number.isFinite(value) ? value : spec.min}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          aria-label={`${spec.label} slider`}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      )}

      {pending && (
        <p className="text-2xs text-warn">
          Outside {trim(spec.min, spec.decimals)}–{trim(spec.max, spec.decimals)}. It will be clamped when you leave the field.
        </p>
      )}
      {showWorking && spec.help && <p className="text-2xs leading-relaxed text-faint">{spec.help}</p>}
    </div>
  )
}
