import { createInvoiceBackup, parseInvoiceBackup } from '../domain/backup'
import type { Invoice, InvoiceStatus } from '../domain/invoice'
import { buildPricing } from '../domain/pricing'
import { generateInvoiceNumber } from '../domain/numbering'
import { invoiceRepository } from '../persistence/invoiceRepository'

export type InvoiceDraftInput = {
  id?: string
  invoiceType: Invoice['invoiceType']
  status: InvoiceStatus
  customer: Invoice['customer']
  flight: Invoice['flight']
  digitalService: Invoice['digitalService']
  pricing: Omit<Invoice['pricing'], 'discountAmount' | 'total'>
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

export const createEmptyInvoice = async (): Promise<Invoice> => {
  const now = new Date().toISOString()
  // Numbering only needs existing invoices to avoid collisions; if the central database is briefly
  // unreachable, fall back to an empty list so a new invoice can still be drafted offline.
  const invoices = await invoiceRepository.list().catch(() => [] as Invoice[])

  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(invoices),
    invoiceDate: todayIsoDate(),
    invoiceType: 'FlightTicket',
    status: 'Draft',
    customer: {
      name: '',
      phone: '',
    },
    flight: {
      origin: '',
      destination: '',
      departureDate: '',
      returnDate: '',
      airline: '',
      travelClass: 'Economy',
      passengerCount: 1,
      passengerNames: '',
    },
    digitalService: {
      itemName: '',
    },
    pricing: {
      totalFare: 0,
      discountPercentage: 0,
      discountAmount: 0,
      total: 0,
      advancePayment: 0,
    },
    createdAt: now,
    updatedAt: now,
  }
}

export const saveInvoiceDraft = async (existing: Invoice, input: InvoiceDraftInput) => {
  const now = new Date().toISOString()
  const invoice: Invoice = {
    ...existing,
    invoiceType: input.invoiceType,
    status: input.status,
    customer: input.customer,
    flight: input.flight,
    digitalService: input.digitalService,
    pricing: buildPricing(input.pricing),
    updatedAt: now,
  }

  await invoiceRepository.save(invoice)
  return invoice
}

export const exportInvoices = async () => {
  const invoices = await invoiceRepository.list()
  return JSON.stringify(createInvoiceBackup(invoices), null, 2)
}

export const importInvoices = async (backupText: string) => {
  const backup = parseInvoiceBackup(backupText)
  const invoices: Invoice[] = backup.invoices.map((invoice) => ({
    ...invoice,
    invoiceType: invoice.invoiceType,
    flight: {
      ...invoice.flight,
      origin: invoice.flight.origin ?? '',
      destination: invoice.flight.destination ?? '',
      departureDate: invoice.flight.departureDate ?? '',
      returnDate: invoice.flight.returnDate ?? '',
      airline: invoice.flight.airline ?? '',
      passengerNames: invoice.flight.passengerNames ?? '',
    },
    digitalService: {
      itemName: invoice.digitalService.itemName ?? '',
    },
    pricing: {
      ...invoice.pricing,
      advancePayment: invoice.pricing.advancePayment ?? 0,
    },
  }))

  await invoiceRepository.bulkPut(invoices)
  return invoices.length
}
