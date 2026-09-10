'use client'

import { useCallback, useMemo, useState } from 'react'
import { parsePriceCsv, type CsvError } from '@/lib/prices/csv'
import { generateSyntheticPrices } from '@/lib/prices/synthetic'
import type { PriceSeries, PriceSourceKind, SyntheticConfig } from '@/lib/types'

export interface PriceSeriesApi {
  readonly active: PriceSeries
  readonly synthetic: PriceSeries
  readonly uploaded: PriceSeries | null
  readonly csvErrors: readonly CsvError[]
  readonly csvIndexBase: 0 | 1 | null
  readonly loadCsv: (text: string, fileName: string) => boolean
  readonly clearCsv: () => void
}

export function usePriceSeries(config: SyntheticConfig, source: PriceSourceKind): PriceSeriesApi {
  const [uploaded, setUploaded] = useState<PriceSeries | null>(null)
  const [csvErrors, setCsvErrors] = useState<readonly CsvError[]>([])
  const [csvIndexBase, setCsvIndexBase] = useState<0 | 1 | null>(null)

  const synthetic = useMemo(() => generateSyntheticPrices(config), [config])

  const loadCsv = useCallback((text: string, fileName: string): boolean => {
    const result = parsePriceCsv(text, fileName)
    if (result.ok) {
      setUploaded(result.series)
      setCsvIndexBase(result.indexBase)
      setCsvErrors([])
      return true
    }
    setUploaded(null)
    setCsvIndexBase(null)
    setCsvErrors(result.errors)
    return false
  }, [])

  const clearCsv = useCallback(() => {
    setUploaded(null)
    setCsvErrors([])
    setCsvIndexBase(null)
  }, [])

  // Falling back to synthetic when a CSV is selected but absent keeps the app in
  // a valid state; the badge makes the fallback obvious.
  const active = source === 'csv' && uploaded ? uploaded : synthetic

  return { active, synthetic, uploaded, csvErrors, csvIndexBase, loadCsv, clearCsv }
}
