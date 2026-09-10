'use client'

interface ToggleProps {
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly label: string
  readonly hint?: string
}

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={hint}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'border-price/50 bg-price/10 text-price'
          : 'border-edge bg-raised text-muted hover:border-faint hover:text-ink'
      }`}
    >
      <span
        aria-hidden
        className={`relative h-3.5 w-6 rounded-full transition-colors ${checked ? 'bg-price/70' : 'bg-edge'}`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${
            checked ? 'left-3' : 'left-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  )
}
