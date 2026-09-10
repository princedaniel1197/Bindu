import type { ReactNode } from 'react'

type Tone = 'danger' | 'warn' | 'info'

const TONES: Record<Tone, { readonly wrap: string; readonly title: string; readonly mark: string }> = {
  danger: { wrap: 'border-danger/40 bg-danger/[0.07]', title: 'text-danger', mark: '✕' },
  warn: { wrap: 'border-warn/35 bg-warn/[0.06]', title: 'text-warn', mark: '!' },
  info: { wrap: 'border-price/30 bg-price/[0.05]', title: 'text-price', mark: 'i' },
}

interface CalloutProps {
  readonly tone: Tone
  readonly title: string
  readonly children?: ReactNode
}

export function Callout({ tone, title, children }: CalloutProps) {
  const style = TONES[tone]
  return (
    <div className={`rounded-md border px-3 py-2.5 ${style.wrap}`}>
      <div className="flex gap-2">
        <span
          aria-hidden
          className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-bold ${style.title}`}
        >
          {style.mark}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${style.title}`}>{title}</p>
          {children && <div className="mt-1 space-y-1 text-2xs leading-relaxed text-ink/75">{children}</div>}
        </div>
      </div>
    </div>
  )
}
