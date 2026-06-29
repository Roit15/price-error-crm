import { describe, expect, it } from 'vitest'
import type { Invoice } from './invoice'
import {
  REMINDER_WHATSAPP_NUMBER,
  buildPendingPnrReminderMessage,
  buildPendingPnrReminderUrl,
  getPendingPnrInvoices,
} from './whatsapp'

const invoice = (
  overrides: Partial<Invoice> & { status: Invoice['status'] },
  invoiceType: Invoice['invoiceType'] = 'FlightTicket',
): Invoice => ({
  id: crypto.randomUUID(),
  invoiceNumber: 'PE-20260525-001',
  invoiceDate: '2026-05-25',
  invoiceType,
  customer: { name: 'Rahul Sharma', phone: '9999999999' },
  flight: {
    origin: 'Delhi (DEL)',
    destination: 'London (LHR)',
    departureDate: '2026-06-10',
    returnDate: '',
    airline: 'Air India',
    travelClass: 'Economy',
    passengerCount: 2,
    passengerNames: '',
  },
  digitalService: { itemName: '' },
  pricing: { totalFare: 24000, discountPercentage: 0, discountAmount: 0, total: 24000, advancePayment: 0 },
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
  ...overrides,
})

describe('getPendingPnrInvoices', () => {
  it('selects only Paid/InProcessPNR flight tickets', () => {
    const invoices = [
      invoice({ status: 'Paid' }),
      invoice({ status: 'InProcessPNR' }),
      invoice({ status: 'Draft' }),
      invoice({ status: 'Completed' }),
      invoice({ status: 'Paid' }, 'DigitalService'),
    ]

    expect(getPendingPnrInvoices(invoices)).toHaveLength(2)
  })
})

describe('buildPendingPnrReminderMessage', () => {
  it('lists pending tickets with the required fields', () => {
    const message = buildPendingPnrReminderMessage([
      invoice({
        status: 'InProcessPNR',
        invoiceNumber: 'PE-20260525-007',
        customer: { name: 'Rahul Sharma', phone: '9876543210' },
        flight: {
          origin: 'Mumbai (BOM)',
          destination: 'Dubai (DXB)',
          departureDate: '2026-07-01',
          returnDate: '',
          travelClass: 'Economy',
          passengerCount: 3,
        },
        pricing: { totalFare: 24000, discountPercentage: 0, discountAmount: 0, total: 24000, advancePayment: 5000 },
      }),
    ])

    expect(message).toContain('Pending PNR reminder - 1 ticket')
    expect(message).toContain('1. Rahul Sharma')
    expect(message).not.toContain('PE-20260525-007')
    expect(message).toContain('Phone: 9876543210')
    expect(message).toContain('Mumbai (BOM) to Dubai (DXB)')
    expect(message).toContain('Passengers: 3')
    expect(message).toContain('Advance taken:')
    expect(message).toContain('Days since invoice:')
    expect(message).not.toContain('Invoice created')
    expect(message).toContain('Total pending amount')
  })

  it('reports when nothing is pending', () => {
    expect(buildPendingPnrReminderMessage([invoice({ status: 'Completed' })])).toBe('No pending PNR tickets right now.')
  })
})

describe('buildPendingPnrReminderUrl', () => {
  it('targets the reminder WhatsApp number with an encoded message', () => {
    const url = buildPendingPnrReminderUrl([invoice({ status: 'Paid' })])
    expect(url.startsWith(`https://wa.me/${REMINDER_WHATSAPP_NUMBER}?text=`)).toBe(true)
    expect(url).toContain('%0A')
  })
})
