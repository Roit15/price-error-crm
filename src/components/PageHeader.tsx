import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  eyebrow?: string
  actions?: ReactNode
}

export const PageHeader = ({ title, eyebrow, actions }: PageHeaderProps) => (
  <div className="no-print mb-6 animate-slide-up glass-card rounded-xl p-5 sm:flex sm:items-end sm:justify-between">
    <div>
      {eyebrow ? (
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-orange-500">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
    </div>
    {actions ? <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">{actions}</div> : null}
  </div>
)
