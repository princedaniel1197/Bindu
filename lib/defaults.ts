import type { AppConfig, BatteryConfig, EconomicsConfig, FieldSpec, SyntheticConfig } from './types'

export const DEFAULT_BATTERY: BatteryConfig = {
  powerMw: 10,
  energyMwh: 20,
  rtePct: 85,
  dodLimitPct: 90,
  startSocPct: 50,
  maxCyclesPerDay: 1.5,
}

export const DEFAULT_ECONOMICS: EconomicsConfig = {
  capexRsPerKwh: 25000,
  omRsPerKwPerYr: 750,
  projectLifeYrs: 15,
  discountRatePct: 10,
  degradationPctPerYr: 2.5,
}

export const DEFAULT_SYNTHETIC: SyntheticConfig = {
  peakRsPerMwh: 8000,
  troughRsPerMwh: 2000,
  volatilityPct: 12,
  seed: 42,
}

export const DEFAULT_CONFIG: AppConfig = {
  battery: DEFAULT_BATTERY,
  economics: DEFAULT_ECONOMICS,
  synthetic: DEFAULT_SYNTHETIC,
  priceSource: 'synthetic',
}

export const BATTERY_FIELDS: Record<keyof BatteryConfig, FieldSpec> = {
  powerMw: {
    label: 'Power rating',
    unit: 'MW',
    min: 0.1, max: 1000, step: 0.5, decimals: 2,
    help: 'Grid-side import/export limit. Caps energy moved in any one block at P × 0.25 h.',
  },
  energyMwh: {
    label: 'Energy capacity',
    unit: 'MWh',
    min: 0.1, max: 5000, step: 1, decimals: 2,
    help: 'Nameplate storage. Duration = capacity ÷ power.',
  },
  rtePct: {
    label: 'Round-trip efficiency',
    unit: '%',
    min: 30, max: 100, step: 1, decimals: 1,
    help: 'Split as √RTE on charge and √RTE on discharge, so the round trip returns exactly RTE.',
  },
  dodLimitPct: {
    label: 'Depth of discharge limit',
    unit: '%',
    min: 5, max: 100, step: 5, decimals: 1,
    help: 'Usable window. A 90% limit means SOC may swing between 10% and 100%.',
  },
  startSocPct: {
    label: 'Starting SOC',
    unit: '%',
    min: 0, max: 100, step: 5, decimals: 1,
    help: 'SOC at block 0. The schedule is forced to return here at block 96.',
  },
  maxCyclesPerDay: {
    label: 'Max full cycles / day',
    unit: 'cycles',
    min: 0, max: 10, step: 0.1, decimals: 2,
    help: 'Enforced as an energy-throughput cap: total discharge ≤ cycles × usable energy.',
  },
}

export const ECONOMICS_FIELDS: Record<keyof EconomicsConfig, FieldSpec> = {
  capexRsPerKwh: {
    label: 'Capex',
    unit: '₹/kWh',
    min: 0, max: 200000, step: 1000, decimals: 0,
    help: 'Applied to nameplate energy capacity, not usable capacity.',
  },
  omRsPerKwPerYr: {
    label: 'Fixed O&M',
    unit: '₹/kW/yr',
    min: 0, max: 50000, step: 50, decimals: 0,
    assumption: true,
    help: 'Applied to power rating. Deducted from revenue every year of the project life.',
  },
  projectLifeYrs: {
    label: 'Project life',
    unit: 'yr',
    min: 1, max: 40, step: 1, decimals: 0,
    assumption: true,
    help: 'Evaluation horizon for NPV and IRR. No residual value is assumed.',
  },
  discountRatePct: {
    label: 'Discount rate',
    unit: '%',
    min: 0, max: 40, step: 0.5, decimals: 2,
    assumption: true,
    help: 'Nominal rate used to discount annual net cashflows to present value.',
  },
  degradationPctPerYr: {
    label: 'Degradation',
    unit: '%/yr',
    min: 0, max: 20, step: 0.1, decimals: 2,
    help: 'Capacity fade, applied to arbitrage revenue on a straight proportional basis.',
  },
}

export const SYNTHETIC_FIELDS: Record<keyof SyntheticConfig, FieldSpec> = {
  peakRsPerMwh: {
    label: 'Peak price',
    unit: '₹/MWh',
    min: 0, max: 50000, step: 250, decimals: 0,
    help: 'Value the shape reaches at the evening peak before noise.',
  },
  troughRsPerMwh: {
    label: 'Trough price',
    unit: '₹/MWh',
    min: 0, max: 50000, step: 250, decimals: 0,
    help: 'Value the shape reaches at the midday solar depression before noise.',
  },
  volatilityPct: {
    label: 'Volatility',
    unit: '%',
    min: 0, max: 60, step: 1, decimals: 0,
    help: 'Noise standard deviation as a percentage of the peak-to-trough range.',
  },
  seed: {
    label: 'Random seed',
    unit: '',
    min: 0, max: 999999, step: 1, decimals: 0,
    help: 'Same seed plus same sliders always reproduces the same series.',
  },
}
