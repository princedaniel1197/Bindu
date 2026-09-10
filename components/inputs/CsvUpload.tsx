'use client'

import { useRef, useState } from 'react'
import { Callout } from '@/components/layout/Callout'
import { csvTemplate, REQUIRED_HEADERS, type CsvError } from '@/lib/prices/csv'
import { BLOCKS_PER_DAY } from '@/lib/constants'
import type { PriceSeries } from '@/lib/types'

interface CsvUploadProps {
  readonly uploaded: PriceSeries | null
  readonly errors: readonly CsvError[]
  readonly indexBase: 0 | 1 | null
  readonly onLoad: (text: string, fileName: string) => boolean
  readonly onClear: () => void
  readonly templatePrices: readonly number[]
}

export function CsvUpload({ uploaded, errors, indexBase, onLoad, onClear, templatePrices }: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setReading(true)
    try {
      onLoad(await file.text(), file.name)
    } catch {
      onLoad('', file.name)
    } finally {
      setReading(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate(templatePrices)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'bess-prices-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-dashed border-edge bg-base/40 px-3 py-4 text-center">
        <p className="text-xs text-ink/80">
          CSV with a header row of <code className="font-mono text-price">{REQUIRED_HEADERS.join(',')}</code>
        </p>
        <p className="mt-1 text-2xs text-muted">
          Exactly {BLOCKS_PER_DAY} rows, one per 15-minute block. Block index may start at 0 or 1.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={reading}
            className="rounded-md border border-price/50 bg-price/10 px-3 py-1.5 text-xs font-medium text-price transition-colors hover:bg-price/20 disabled:opacity-50"
          >
            {reading ? 'Reading…' : 'Choose CSV'}
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-md border border-edge bg-raised px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink"
          >
            Download template
          </button>
        </div>
      </div>

      {uploaded && errors.length === 0 && (
        <Callout tone="info" title={`Loaded ${uploaded.origin.label}`}>
          <p>
            {BLOCKS_PER_DAY} blocks parsed, indexed from {indexBase}. These are your prices — no SYNTHETIC label is
            applied to results computed from them.
          </p>
        </Callout>
      )}

      {errors.length > 0 && (
        <Callout tone="danger" title={`CSV rejected — ${errors.length} problem${errors.length > 1 ? 's' : ''}`}>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={`${error.row}-${index}`} className="flex gap-2">
                <span className="num shrink-0 text-faint">{error.row === null ? 'file' : `row ${error.row}`}</span>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-faint">
            Nothing was loaded. The optimiser is still running on the synthetic series.
          </p>
        </Callout>
      )}

      {(uploaded || errors.length > 0) && (
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-md border border-edge bg-raised px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink"
        >
          Clear upload
        </button>
      )}
    </div>
  )
}
