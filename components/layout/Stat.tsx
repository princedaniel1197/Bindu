import type { Derivation } from '@/lib/types'
import { SyntheticBadge } from './SyntheticBadge'
import { Working } from './Working'

type Tone = 'default' | 'good' | 'bad' | 'muted'

const TONES: Record<Tone, string> = {
  default: 'text-ink',
  good: 'text-discharge',
  bad: 'text-danger',
  muted: 'text-muted',
}

interface StatProps {
  readonly label: string
  readonly value: string
  readonly sub?: string
  readonly tone?: Tone
  readonly derivation?: Derivation
  readonly synthetic?: boolean
}

export function Stat({ label, value, sub, tone = 'default', derivation, synthetic = false }: StatProps) {
  return (
    <div className="rounded-md border border-edgeSoft bg-raised/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="label-xs">{label}</p>
        {synthetic && <SyntheticBadge />}
      </div>
      <p className={`num mt-1.5 text-xl font-semibold leading-none tracking-tight ${TONES[tone]}`}>{value}</p>
      {sub && <p className="mt-1.5 text-2xs leading-relaxed text-muted">{sub}</p>}
      {derivation && <Working derivation={derivation} />}
    </div>
  )
}
