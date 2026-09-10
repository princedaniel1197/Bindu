export interface BatteryConfig {
  readonly powerMw: number
  readonly energyMwh: number
  readonly rtePct: number
  readonly dodLimitPct: number
  readonly startSocPct: number
  readonly maxCyclesPerDay: number
}

export interface EconomicsConfig {
  readonly capexRsPerKwh: number
  readonly omRsPerKwPerYr: number
  readonly projectLifeYrs: number
  readonly discountRatePct: number
  readonly degradationPctPerYr: number
}

export interface SyntheticConfig {
  readonly peakRsPerMwh: number
  readonly troughRsPerMwh: number
  readonly volatilityPct: number
  readonly seed: number
}

export type PriceSourceKind = 'synthetic' | 'csv'

/** Provenance of a price series. `synthetic` drives the SYNTHETIC badge everywhere. */
export interface PriceOrigin {
  readonly kind: PriceSourceKind
  readonly label: string
  readonly synthetic: boolean
}

export interface PriceSeries {
  readonly prices: readonly number[]
  readonly origin: PriceOrigin
}

export interface AppConfig {
  readonly battery: BatteryConfig
  readonly economics: EconomicsConfig
  readonly synthetic: SyntheticConfig
  readonly priceSource: PriceSourceKind
}

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  readonly severity: IssueSeverity
  readonly field: string
  readonly title: string
  readonly detail: string
  readonly fix?: string
}

/** A traceable derivation, surfaced by the "show working" toggle. */
export interface Derivation {
  readonly formula: string
  readonly substitution?: string
  readonly inputs?: readonly { readonly label: string; readonly value: string }[]
  readonly notes?: readonly string[]
}

export interface FieldSpec {
  readonly label: string
  readonly unit: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly decimals: number
  readonly help?: string
  /** true when no sourced default exists: the user owns this number. */
  readonly assumption?: boolean
}
