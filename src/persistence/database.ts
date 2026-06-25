import Dexie, { type Table } from 'dexie'
import type { Invoice } from '../domain/invoice'

class PriceErrorDatabase extends Dexie {
  invoices!: Table<Invoice, string>

  constructor() {
    super('price-error-crm')
    this.version(1).stores({
      invoices: 'id, invoiceNumber, status, createdAt, updatedAt, customer.name, flight.departureDate',
    })
  }
}

export const db = new PriceErrorDatabase()
