import type { ReactNode } from 'react'

interface SectionProps {
  readonly title: string
  readonly description?: string
  readonly aside?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

export function Section({ title, description, aside, children, className = '' }: SectionProps) {
  return (
    <section className={`rounded-lg border border-edgeSoft bg-panel ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-edgeSoft px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-2xs leading-relaxed text-muted">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}
