import { BLOCKS_PER_DAY, HOURS_PER_DAY } from '../constants'

/** (hour, relative level) anchors describing a Karnataka-style day. */
export const DAY_SHAPE_ANCHORS: readonly (readonly [number, number])[] = [
  [0.0, 0.20],
  [2.5, 0.10], // overnight trough
  [5.0, 0.16],
  [6.0, 0.26], // morning ramp begins
  [7.5, 0.60],
  [9.0, 0.56], // morning peak rolls off
  [10.0, 0.42],
  [11.0, 0.22], // solar depression begins
  [12.5, 0.04],
  [14.0, 0.05], // midday floor
  [15.0, 0.22], // depression ends
  [16.5, 0.40],
  [18.0, 0.70], // evening ramp
  [19.5, 1.0], // sharp evening peak
  [21.0, 0.90],
  [22.0, 0.58], // peak ends
  [23.0, 0.34],
  [24.0, 0.20], // wraps back to hour 0
]

/**
 * Monotone cubic Hermite (Fritsch-Carlson). Chosen over Catmull-Rom because it
 * cannot overshoot the anchors, so the midday floor never dips below the stated
 * minimum and the evening peak never exceeds the stated maximum.
 */
function pchipTangents(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length
  const delta: number[] = []
  for (let i = 0; i < n - 1; i += 1) {
    delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  }

  const m: number[] = new Array(n).fill(0)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i += 1) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2
  }

  for (let i = 0; i < n - 1; i += 1) {
    if (delta[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const alpha = m[i] / delta[i]
    const beta = m[i + 1] / delta[i]
    const norm = alpha * alpha + beta * beta
    if (norm > 9) {
      const tau = 3 / Math.sqrt(norm)
      m[i] = tau * alpha * delta[i]
      m[i + 1] = tau * beta * delta[i]
    }
  }
  return m
}

function evaluate(xs: readonly number[], ys: readonly number[], m: readonly number[], x: number): number {
  let i = xs.length - 2
  for (let k = 0; k < xs.length - 1; k += 1) {
    if (x <= xs[k + 1]) {
      i = k
      break
    }
  }
  const h = xs[i + 1] - xs[i]
  const t = (x - xs[i]) / h
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
}

/**
 * Samples the day shape onto 96 blocks and rescales to exactly [0, 1], so the
 * peak and trough sliders map to the literal maximum and minimum of the output.
 */
export function dayShape(): readonly number[] {
  const xs = DAY_SHAPE_ANCHORS.map(([hour]) => hour)
  const ys = DAY_SHAPE_ANCHORS.map(([, level]) => level)
  const m = pchipTangents(xs, ys)

  const raw: number[] = []
  for (let block = 0; block < BLOCKS_PER_DAY; block += 1) {
    raw.push(evaluate(xs, ys, m, (block * HOURS_PER_DAY) / BLOCKS_PER_DAY))
  }

  const lo = Math.min(...raw)
  const hi = Math.max(...raw)
  const span = hi - lo
  return span === 0 ? raw.map(() => 0) : raw.map((v) => (v - lo) / span)
}
