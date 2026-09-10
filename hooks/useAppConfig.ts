'use client'

import { useCallback, useState } from 'react'
import { DEFAULT_CONFIG } from '@/lib/defaults'
import type { AppConfig, BatteryConfig, EconomicsConfig, PriceSourceKind, SyntheticConfig } from '@/lib/types'

export interface AppConfigApi {
  readonly config: AppConfig
  readonly setBattery: <K extends keyof BatteryConfig>(key: K, value: BatteryConfig[K]) => void
  readonly setEconomics: <K extends keyof EconomicsConfig>(key: K, value: EconomicsConfig[K]) => void
  readonly setSynthetic: <K extends keyof SyntheticConfig>(key: K, value: SyntheticConfig[K]) => void
  readonly setPriceSource: (kind: PriceSourceKind) => void
  readonly reset: () => void
}

/** Config state. Every update returns a new object; nothing is mutated in place. */
export function useAppConfig(): AppConfigApi {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)

  const setBattery = useCallback(<K extends keyof BatteryConfig>(key: K, value: BatteryConfig[K]) => {
    setConfig((prev) => ({ ...prev, battery: { ...prev.battery, [key]: value } }))
  }, [])

  const setEconomics = useCallback(<K extends keyof EconomicsConfig>(key: K, value: EconomicsConfig[K]) => {
    setConfig((prev) => ({ ...prev, economics: { ...prev.economics, [key]: value } }))
  }, [])

  const setSynthetic = useCallback(<K extends keyof SyntheticConfig>(key: K, value: SyntheticConfig[K]) => {
    setConfig((prev) => ({ ...prev, synthetic: { ...prev.synthetic, [key]: value } }))
  }, [])

  const setPriceSource = useCallback((kind: PriceSourceKind) => {
    setConfig((prev) => ({ ...prev, priceSource: kind }))
  }, [])

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), [])

  return { config, setBattery, setEconomics, setSynthetic, setPriceSource, reset }
}
