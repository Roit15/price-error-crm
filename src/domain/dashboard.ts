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
}

export type PaymentCategoryStats = {
  salesCount: number
  revenue: number
}

const getMonthKey = (isoDate: string) => isoDate.slice(0, 7)

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
  }
}

const buildPaymentCategoryStats = (invoices: Invoice[]): PaymentCategoryStats => ({
  salesCount: invoices.length,
  revenue: invoices.reduce((total, invoice) => total + invoice.pricing.total, 0),
})
