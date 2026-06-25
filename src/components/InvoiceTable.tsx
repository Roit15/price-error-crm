import { Link } from 'react-router'
import { Eye, Pencil, Trash2, MessageCircle } from 'lucide-react'
import type { Invoice } from '../domain/invoice'
import { formatInr } from '../domain/pricing'
import { buildWhatsAppInvoiceUrl } from '../domain/whatsapp'
import { createInvoicePdfBlob, downloadBlob } from '../services/pdfExport'
import { useSettingsStore } from '../store/settingsStore'
import { StatusBadge } from './StatusBadge'

type InvoiceTableProps = {
  invoices: Invoice[]
  onDelete?: (invoice: Invoice) => void
}

const formatShortDate = (isoDate: string) => {
  if (!isoDate) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).format(
      new Date(isoDate),
    )
  } catch {
    return isoDate.slice(0, 10)
  }
}

export const InvoiceTable = ({ invoices, onDelete }: InvoiceTableProps) => {
  const settings = useSettingsStore((state) => state.settings)
  const openCustomerWhatsAppWithPdf = async (invoice: Invoice) => {
    const filename = `${invoice.invoiceNumber}.pdf`
    const pdfBlob = await createInvoicePdfBlob(invoice, settings)
    downloadBlob(pdfBlob, filename)
    window.open(buildWhatsAppInvoiceUrl(invoice, settings), '_blank', 'noreferrer')
  }

  return (
    <>
      {/* ─── Mobile Cards ─── */}
      <div className="space-y-3 md:hidden">
        {invoices.map((invoice, index) => (
          <article
            key={invoice.id}
            className="glass-card animate-slide-up rounded-xl p-4 transition-all duration-200 hover:shadow-md"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{invoice.invoiceNumber}</p>
                <p className="mt-0.5 truncate text-sm text-slate-600">{invoice.customer.name || 'Unnamed customer'}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatShortDate(invoice.createdAt)}</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {invoice.invoiceType === 'DigitalService'
                ? invoice.digitalService?.itemName || 'Digital service'
                : `${invoice.flight.origin || 'Origin'} → ${invoice.flight.destination || 'Destination'}`}
            </p>
            {invoice.invoiceType === 'FlightTicket' && invoice.flight.departureDate ? (
              <p className="mt-1 text-xs font-semibold text-orange-600">✈ Departure: {formatShortDate(invoice.flight.departureDate)}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-lg font-black text-slate-950">{formatInr(invoice.pricing.total)}</p>
              <div className="flex gap-1.5">
                <Link
                  to={`/invoices/${invoice.id}/preview`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200"
                  title="Preview"
                  aria-label={`Preview invoice ${invoice.invoiceNumber}`}
                >
                  <Eye size={15} />
                </Link>
                <Link
                  to={`/invoices/${invoice.id}/edit`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200"
                  title="Edit"
                  aria-label={`Edit invoice ${invoice.invoiceNumber}`}
                >
                  <Pencil size={15} />
                </Link>
                <button
                  type="button"
                  onClick={() => void openCustomerWhatsAppWithPdf(invoice)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#128c7e] transition-all duration-200 hover:bg-emerald-100"
                  title="Download PDF and open customer WhatsApp"
                  aria-label={`Share invoice ${invoice.invoiceNumber} via WhatsApp`}
                >
                  <MessageCircle size={15} />
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(invoice)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100"
                    title="Delete"
                    aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {invoices.length === 0 ? (
          <div className="glass-card rounded-xl px-4 py-10 text-center text-sm text-slate-500">No invoices found.</div>
        ) : null}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden overflow-hidden rounded-xl glass-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-gradient-to-r from-slate-950 to-slate-900 text-xs uppercase tracking-wider text-white/70">
              <tr>
                <th className="px-4 py-3.5">Invoice</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Details</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Departure</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="group transition-colors duration-200 hover:bg-orange-50/40">
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="font-bold text-slate-950">{invoice.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{invoice.customer.name || 'Unnamed customer'}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {invoice.invoiceType === 'DigitalService'
                      ? invoice.digitalService?.itemName || 'Digital service'
                      : `${invoice.flight.origin || 'Origin'} → ${invoice.flight.destination || 'Destination'}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${invoice.invoiceType === 'DigitalService' ? 'bg-purple-50 text-purple-700' : 'bg-sky-50 text-sky-700'}`}>
                      {invoice.invoiceType === 'DigitalService' ? 'Digital' : 'Flight'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                    {invoice.invoiceType === 'FlightTicket' && invoice.flight.departureDate
                      ? <span className="font-semibold text-orange-600">{formatShortDate(invoice.flight.departureDate)}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                    {formatShortDate(invoice.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-black text-slate-950">{formatInr(invoice.pricing.total)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Link
                        to={`/invoices/${invoice.id}/preview`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
                        title="Preview"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        to={`/invoices/${invoice.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void openCustomerWhatsAppWithPdf(invoice)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-emerald-50 hover:text-[#128c7e]"
                        title="Download PDF and open customer WhatsApp"
                        aria-label={`Share invoice ${invoice.invoiceNumber} via WhatsApp`}
                      >
                        <MessageCircle size={15} />
                      </button>
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(invoice)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
