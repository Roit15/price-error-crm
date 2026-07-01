import { describe, expect, it } from 'vitest'
import type { Invoice } from './invoice'
import {
  buildDashboardStats,
  filterInvoicesByMonth,
  formatMonthLabel,
  getInvoiceMonthKey,
  listInvoiceMonths,
  monthRange,
  previousMonthKey,
} from './dashboard'

const invoice = (status: Invoice['status'], total: number, invoiceType: Invoice['invoiceType'] = 'FlightTicket'): Invoice => ({
  id: crypto.randomUUID(),
  invoiceNumber: `PE-20260525-${Math.floor(Math.random() * 900 + 100)}`,
  invoiceDate: '2026-05-25',
  invoiceType,
  status,
  customer: { name: 'A Customer', phone: '9999999999' },
  flight: {
    origin: 'Delhi (DEL)',
    destination: 'London (LHR)',
    departureDate: '2026-06-10',
    returnDate: '',
    airline: 'Air India',
    travelClass: 'Economy',
    passengerCount: 1,
    passengerNames: '',
  },
  digitalService: {
    itemName: '',
  },
  pricing: {
    totalFare: total,
    discountPercentage: 0,
    discountAmount: 0,
    total,
    advancePayment: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('buildDashboardStats', () => {
  it('counts payment as completed only after the invoice is completed', () => {
    const stats = buildDashboardStats([
      invoice('Draft', 100),
      invoice('Sent', 200),
      invoice('Paid', 300),
      invoice('InProcessPNR', 350),
      invoice('PNRIssued', 400),
      invoice('Completed', 500),
      invoice('Completed', 900, 'DigitalService'),
      invoice('Sent', 700, 'DigitalService'),
    ])

    expect(stats.totalInvoices).toBe(8)
    expect(stats.revenueCollected).toBe(1_400)
    expect(stats.pendingPaymentCount).toBe(6)
    expect(stats.pendingPaymentValue).toBe(2_050)
    expect(stats.pnrPendingCount).toBe(2)
    expect(stats.paymentBreakdown.flightBookings).toEqual({ salesCount: 1, revenue: 500 })
    expect(stats.paymentBreakdown.digitalServices).toEqual({ salesCount: 1, revenue: 900 })
  })
})

describe('monthly helpers', () => {
  const withDate = (invoiceDate: string) => ({ ...invoice('Completed', 100), invoiceDate })

  it('derives the month key from the invoice date', () => {
    expect(getInvoiceMonthKey(withDate('2026-05-25'))).toBe('2026-05')
  })

  it('lists distinct months newest first', () => {
    const months = listInvoiceMonths([withDate('2026-05-01'), withDate('2026-07-15'), withDate('2026-05-20')])
    expect(months).toEqual(['2026-07', '2026-05'])
  })

  it('filters invoices to a single month, and returns all for the sentinel', () => {
    const invoices = [withDate('2026-05-01'), withDate('2026-06-01')]
    expect(filterInvoicesByMonth(invoices, '2026-05')).toHaveLength(1)
    expect(filterInvoicesByMonth(invoices, 'all')).toHaveLength(2)
  })

  it('computes an inclusive month range covering leap-year February', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })

  it('computes the previous month across a year boundary', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(previousMonthKey('2026-07')).toBe('2026-06')
  })

  it('formats a friendly month label', () => {
    expect(formatMonthLabel('all')).toBe('All time')
    expect(formatMonthLabel('2026-07')).toBe('July 2026')
  })
})
