import { BLOCK_HOURS, KW_PER_MW, KWH_PER_MWH } from './constants'
import type { BatteryConfig, Derivation, EconomicsConfig } from './types'

export interface DerivedBattery {
  readonly durationHrs: number
  readonly maxBlockEnergyMwh: number
  readonly usableEnergyMwh: number
  readonly socMinMwh: number
  readonly socMaxMwh: number
  readonly socStartMwh: number
  readonly socMinPct: number
  readonly etaOneWay: number
  readonly maxThroughputMwh: number
}

/**
 * All quantities the optimiser needs, derived from the raw config.
 * Pure: same input always yields the same output, no mutation.
 */
export function deriveBattery(battery: BatteryConfig): DerivedBattery {
  const { powerMw, energyMwh, rtePct, dodLimitPct, startSocPct, maxCyclesPerDay } = battery

  const usableEnergyMwh = energyMwh * (dodLimitPct / 100)
  const socMinPct = 100 - dodLimitPct

  return {
    durationHrs: powerMw > 0 ? energyMwh / powerMw : 0,
    maxBlockEnergyMwh: powerMw * BLOCK_HOURS,
    usableEnergyMwh,
    socMinMwh: energyMwh - usableEnergyMwh,
    socMaxMwh: energyMwh,
    socStartMwh: energyMwh * (startSocPct / 100),
    socMinPct,
    etaOneWay: Math.sqrt(rtePct / 100),
    maxThroughputMwh: maxCyclesPerDay * usableEnergyMwh,
  }
}

export function capexRs(battery: BatteryConfig, economics: EconomicsConfig): number {
  return battery.energyMwh * KWH_PER_MWH * economics.capexRsPerKwh
}

export function annualOmRs(battery: BatteryConfig, economics: EconomicsConfig): number {
  return battery.powerMw * KW_PER_MW * economics.omRsPerKwPerYr
}

export function deriveBatteryWorkings(
  battery: BatteryConfig,
  d: DerivedBattery,
): Record<string, Derivation> {
  return {
    duration: {
      formula: 'duration = energy capacity ÷ power rating',
      substitution: `${battery.energyMwh} MWh ÷ ${battery.powerMw} MW = ${d.durationHrs.toFixed(2)} h`,
    },
    usable: {
      formula: 'usable energy = capacity × DoD limit',
      substitution: `${battery.energyMwh} MWh × ${battery.dodLimitPct}% = ${d.usableEnergyMwh.toFixed(2)} MWh`,
    },
    socWindow: {
      formula: 'SOC window = [capacity − usable, capacity]',
      substitution: `[${d.socMinMwh.toFixed(2)}, ${d.socMaxMwh.toFixed(2)}] MWh  (${d.socMinPct.toFixed(0)}%-100%)`,
    },
    eta: {
      formula: 'one-way efficiency = √RTE, applied on charge and again on discharge',
      substitution: `√${(battery.rtePct / 100).toFixed(4)} = ${d.etaOneWay.toFixed(4)} each way; ${d.etaOneWay.toFixed(4)}² = ${(d.etaOneWay ** 2).toFixed(4)}`,
    },
    blockEnergy: {
      formula: 'max energy per block = power rating × block duration',
      substitution: `${battery.powerMw} MW × ${BLOCK_HOURS} h = ${d.maxBlockEnergyMwh.toFixed(3)} MWh`,
    },
    throughput: {
      formula: 'throughput cap = max cycles × usable energy',
      substitution: `${battery.maxCyclesPerDay} × ${d.usableEnergyMwh.toFixed(2)} MWh = ${d.maxThroughputMwh.toFixed(2)} MWh of discharge per day`,
      notes: ['The cap applies to total discharge, so it limits wear rather than instantaneous power.'],
    },
  }
}
