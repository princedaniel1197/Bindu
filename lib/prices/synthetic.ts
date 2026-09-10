import { BLOCKS_PER_DAY } from '../constants'
import type { PriceSeries, SyntheticConfig } from '../types'
import { mulberry32, normalStream } from './rng'
import { dayShape } from './shape'

/** Serial correlation of the noise term. Real intraday noise is not white. */
const NOISE_AR1 = 0.6

export const SYNTHETIC_LABEL = 'Karnataka-shaped'

/**
 * Builds a fully synthetic 96-block price series.
 *
 * price_t = trough + (peak - trough) * shape_t + noise_t, floored at zero.
 *
 * This is a shape generator, not market data. Nothing here is sourced from any
 * real exchange; the caller is responsible for labelling it SYNTHETIC.
 */
export function generateSyntheticPrices(config: SyntheticConfig): PriceSeries {
  const { peakRsPerMwh, troughRsPerMwh, volatilityPct, seed } = config
  const shape = dayShape()
  const span = peakRsPerMwh - troughRsPerMwh

  const uniform = mulberry32(Math.trunc(seed))
  const normal = normalStream(uniform)
  const targetSd = (volatilityPct / 100) * Math.abs(span)
  const innovationSd = targetSd * Math.sqrt(1 - NOISE_AR1 * NOISE_AR1)

  const prices: number[] = []
  let noise = 0
  for (let block = 0; block < BLOCKS_PER_DAY; block += 1) {
    noise = NOISE_AR1 * noise + innovationSd * normal()
    const value = troughRsPerMwh + span * shape[block] + noise
    prices.push(Math.max(0, Math.round(value * 100) / 100))
  }

  return {
    prices,
    origin: {
      kind: 'synthetic',
      label: `${SYNTHETIC_LABEL} · seed ${Math.trunc(seed)}`,
      synthetic: true,
    },
  }
}
