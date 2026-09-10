'use client'

import { useMemo, useState } from 'react'
import { BatteryInputs } from '@/components/inputs/BatteryInputs'
import { EconomicsInputs } from '@/components/inputs/EconomicsInputs'
import { PricePanel } from '@/components/inputs/PricePanel'
import { Section } from '@/components/layout/Section'
import { SyntheticBadge } from '@/components/layout/SyntheticBadge'
import { Toggle } from '@/components/layout/Toggle'
import { WorkingProvider } from '@/components/layout/Working'
import { DerivedPanel } from '@/components/results/DerivedPanel'
import { EconomicsPanel } from '@/components/results/EconomicsPanel'
import { HeadlineStats } from '@/components/results/HeadlineStats'
import { ScheduleChart } from '@/components/results/ScheduleChart'
import { SensitivityGrid } from '@/components/results/SensitivityGrid'
import { SolveNotice } from '@/components/results/SolveNotice'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useDebounced } from '@/hooks/useDebounced'
import { useOptimisation, useSensitivity } from '@/hooks/useOptimisation'
import { usePriceSeries } from '@/hooks/usePriceSeries'
import { deriveBattery } from '@/lib/battery'
import { BLOCKS_PER_DAY, SENSITIVITY_MAX_CYCLES, SENSITIVITY_RTE_PCT } from '@/lib/constants'
import { computeEconomics } from '@/lib/economics'
import { computeMetrics } from '@/lib/metrics'
import type { LpInput, SensitivityRequest } from '@/lib/lp/types'
import { hasErrors, validateConfig } from '@/lib/validation'

export default function Page() {
  const { config, setBattery, setEconomics, setSynthetic, setPriceSource, reset } = useAppConfig()
  const [showWorking, setShowWorking] = useState(false)

  const prices = usePriceSeries(config.synthetic, config.priceSource)
  const derived = useMemo(() => deriveBattery(config.battery), [config.battery])

  const issues = useMemo(
    () => validateConfig(config.battery, config.economics, derived),
    [config.battery, config.economics, derived],
  )
  const blocked = hasErrors(issues)
  const invalidFields = useMemo(
    () => new Set(issues.filter((issue) => issue.severity === 'error').map((issue) => issue.field)),
    [issues],
  )

  const lpInput = useMemo<LpInput | null>(() => {
    if (blocked) return null
    return {
      prices: [...prices.active.prices],
      maxBlockEnergyMwh: derived.maxBlockEnergyMwh,
      etaCharge: derived.etaOneWay,
      etaDischarge: derived.etaOneWay,
      socStartMwh: derived.socStartMwh,
      socMinMwh: derived.socMinMwh,
      socMaxMwh: derived.socMaxMwh,
      maxThroughputMwh: derived.maxThroughputMwh,
    }
  }, [blocked, prices.active, derived])

  const settledInput = useDebounced(lpInput, 160)
  const solve = useOptimisation(settledInput, !blocked)

  const sensitivityRequest = useMemo<SensitivityRequest | null>(() => {
    if (!lpInput) return null
    return {
      base: lpInput,
      usableEnergyMwh: derived.usableEnergyMwh,
      rteGrid: [...SENSITIVITY_RTE_PCT],
      cycleGrid: [...SENSITIVITY_MAX_CYCLES],
    }
  }, [lpInput, derived.usableEnergyMwh])

  const settledSensitivity = useDebounced(sensitivityRequest, 520)
  const sensitivity = useSensitivity(settledSensitivity, !blocked)

  const schedule = solve.data?.schedule ?? null
  const metrics = useMemo(
    () => (schedule ? computeMetrics(schedule, prices.active.prices, derived) : null),
    [schedule, prices.active.prices, derived],
  )

  const economics = useMemo(
    () => computeEconomics(metrics?.grossMarginRs ?? 0, config.battery, config.economics),
    [metrics?.grossMarginRs, config.battery, config.economics],
  )

  const isSynthetic = prices.active.origin.synthetic

  return (
    <WorkingProvider value={showWorking}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-edgeSoft bg-base/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-ink">BESS Arbitrage Optimiser</h1>
              <p className="text-2xs text-muted">
                Perfect-foresight linear programme · {BLOCKS_PER_DAY} × 15-minute blocks · solved with GLPK in a Web Worker
              </p>
            </div>

            {isSynthetic && (
              <div className="order-last w-full lg:order-none lg:ml-2 lg:w-auto">
                <SyntheticBadge size="md" label="prices are generated, not observed" />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="num hidden text-2xs text-faint sm:inline">
                {solve.pending
                  ? 'solving…'
                  : solve.data
                    ? `${solve.data.status} · ${solve.data.solveMs} ms`
                    : 'idle'}
              </span>
              <Toggle
                checked={showWorking}
                onChange={setShowWorking}
                label="Show working"
                hint="Reveal the formula and inputs behind every derived number"
              />
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-edge bg-raised px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] px-4 py-5 lg:px-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-4 2xl:col-span-3">
              <Section title="Battery" description="Physical limits the optimiser must respect.">
                <BatteryInputs battery={config.battery} onChange={setBattery} invalidFields={invalidFields} />
              </Section>

              <Section
                title="Price data"
                description="One day of 15-minute prices in ₹/MWh."
                aside={isSynthetic ? <SyntheticBadge /> : undefined}
              >
                <PricePanel
                  source={config.priceSource}
                  onSourceChange={setPriceSource}
                  synthetic={config.synthetic}
                  onSyntheticChange={setSynthetic}
                  prices={prices}
                />
              </Section>

              <Section title="Economics" description="Project inputs for payback, NPV and IRR.">
                <EconomicsInputs
                  economics={config.economics}
                  onChange={setEconomics}
                  invalidFields={invalidFields}
                />
              </Section>

              <Section title="Derived" description="What the inputs above imply, before optimisation.">
                <DerivedPanel battery={config.battery} derived={derived} />
              </Section>
            </div>

            <div className="space-y-4 xl:col-span-8 2xl:col-span-9">
              <SolveNotice
                issues={issues}
                status={solve.data?.status ?? null}
                workerError={solve.error}
              />

              <Section
                title="Optimal schedule"
                description="Charge and discharge chosen to maximise margin against this price series."
                aside={isSynthetic ? <SyntheticBadge /> : undefined}
              >
                <ScheduleChart
                  series={prices.active}
                  schedule={schedule}
                  battery={derived}
                  capacityMwh={config.battery.energyMwh}
                />
              </Section>

              <Section
                title="Daily result"
                description="Margin and utilisation for the single optimised day above."
                aside={isSynthetic ? <SyntheticBadge /> : undefined}
              >
                {metrics ? (
                  <HeadlineStats metrics={metrics} battery={derived} synthetic={isSynthetic} />
                ) : (
                  <p className="text-2xs text-muted">
                    {blocked
                      ? 'Resolve the errors above to run the optimiser.'
                      : solve.pending
                        ? 'Solving…'
                        : 'No schedule yet.'}
                  </p>
                )}
              </Section>

              <Section
                title="Project economics"
                description="The optimised day scaled to a project, with degradation applied."
                aside={isSynthetic ? <SyntheticBadge /> : undefined}
              >
                <EconomicsPanel
                  result={economics}
                  battery={config.battery}
                  economics={config.economics}
                  derived={derived}
                  dailyGrossMarginRs={metrics?.grossMarginRs ?? 0}
                  synthetic={isSynthetic}
                />
              </Section>

              <Section
                title="Sensitivity"
                description="Daily gross margin re-solved across round-trip efficiency and cycle limits."
                aside={isSynthetic ? <SyntheticBadge /> : undefined}
              >
                <SensitivityGrid
                  cells={sensitivity.data}
                  pending={sensitivity.pending}
                  error={sensitivity.error}
                  currentRtePct={config.battery.rtePct}
                  currentMaxCycles={config.battery.maxCyclesPerDay}
                />
              </Section>
            </div>
          </div>

          <footer className="mt-8 border-t border-edgeSoft pt-4">
            <p className="max-w-3xl text-2xs leading-relaxed text-faint">
              No market data is bundled with this tool. The generated series is a shape, not a forecast, and every
              economic input is a value you set rather than a constant taken from any source. Turn on{' '}
              <span className="text-muted">Show working</span> to see the formula and inputs behind each number.
            </p>
          </footer>
        </main>
      </div>
    </WorkingProvider>
  )
}
