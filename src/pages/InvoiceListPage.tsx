import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search, SlidersHorizontal, FileText, BellRing } from 'lucide-react'
import { InvoiceTable } from '../components/InvoiceTable'
import { PageHeader } from '../components/PageHeader'
import { invoiceStatuses, invoiceStatusLabels, invoiceTypeLabels, invoiceTypes, type Invoice, type InvoiceStatus, type InvoiceType } from '../domain/invoice'
import { buildPendingPnrReminderUrl, getPendingPnrInvoices } from '../domain/whatsapp'
import { invoiceRepository } from '../persistence/invoiceRepository'
import { useInvoices } from '../services/useInvoices'

type StatusFilter = 'All' | InvoiceStatus
type TypeFilter = 'All' | InvoiceType
type SortOption = 'Newest' | 'Oldest' | 'PaymentHighToLow' | 'PaymentLowToHigh'

export const InvoiceListPage = () => {
  const { invoices, isLoading, reload } = useInvoices()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [sort, setSort] = useState<SortOption>('Newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchingInvoices = invoices.filter((invoice) => {
      const matchesStatus = status === 'All' || invoice.status === status
      const matchesType = typeFilter === 'All' || invoice.invoiceType === typeFilter
      const matchesQuery =
        normalizedQuery.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(normalizedQuery) ||
        invoice.customer.name.toLowerCase().includes(normalizedQuery)

      const invoiceDate = invoice.invoiceDate || invoice.createdAt.slice(0, 10)
      const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom
      const matchesDateTo = !dateTo || invoiceDate <= dateTo

      return matchesStatus && matchesType && matchesQuery && matchesDateFrom && matchesDateTo
    })

    return [...matchingInvoices].sort((a, b) => {
      if (sort === 'PaymentHighToLow') return b.pricing.total - a.pricing.total
      if (sort === 'PaymentLowToHigh') return a.pricing.total - b.pricing.total
      if (sort === 'Oldest') return a.createdAt.localeCompare(b.createdAt)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [invoices, query, status, typeFilter, sort, dateFrom, dateTo])

  const deleteInvoice = async (invoice: Invoice) => {
    const confirmed = window.confirm(`Delete ${invoice.invoiceNumber}?`)
    if (!confirmed) return
    await invoiceRepository.delete(invoice.id)
    await reload()
  }

  const pendingPnrCount = useMemo(() => getPendingPnrInvoices(invoices).length, [invoices])

  const sendPnrReminder = () => {
    if (pendingPnrCount === 0) {
      window.alert('No pending PNR tickets to remind about.')
      return
    }
    window.open(buildPendingPnrReminderUrl(invoices), '_blank', 'noopener,noreferrer')
  }

  const hasActiveFilters = status !== 'All' || typeFilter !== 'All' || dateFrom || dateTo || query

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Invoices"
        actions={
          <>
            <button
              type="button"
              onClick={sendPnrReminder}
              disabled={pendingPnrCount === 0}
              title={pendingPnrCount === 0 ? 'No pending PNR tickets' : `Send a WhatsApp reminder for ${pendingPnrCount} pending PNR ticket(s)`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-200 hover:bg-emerald-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BellRing size={15} />
              PNR Reminder{pendingPnrCount > 0 ? ` (${pendingPnrCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow"
            >
              Refresh
            </button>
            <Link
              to="/invoices/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
            >
              New Invoice
            </Link>
          </>
        }
      />

      {/* ─── Filter Bar ─── */}
      <section className="animate-slide-up mb-4 glass-card rounded-xl p-4" style={{ animationDelay: '60ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <SlidersHorizontal size={14} />
            Filters
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatus('All')
                setTypeFilter('All')
                setDateFrom('')
                setDateTo('')
              }}
              className="text-xs font-bold text-orange-600 transition-colors hover:text-orange-700"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_180px_150px_150px]">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Search</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Name or invoice #"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            >
              <option value="All">All statuses</option>
              {invoiceStatuses.map((invoiceStatus) => (
                <option key={invoiceStatus} value={invoiceStatus}>
                  {invoiceStatusLabels[invoiceStatus]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            >
              <option value="All">All types</option>
              {invoiceTypes.map((type) => (
                <option key={type} value={type}>
                  {invoiceTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            >
              <option value="Newest">Newest first</option>
              <option value="Oldest">Oldest first</option>
              <option value="PaymentHighToLow">Payment ↓</option>
              <option value="PaymentLowToHigh">Payment ↑</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">From date</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">To date</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </label>
        </div>
      </section>

      {/* ─── Results Count ─── */}
      <div className="mb-3 flex items-center gap-2 animate-fade-in">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          <FileText size={12} />
          {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' (filtered)' : ''}
        </span>
      </div>

      {/* ─── Table ─── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 && hasActiveFilters ? (
        <div className="animate-scale-in glass-card flex flex-col items-center rounded-xl px-6 py-12 text-center">
          <Search size={32} className="text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-600">No invoices match your filters</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter criteria</p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setStatus('All')
              setTypeFilter('All')
              setDateFrom('')
              setDateTo('')
            }}
            className="mt-4 text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>
          <InvoiceTable invoices={filteredInvoices} onDelete={deleteInvoice} />
        </div>
      )}
    </>
  )
}
