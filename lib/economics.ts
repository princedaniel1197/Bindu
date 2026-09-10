import { annualOmRs, capexRs, type DerivedBattery } from './battery'
import { DAYS_PER_YEAR } from './constants'
import type { BatteryConfig, Derivation, EconomicsConfig } from './types'

export interface YearRow {
  readonly year: number
  readonly retention: number
  readonly revenueRs: number
  readonly omRs: number
  readonly netRs: number
  readonly discountFactor: number
  readonly discountedRs: number
  readonly cumulativeDiscountedRs: number
}

export interface EconomicsResult {
  readonly capexRs: number
  readonly annualOmRs: number
  readonly year1RevenueRs: number
  readonly year1NetRs: number
  readonly lifetimeRevenueRs: number
  readonly rows: readonly YearRow[]
  readonly npvRs: number
  readonly irrPct: number | null
  readonly simplePaybackYrs: number | null
  readonly discountedPaybackYrs: number | null
}

function netCashflows(year1RevenueRs: number, omRs: number, lifeYrs: number, degradation: number): number[] {
  const flows: number[] = []
  for (let year = 1; year <= lifeYrs; year += 1) {
    flows.push(year1RevenueRs * (1 - degradation) ** (year - 1) - omRs)
  }
  return flows
}

function npvAt(rate: number, capex: number, flows: readonly number[]): number {
  let total = -capex
  for (let i = 0; i < flows.length; i += 1) {
    total += flows[i] / (1 + rate) ** (i + 1)
  }
  return total
}

/**
 * IRR by bisection. Returns null when the cashflow profile never crosses zero
 * inside the search bracket, which is the honest answer for a project that
 * cannot pay back at any rate.
 */
function solveIrr(capex: number, flows: readonly number[]): number | null {
  let lo = -0.9999
  let hi = 10
  let fLo = npvAt(lo, capex, flows)
  let fHi = npvAt(hi, capex, flows)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null

  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2
    const fMid = npvAt(mid, capex, flows)
    if (Math.abs(fMid) < 1e-6 || hi - lo < 1e-10) return mid * 100
    if (fLo * fMid <= 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  return ((lo + hi) / 2) * 100
}

export function computeEconomics(
  dailyGrossMarginRs: number,
  battery: BatteryConfig,
  economics: EconomicsConfig,
): EconomicsResult {
  const capex = capexRs(battery, economics)
  const om = annualOmRs(battery, economics)
  const degradation = economics.degradationPctPerYr / 100
  const rate = economics.discountRatePct / 100
  const year1RevenueRs = dailyGrossMarginRs * DAYS_PER_YEAR

  const flows = netCashflows(year1RevenueRs, om, economics.projectLifeYrs, degradation)

  const rows: YearRow[] = []
  let cumulative = 0
  let lifetimeRevenueRs = 0
  let discountedPaybackYrs: number | null = null

  flows.forEach((netRs, index) => {
    const year = index + 1
    const retention = (1 - degradation) ** index
    const revenueRs = year1RevenueRs * retention
    const discountFactor = 1 / (1 + rate) ** year
    const discountedRs = netRs * discountFactor
    const previous = cumulative
    cumulative += discountedRs
    lifetimeRevenueRs += revenueRs

    if (discountedPaybackYrs === null && previous < capex && cumulative >= capex) {
      // Interpolate inside the year the cumulative total crosses capex.
      discountedPaybackYrs = year - 1 + (capex - previous) / (cumulative - previous)
    }

    rows.push({
      year, retention, revenueRs, omRs: om, netRs,
      discountFactor, discountedRs, cumulativeDiscountedRs: cumulative,
    })
  })

  const year1NetRs = flows[0] ?? 0

  return {
    capexRs: capex,
    annualOmRs: om,
    year1RevenueRs,
    year1NetRs,
    lifetimeRevenueRs,
    rows,
    npvRs: npvAt(rate, capex, flows),
    irrPct: solveIrr(capex, flows),
    simplePaybackYrs: year1NetRs > 0 ? capex / year1NetRs : null,
    discountedPaybackYrs,
  }
}

export function economicsWorkings(
  result: EconomicsResult,
  battery: BatteryConfig,
  economics: EconomicsConfig,
  derived: DerivedBattery,
  dailyGrossMarginRs: number,
): Record<string, Derivation> {
  const rate = economics.discountRatePct / 100
  return {
    capex: {
      formula: 'capex = nameplate energy × 1000 kWh/MWh × capex rate',
      substitution: `${battery.energyMwh} MWh × 1000 × ₹${economics.capexRsPerKwh}/kWh = ₹${result.capexRs.toFixed(0)}`,
      notes: [
        `Charged against nameplate capacity, not the ${derived.usableEnergyMwh.toFixed(2)} MWh usable window.`,
      ],
    },
    om: {
      formula: 'annual O&M = power rating × 1000 kW/MW × O&M rate',
      substitution: `${battery.powerMw} MW × 1000 × ₹${economics.omRsPerKwPerYr}/kW/yr = ₹${result.annualOmRs.toFixed(0)}/yr`,
      notes: [
        `That is ${((result.annualOmRs / Math.max(result.capexRs, 1)) * 100).toFixed(2)}% of capex per year — sanity-check it against your own O&M contract.`,
      ],
    },
    annualRevenue: {
      formula: 'year-n revenue = daily gross margin × 365 × (1 − degradation)^(n−1)',
      substitution: `₹${dailyGrossMarginRs.toFixed(0)} × 365 = ₹${result.year1RevenueRs.toFixed(0)} in year 1, fading ${economics.degradationPctPerYr}%/yr to ₹${(result.rows.at(-1)?.revenueRs ?? 0).toFixed(0)} in year ${economics.projectLifeYrs}`,
      notes: [
        'Assumes every day of the year repeats this one price shape. A single day is not a year — treat this as a scaling of one scenario, not a forecast.',
        'Degradation is applied straight to revenue, which presumes margin scales with retained capacity.',
      ],
    },
    npv: {
      formula: 'NPV = −capex + Σ_n (revenue_n − O&M) ÷ (1 + r)^n',
      substitution: `−₹${result.capexRs.toFixed(0)} + Σ over ${economics.projectLifeYrs} yr at r = ${economics.discountRatePct}% = ₹${result.npvRs.toFixed(0)}`,
      inputs: [
        { label: 'Year-1 net cashflow', value: `₹${result.year1NetRs.toFixed(0)}` },
        { label: 'Year-1 discount factor', value: (1 / (1 + rate)).toFixed(4) },
      ],
      notes: ['No residual or salvage value is credited at the end of the project life.'],
    },
    payback: {
      formula: 'simple payback = capex ÷ year-1 net cashflow',
      substitution:
        result.simplePaybackYrs === null
          ? 'Year-1 net cashflow is not positive, so the project never pays back.'
          : `₹${result.capexRs.toFixed(0)} ÷ ₹${result.year1NetRs.toFixed(0)} = ${result.simplePaybackYrs.toFixed(2)} yr`,
      notes: [
        'Simple payback ignores both discounting and degradation.',
        result.discountedPaybackYrs === null
          ? 'Discounted payback is not reached within the project life.'
          : `Discounted payback, which accounts for both, is ${result.discountedPaybackYrs.toFixed(2)} yr.`,
      ],
    },
    irr: {
      formula: 'IRR solves  −capex + Σ_n net_n ÷ (1 + IRR)^n = 0',
      substitution:
        result.irrPct === null
          ? 'No sign change in NPV across the search range, so no IRR exists.'
          : `IRR = ${result.irrPct.toFixed(2)}% against a ${economics.discountRatePct}% hurdle`,
      notes: ['Found by bisection to 1e-6 rupee precision over rates from −99.99% to +1000%.'],
    },
  }
}
