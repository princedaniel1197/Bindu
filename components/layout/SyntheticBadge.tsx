interface SyntheticBadgeProps {
  readonly label?: string
  readonly size?: 'sm' | 'md'
}

/**
 * Marks anything computed from generated prices. Deliberately loud: a synthetic
 * run must never be mistaken for a real one.
 */
export function SyntheticBadge({ label, size = 'sm' }: SyntheticBadgeProps) {
  const dims = size === 'md' ? 'px-2 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[9px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-synth/50 bg-synth/[0.12] font-mono font-bold uppercase tracking-[0.12em] text-synth ${dims}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-synth" />
      Synthetic{label ? ` · ${label}` : ''}
    </span>
  )
}
