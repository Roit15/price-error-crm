import { invoiceBackupSchema, type Invoice, type InvoiceBackup } from './invoice'

export const createInvoiceBackup = (invoices: Invoice[]): InvoiceBackup => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  invoices,
})

export const parseInvoiceBackup = (backupText: string): InvoiceBackup => {
  const parsed = JSON.parse(backupText) as unknown
  return invoiceBackupSchema.parse(parsed)
}
