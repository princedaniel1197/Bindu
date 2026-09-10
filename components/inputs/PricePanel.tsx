'use client'

import { SyntheticBadge } from '@/components/layout/SyntheticBadge'
import { blockToSpan } from '@/lib/constants'
import { formatRs } from '@/lib/format'
import type { PriceSourceKind, PriceSeries, SyntheticConfig } from '@/lib/types'
import type { PriceSeriesApi } from '@/hooks/usePriceSeries'
import { CsvUpload } from './CsvUpload'
import { SyntheticControls } from './SyntheticControls'

interface PricePanelProps {
  readonly source: PriceSourceKind
  readonly onSourceChange: (kind: PriceSourceKind) => void
  readonly synthetic: SyntheticConfig
  readonly onSyntheticChange: <K extends keyof SyntheticConfig>(key: K, value: SyntheticConfig[K]) => void
  readonly prices: PriceSeriesApi
}

const MODES: readonly { readonly kind: PriceSourceKind; readonly label: string }[] = [
  { kind: 'synthetic', label: 'Generate' },
  { kind: 'csv', label: 'Upload CSV' },
]

function summarise(series: PriceSeries) {
  const { prices } = series
  let min = Infinity
  let max = -Infinity
  let minAt = 0
  let maxAt = 0
  let sum = 0
  prices.forEach((price, block) => {
    sum += price
    if (price < min) { min = price; minAt = block }
    if (price > max) { max = price; maxAt = block }
  })
  return { min, max, minAt, maxAt, mean: sum / prices.length, spread: max - min }
}

export function PricePanel({ source, onSourceChange, synthetic, onSyntheticChange, prices }: PricePanelProps) {
  const stats = summarise(prices.active)
  const usingFallback = source === 'csv' && !prices.uploaded

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-md border border-edge bg-base p-1">
        {MODES.map((mode) => (
          <button
            key={mode.kind}
            type="button"
            onClick={() => onSourceChange(mode.kind)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              source === mode.kind ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {source === 'synthetic' ? (
        <>
          <div className="rounded-md border border-synth/35 bg-synth/[0.07] px-3 py-2.5">
            <SyntheticBadge label="Karnataka-shaped" />
            <p className="mt-2 text-2xs leading-relaxed text-ink/75">
              A generated day shape: overnight trough, morning ramp 06:00–09:00, midday solar depression 11:00–15:00,
              sharp evening peak 18:00–22:00. The shape is invented to exercise the optimiser. It is not sampled from
              any exchange and must not be read as a price forecast.
            </p>
          </div>
          <SyntheticControls synthetic={synthetic} onChange={onSyntheticChange} />
        </>
      ) : (
        <CsvUpload
          uploaded={prices.uploaded}
          errors={prices.csvErrors}
          indexBase={prices.csvIndexBase}
          onLoad={prices.loadCsv}
          onClear={prices.clearCsv}
          templatePrices={prices.synthetic.prices}
        />
      )}

      {usingFallback && (
        <p className="rounded-md border border-warn/35 bg-warn/[0.06] px-2.5 py-2 text-2xs leading-relaxed text-warn">
          No CSV loaded, so results below are still computed from the SYNTHETIC series and remain labelled as such.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-edgeSoft pt-3">
        <div>
          <dt className="label-xs">Day low</dt>
          <dd className="num mt-0.5 text-xs text-ink">{formatRs(stats.min)}</dd>
          <dd className="num text-2xs text-faint">{blockToSpan(stats.minAt)}</dd>
        </div>
        <div>
          <dt className="label-xs">Day high</dt>
          <dd className="num mt-0.5 text-xs text-ink">{formatRs(stats.max)}</dd>
          <dd className="num text-2xs text-faint">{blockToSpan(stats.maxAt)}</dd>
        </div>
        <div>
          <dt className="label-xs">Mean</dt>
          <dd className="num mt-0.5 text-xs text-ink">{formatRs(stats.mean)}</dd>
        </div>
        <div>
          <dt className="label-xs">High − low</dt>
          <dd className="num mt-0.5 text-xs text-ink">{formatRs(stats.spread)}</dd>
        </div>
      </dl>
    </div>
  )
}
