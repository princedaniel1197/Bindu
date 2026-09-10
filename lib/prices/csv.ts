import Papa from 'papaparse'
import { BLOCKS_PER_DAY } from '../constants'
import type { PriceSeries } from '../types'

export const REQUIRED_HEADERS = ['block', 'price_rs_per_mwh'] as const

export interface CsvError {
  readonly row: number | null
  readonly message: string
}

export type CsvParseResult =
  | { readonly ok: true; readonly series: PriceSeries; readonly indexBase: 0 | 1 }
  | { readonly ok: false; readonly errors: readonly CsvError[] }

function normaliseHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * Parses a two-column price CSV and validates it hard: correct headers, exactly
 * 96 rows, a complete contiguous block index, and finite non-negative prices.
 * Every failure is reported with its source row so the user can fix the file.
 */
export function parsePriceCsv(text: string, fileName: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normaliseHeader,
  })

  const errors: CsvError[] = []

  for (const err of parsed.errors) {
    errors.push({
      row: typeof err.row === 'number' ? err.row + 2 : null,
      message: err.message,
    })
  }

  const headers = parsed.meta.fields ?? []
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    errors.push({
      row: 1,
      message:
        `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        `Found: ${headers.length > 0 ? headers.join(', ') : '(no header row)'}. ` +
        `Expected a header row reading exactly: ${REQUIRED_HEADERS.join(',')}`,
    })
    return { ok: false, errors }
  }

  const rows = parsed.data
  if (rows.length !== BLOCKS_PER_DAY) {
    errors.push({
      row: null,
      message: `Expected exactly ${BLOCKS_PER_DAY} data rows (one per 15-minute block). Found ${rows.length}.`,
    })
  }

  const blocks: number[] = []
  const prices: number[] = []

  rows.forEach((row, index) => {
    const sourceRow = index + 2 // header occupies row 1
    const rawBlock = (row.block ?? '').trim()
    const rawPrice = (row.price_rs_per_mwh ?? '').trim()

    const block = Number(rawBlock)
    if (rawBlock === '' || !Number.isInteger(block)) {
      errors.push({ row: sourceRow, message: `block must be a whole number, got "${rawBlock}".` })
    } else {
      blocks.push(block)
    }

    const price = Number(rawPrice)
    if (rawPrice === '' || !Number.isFinite(price)) {
      errors.push({ row: sourceRow, message: `price_rs_per_mwh must be a number, got "${rawPrice}".` })
    } else if (price < 0) {
      errors.push({ row: sourceRow, message: `price_rs_per_mwh is negative (${price}). Negative prices are not supported.` })
    } else {
      prices.push(price)
    }
  })

  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 25) }

  const minBlock = Math.min(...blocks)
  const indexBase: 0 | 1 = minBlock === 0 ? 0 : 1
  const expected = new Set<number>()
  for (let i = 0; i < BLOCKS_PER_DAY; i += 1) expected.add(i + indexBase)

  const seen = new Set<number>()
  blocks.forEach((block, index) => {
    if (seen.has(block)) {
      errors.push({ row: index + 2, message: `Duplicate block index ${block}.` })
    }
    seen.add(block)
    if (!expected.has(block)) {
      errors.push({
        row: index + 2,
        message: `Block index ${block} is outside the expected range ${indexBase}-${BLOCKS_PER_DAY - 1 + indexBase}.`,
      })
    }
  })

  const absent = [...expected].filter((b) => !seen.has(b))
  if (absent.length > 0) {
    errors.push({
      row: null,
      message: `Missing block${absent.length > 1 ? 's' : ''}: ${absent.slice(0, 12).join(', ')}${absent.length > 12 ? `, +${absent.length - 12} more` : ''}.`,
    })
  }

  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 25) }

  // Order by block index rather than trusting file order.
  const ordered = blocks
    .map((block, index) => ({ block, price: prices[index] }))
    .sort((a, b) => a.block - b.block)
    .map((entry) => entry.price)

  return {
    ok: true,
    indexBase,
    series: {
      prices: ordered,
      origin: { kind: 'csv', label: fileName, synthetic: false },
    },
  }
}

/** Downloadable template so the expected format is unambiguous. */
export function csvTemplate(prices: readonly number[]): string {
  const lines = [REQUIRED_HEADERS.join(',')]
  prices.forEach((price, block) => lines.push(`${block},${price}`))
  return lines.join('\n')
}
