import type { InvoiceStatus } from '../domain/invoice'
import { invoiceStatusLabels } from '../domain/invoice'

const styles: Record<InvoiceStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  Sent: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  Paid: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  InProcessPNR: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  PNRIssued: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
  Completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
}

const pulsing = new Set<InvoiceStatus>(['Sent', 'InProcessPNR', 'Paid'])

const dotColors: Partial<Record<InvoiceStatus, string>> = {
  Sent: 'bg-amber-500',
  InProcessPNR: 'bg-violet-500',
  Paid: 'bg-sky-500',
}

export const StatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[status]}`}>
    {pulsing.has(status) && (
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${dotColors[status] ?? 'bg-current'}`}
        style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
      />
    )}
    {invoiceStatusLabels[status]}
  </span>
)
