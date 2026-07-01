import type { Invoice, InvoiceStatus } from './invoice'

export type DashboardStats = {
  totalInvoices: number
  revenueCollected: number
  pendingPaymentCount: number
  pendingPaymentValue: number
  pnrPendingCount: number
  paymentBreakdown: {
    digitalServices: PaymentCategoryStats
    flightBookings: PaymentCategoryStats
  }
  statusBreakdown: Record<InvoiceStatus, number>
  thisMonthRevenue: number
  lastMonthRevenue: number
  recentInvoices: Invoice[]
  pendingInvoices: Invoice[]
}

export type PaymentCategoryStats = {
  salesCount: number
  revenue: number
}

const getMonthKey = (isoDate: string) => isoDate.slice(0, 7)

export const ALL_MONTHS = 'all'

// The month an invoice belongs to, preferring the business invoice date over the technical createdAt.
export const getInvoiceMonthKey = (invoice: Invoice) => (invoice.invoiceDate || invoice.createdAt).slice(0, 7)

// Distinct months (YYYY-MM) present in the data, newest first.
export const listInvoiceMonths = (invoices: Invoice[]): string[] =>
  Array.from(new Set(invoices.map(getInvoiceMonthKey)))
    .filter((month) => month.length === 7)
    .sort((a, b) => b.localeCompare(a))

export const filterInvoicesByMonth = (invoices: Invoice[], monthKey: string): Invoice[] =>
  monthKey === ALL_MONTHS ? invoices : invoices.filter((invoice) => getInvoiceMonthKey(invoice) === monthKey)

// Inclusive [from, to] date range covering a whole month, formatted as YYYY-MM-DD.
export const monthRange = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(lastDay).padStart(2, '0')}` }
}

export const formatMonthLabel = (monthKey: string) => {
  if (monthKey === ALL_MONTHS) return 'All time'
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

// Previous month key (YYYY-MM) for month-over-month comparisons.
export const previousMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return getMonthKey(date.toISOString())
}

// Revenue from invoices marked Completed within a given month (by completion/update date).
export const completedRevenueInMonth = (invoices: Invoice[], monthKey: string) =>
  invoices
    .filter((invoice) => invoice.status === 'Completed' && getMonthKey(invoice.updatedAt) === monthKey)
    .reduce((total, invoice) => total + invoice.pricing.total, 0)

export const buildDashboardStats = (invoices: Invoice[]): DashboardStats => {
  const sortedInvoices = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const completedInvoices = invoices.filter((invoice) => invoice.status === 'Completed')
  const pendingPaymentInvoices = invoices.filter((invoice) => invoice.status !== 'Completed')
  const completedDigitalServices = completedInvoices.filter((invoice) => invoice.invoiceType === 'DigitalService')
  const completedFlightBookings = completedInvoices.filter((invoice) => invoice.invoiceType === 'FlightTicket')

  const now = new Date()
  const thisMonthKey = getMonthKey(now.toISOString())
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = getMonthKey(lastMonth.toISOString())

  const thisMonthCompleted = completedInvoices.filter((i) => getMonthKey(i.updatedAt) === thisMonthKey)
  const lastMonthCompleted = completedInvoices.filter((i) => getMonthKey(i.updatedAt) === lastMonthKey)

  const statusBreakdown = {
    Draft: 0,
    Sent: 0,
    Paid: 0,
    InProcessPNR: 0,
    PNRIssued: 0,
    Completed: 0,
  } satisfies Record<InvoiceStatus, number>

  for (const invoice of invoices) {
    statusBreakdown[invoice.status]++
  }

  return {
    totalInvoices: invoices.length,
    revenueCollected: invoices.reduce(
      (total, invoice) => total + (invoice.status === 'Completed' ? invoice.pricing.total : (invoice.pricing.advancePayment ?? 0)),
      0,
    ),
    pendingPaymentCount: pendingPaymentInvoices.length,
    pendingPaymentValue: pendingPaymentInvoices.reduce(
      (total, invoice) => total + Math.max(0, invoice.pricing.total - (invoice.pricing.advancePayment ?? 0)),
      0,
    ),
    pnrPendingCount: invoices.filter((invoice) => invoice.status === 'Paid' || invoice.status === 'InProcessPNR').length,
    paymentBreakdown: {
      digitalServices: buildPaymentCategoryStats(completedDigitalServices),
      flightBookings: buildPaymentCategoryStats(completedFlightBookings),
    },
    statusBreakdown,
    thisMonthRevenue: thisMonthCompleted.reduce((total, i) => total + i.pricing.total, 0),
    lastMonthRevenue: lastMonthCompleted.reduce((total, i) => total + i.pricing.total, 0),
    recentInvoices: sortedInvoices.slice(0, 5),
    pendingInvoices: pendingPaymentInvoices,
  }
}

const buildPaymentCategoryStats = (invoices: Invoice[]): PaymentCategoryStats => ({
  salesCount: invoices.length,
  revenue: invoices.reduce((total, invoice) => total + invoice.pricing.total, 0),
})
