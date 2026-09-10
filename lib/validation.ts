import type { BatteryConfig, EconomicsConfig, ValidationIssue } from './types'
import type { DerivedBattery } from './battery'

/**
 * Boundary validation. Errors block optimisation; warnings are advisory only.
 * Every issue names the offending field in plain language.
 */
export function validateConfig(
  battery: BatteryConfig,
  economics: EconomicsConfig,
  d: DerivedBattery,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (battery.startSocPct < d.socMinPct) {
    issues.push({
      severity: 'error',
      field: 'startSocPct',
      title: 'Starting SOC sits below the depth-of-discharge floor',
      detail:
        `A ${battery.dodLimitPct}% DoD limit holds SOC at or above ${d.socMinPct.toFixed(0)}% ` +
        `(${d.socMinMwh.toFixed(2)} MWh), but the run starts at ${battery.startSocPct}% ` +
        `(${d.socStartMwh.toFixed(2)} MWh). No schedule can satisfy both, so the problem is infeasible before it reaches the solver.`,
      fix: `Raise starting SOC to at least ${d.socMinPct.toFixed(0)}%, or raise the DoD limit to at least ${(100 - battery.startSocPct).toFixed(0)}%.`,
    })
  }

  if (battery.startSocPct > 100) {
    issues.push({
      severity: 'error',
      field: 'startSocPct',
      title: 'Starting SOC exceeds capacity',
      detail: `Starting SOC is ${battery.startSocPct}% of a ${battery.energyMwh} MWh battery.`,
      fix: 'Set starting SOC to 100% or below.',
    })
  }

  if (battery.maxCyclesPerDay === 0) {
    issues.push({
      severity: 'warning',
      field: 'maxCyclesPerDay',
      title: 'Throughput cap is zero',
      detail: 'With zero cycles allowed the battery cannot discharge, so the optimal schedule is to do nothing and the margin is ₹0.',
      fix: 'Raise max full cycles per day above zero.',
    })
  }

  if (d.durationHrs > 12) {
    issues.push({
      severity: 'warning',
      field: 'energyMwh',
      title: 'Very long duration',
      detail: `${d.durationHrs.toFixed(1)} hours of storage at rated power. Within a 24-hour horizon the power rating, not the capacity, will bind.`,
    })
  }

  if (battery.rtePct >= 100) {
    issues.push({
      severity: 'warning',
      field: 'rtePct',
      title: 'Lossless round trip',
      detail: 'A 100% round-trip efficiency has no physical counterpart. Results will overstate achievable margin.',
    })
  }

  if (economics.discountRatePct === 0) {
    issues.push({
      severity: 'warning',
      field: 'discountRatePct',
      title: 'Zero discount rate',
      detail: 'NPV collapses to an undiscounted sum of cashflows.',
    })
  }

  return issues
}

export function hasErrors(issues: readonly ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}
