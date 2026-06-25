import { db } from './database'
import type { Invoice } from '../domain/invoice'

type LegacyPricing = {
  baseFarePerPerson?: number
  taxesFeesPerPerson?: number
  serviceFeePerInvoice?: number
  discount?: number
  totalFare?: number
  discountPercentage?: number
  discountAmount?: number
  total?: number
  advancePayment?: number
}

export const normalizeInvoice = (invoice: Invoice): Invoice => {
  const invoiceWithDefaults = {
    ...invoice,
    invoiceType: invoice.invoiceType ?? 'FlightTicket',
    digitalService: invoice.digitalService ?? { itemName: '' },
  }
  const pricing = invoiceWithDefaults.pricing as LegacyPricing
  
  if (typeof pricing.totalFare === 'number') {
    return {
      ...invoiceWithDefaults,
      pricing: {
        totalFare: pricing.totalFare ?? 0,
        discountPercentage: pricing.discountPercentage ?? 0,
        discountAmount: pricing.discountAmount ?? 0,
        total: pricing.total ?? 0,
        advancePayment: pricing.advancePayment ?? 0,
      }
    }
  }

  const passengerCount = invoiceWithDefaults.flight.passengerCount || 1
  const oldTotalFare =
    ((pricing.baseFarePerPerson ?? 0) + (pricing.taxesFeesPerPerson ?? 0)) * passengerCount +
    (pricing.serviceFeePerInvoice ?? 0)
  const oldDiscount = pricing.discount ?? 0
  const discountPercentage = oldTotalFare > 0 ? Number(((oldDiscount / oldTotalFare) * 100).toFixed(2)) : 0

  return {
    ...invoiceWithDefaults,
    pricing: {
      totalFare: oldTotalFare,
      discountPercentage,
      discountAmount: oldDiscount,
      total: pricing.total ?? Math.max(0, oldTotalFare - oldDiscount),
      advancePayment: pricing.advancePayment ?? 0,
    },
  }
}

export const localInvoiceRepository = {
  list: async () => (await db.invoices.orderBy('createdAt').reverse().toArray()).map(normalizeInvoice),
  get: async (id: string) => {
    const invoice = await db.invoices.get(id)
    return invoice ? normalizeInvoice(invoice) : undefined
  },
  save: (invoice: Invoice) => db.invoices.put(invoice),
  delete: (id: string) => db.invoices.delete(id),
  bulkPut: (invoices: Invoice[]) => db.invoices.bulkPut(invoices),
}
