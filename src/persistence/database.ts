import Dexie, { type Table } from 'dexie'
import type { Invoice } from '../domain/invoice'
import type { CanceledPnr } from '../domain/canceledPnr'

class PriceErrorDatabase extends Dexie {
  invoices!: Table<Invoice, string>
  canceledPnrs!: Table<CanceledPnr, string>

  constructor() {
    super('price-error-crm')
    this.version(1).stores({
      invoices: 'id, invoiceNumber, status, createdAt, updatedAt, customer.name, flight.departureDate',
    })
    this.version(2).stores({
      invoices: 'id, invoiceNumber, status, createdAt, updatedAt, customer.name, flight.departureDate',
      canceledPnrs: 'id, createdAt, updatedAt',
    })
  }
}

export const db = new PriceErrorDatabase()
