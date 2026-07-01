import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TrendingUp, TrendingDown, Minus, FileText, IndianRupee, Clock, Plane, X, BellRing, CalendarRange } from 'lucide-react'
import { CentralDbBanner } from '../components/CentralDbBanner'
import { InvoiceTable } from '../components/InvoiceTable'
import { PageHeader } from '../components/PageHeader'
import {
  ALL_MONTHS,
  buildDashboardStats,
  completedRevenueInMonth,
  filterInvoicesByMonth,
  formatMonthLabel,
  listInvoiceMonths,
  monthRange,
  previousMonthKey,
} from '../domain/dashboard'
import { invoiceStatusLabels, type InvoiceStatus } from '../domain/invoice'
import { formatInr } from '../domain/pricing'
import { buildPendingPnrReminderUrl, getPendingPnrInvoices } from '../domain/whatsapp'
import { useInvoices } from '../services/useInvoices'

export const DashboardPage = () => {
  const { invoices, isLoading, error, reload } = useInvoices()
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS)
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false)

  const months = useMemo(() => listInvoiceMonths(invoices), [invoices])
  const scopedInvoices = useMemo(() => filterInvoicesByMonth(invoices, selectedMonth), [invoices, selectedMonth])
  const stats = buildDashboardStats(scopedInvoices)

  const pendingPnrCount = getPendingPnrInvoices(invoices).length
  const sendPnrReminder = () => {
    if (pendingPnrCount === 0) {
      window.alert('No pending PNR tickets to remind about.')
      return
    }
    window.open(buildPendingPnrReminderUrl(invoices), '_blank', 'noopener,noreferrer')
  }

  // Build a link into the Invoices list carrying the active filters plus the selected month's date range.
  const buildInvoicesLink = (params: Record<string, string>) => {
    const search = new URLSearchParams(params)
    if (selectedMonth !== ALL_MONTHS) {
      const range = monthRange(selectedMonth)
      search.set('from', range.from)
      search.set('to', range.to)
    }
    const query = search.toString()
    return query ? `/invoices?${query}` : '/invoices'
  }

  const trendMonth = selectedMonth === ALL_MONTHS ? new Date().toISOString().slice(0, 7) : selectedMonth
  const trendCurrent = completedRevenueInMonth(invoices, trendMonth)
  const trendPrevious = completedRevenueInMonth(invoices, previousMonthKey(trendMonth))
  const trendPct =
    trendPrevious > 0
      ? Math.round(((trendCurrent - trendPrevious) / trendPrevious) * 100)
      : trendCurrent > 0
        ? 100
        : 0

  const monthSelector = (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
      <CalendarRange size={15} className="text-slate-400" />
      <span className="sr-only">Month</span>
      <select
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        className="min-h-6 bg-transparent pr-1 text-sm font-bold text-slate-700 outline-none"
      >
        <option value={ALL_MONTHS}>All time</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {formatMonthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  )

  const reminderButton = (
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
  )

  const newInvoiceButton = (
    <Link
      to="/invoices/new"
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
    >
      New Invoice
    </Link>
  )

  if (isLoading) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Dashboard" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[100px] rounded-xl" />
          ))}
        </section>
      </>
    )
  }

  if (invoices.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="Dashboard"
          actions={
            <>
              {reminderButton}
              {newInvoiceButton}
            </>
          }
        />
        {error ? <CentralDbBanner message={error} onRetry={() => void reload()} /> : null}
        {error ? null : <section className="animate-slide-up glass-card flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50">
            <FileText size={28} className="text-orange-500" />
          </div>
          <h2 className="text-xl font-black text-slate-950">No invoices yet</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Create your first invoice to see your dashboard analytics, revenue tracking, and status breakdown.
          </p>
          <Link
            to="/invoices/new"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30"
          >
            Create first invoice
          </Link>
        </section>}
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        actions={
          <>
            {monthSelector}
            {reminderButton}
            {newInvoiceButton}
          </>
        }
      />

      {error ? <CentralDbBanner message={error} onRetry={() => void reload()} /> : null}

      {/* ─── Stat Cards ─── */}
      <section className="stagger-children grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<FileText size={18} />}
          label="Total invoices"
          value={stats.totalInvoices.toString()}
          gradient="from-slate-900 to-slate-800"
          iconBg="bg-slate-700"
          to={buildInvoicesLink({})}
        />
        <StatCard
          icon={<IndianRupee size={18} />}
          label="Completed payments"
          value={formatInr(stats.revenueCollected)}
          gradient="from-emerald-600 to-emerald-800"
          iconBg="bg-emerald-500"
          trend={trendPct}
          to={buildInvoicesLink({ status: 'Completed' })}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending payments"
          value={`${stats.pendingPaymentCount} / ${formatInr(stats.pendingPaymentValue)}`}
          gradient="from-orange-500 to-orange-700"
          iconBg="bg-orange-400"
          onClick={() => setIsPendingModalOpen(true)}
        />
        <StatCard
          icon={<Plane size={18} />}
          label="PNR pending"
          value={stats.pnrPendingCount.toString()}
          gradient="from-indigo-600 to-slate-900"
          iconBg="bg-indigo-500"
          to={buildInvoicesLink({ preset: 'pnr' })}
        />
      </section>

      {/* ─── Status Breakdown Bar ─── */}
      {stats.totalInvoices > 0 && (
        <section className="mt-4 animate-slide-up glass-card rounded-xl p-5" style={{ animationDelay: '200ms' }}>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-slate-500">Status Breakdown</h3>
          <StatusBar breakdown={stats.statusBreakdown} total={stats.totalInvoices} />
        </section>
      )}

      {/* ─── Payment Categories ─── */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2 stagger-children">
        <PaymentCategory
          eyebrow="Digital Services"
          title="Digital service sales"
          salesCount={stats.paymentBreakdown.digitalServices.salesCount}
          revenue={stats.paymentBreakdown.digitalServices.revenue}
          accent="orange"
          to={buildInvoicesLink({ type: 'DigitalService', status: 'Completed' })}
        />
        <PaymentCategory
          eyebrow="Flight Bookings"
          title="Flight booked revenue"
          salesCount={stats.paymentBreakdown.flightBookings.salesCount}
          revenue={stats.paymentBreakdown.flightBookings.revenue}
          accent="emerald"
          to={buildInvoicesLink({ type: 'FlightTicket', status: 'Completed' })}
        />
      </section>

      {/* ─── Recent Invoices ─── */}
      <section className="mt-8 animate-slide-up glass-card rounded-xl p-5" style={{ animationDelay: '300ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight text-slate-950">Recent invoices</h3>
          <Link to="/invoices" className="text-sm font-bold text-orange-600 transition-colors duration-200 hover:text-orange-700">
            View all →
          </Link>
        </div>
        <InvoiceTable invoices={stats.recentInvoices} />
      </section>

      {/* ─── Pending Invoices Modal ─── */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 md:p-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">Pending Payments</h2>
                <p className="text-sm font-medium text-slate-500">Invoices awaiting full payment completion.</p>
              </div>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {stats.pendingInvoices.length > 0 ? (
                <InvoiceTable invoices={stats.pendingInvoices} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <IndianRupee size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                  <p className="mt-1 text-sm text-slate-500">There are no pending payments at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Stat Card ─── */
const StatCard = ({
  icon,
  label,
  value,
  gradient,
  iconBg,
  trend,
  to,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  gradient: string
  iconBg: string
  trend?: number
  to?: string
  onClick?: () => void
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} shadow-sm`}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${trend > 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
        {trend === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/60">
            <Minus size={12} />
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-bold text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </>
  )

  const baseClassName = `hover-lift block w-full text-left rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`
  const interactiveClassName = 'cursor-pointer transition-transform hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

  if (to) {
    return (
      <Link to={to} className={`${baseClassName} ${interactiveClassName}`}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClassName} ${interactiveClassName}`}>
        {content}
      </button>
    )
  }

  return <article className={baseClassName}>{content}</article>
}

/* ─── Status Breakdown Bar ─── */
const statusColors: Record<InvoiceStatus, string> = {
  Draft: 'bg-slate-400',
  Sent: 'bg-amber-400',
  Paid: 'bg-sky-400',
  InProcessPNR: 'bg-violet-400',
  PNRIssued: 'bg-indigo-400',
  Completed: 'bg-emerald-400',
}

const statusDotColors: Record<InvoiceStatus, string> = {
  Draft: 'bg-slate-400',
  Sent: 'bg-amber-400',
  Paid: 'bg-sky-400',
  InProcessPNR: 'bg-violet-400',
  PNRIssued: 'bg-indigo-400',
  Completed: 'bg-emerald-400',
}

const StatusBar = ({ breakdown, total }: { breakdown: Record<InvoiceStatus, number>; total: number }) => {
  const entries = (Object.entries(breakdown) as [InvoiceStatus, number][]).filter(([, count]) => count > 0)

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {entries.map(([status, count]) => (
          <div
            key={status}
            className={`${statusColors[status]} transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${invoiceStatusLabels[status]}: ${count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([status, count]) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`inline-block h-2 w-2 rounded-full ${statusDotColors[status]}`} />
            <span className="font-semibold">{invoiceStatusLabels[status]}</span>
            <span className="font-bold text-slate-900">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Payment Category ─── */
const categoryAccents = {
  orange: {
    badge: 'bg-orange-50 text-orange-700 ring-orange-200/80',
    gradient: 'from-orange-50 to-white',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
    gradient: 'from-emerald-50 to-white',
  },
}

const PaymentCategory = ({
  eyebrow,
  title,
  salesCount,
  revenue,
  accent,
  to,
}: {
  eyebrow: string
  title: string
  salesCount: number
  revenue: number
  accent: keyof typeof categoryAccents
  to?: string
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${categoryAccents[accent].badge}`}>{eyebrow}</p>
          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-950">{title}</h3>
        </div>
        <p className="text-right text-2xl font-black text-slate-950">{formatInr(revenue)}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`rounded-lg bg-gradient-to-br ${categoryAccents[accent].gradient} p-3`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales</p>
          <p className="mt-1 text-xl font-black text-slate-950">{salesCount}</p>
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${categoryAccents[accent].gradient} p-3`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenue</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatInr(revenue)}</p>
        </div>
      </div>
    </>
  )

  const className = 'glass-card hover-lift block rounded-xl p-5'

  return to ? (
    <Link to={to} className={`${className} transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40`}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  )
}
