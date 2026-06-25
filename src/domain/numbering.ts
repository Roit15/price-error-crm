import type { Invoice } from './invoice'

const padSequence = (sequence: number) => String(sequence).padStart(3, '0')

export const toInvoiceDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export const generateInvoiceNumber = (existingInvoices: Pick<Invoice, 'invoiceNumber'>[], date = new Date()) => {
  const dateKey = toInvoiceDateKey(date)
  const prefix = `PE-${dateKey}-`
  const highestSequence = existingInvoices
    .filter((invoice) => invoice.invoiceNumber.startsWith(prefix))
    .map((invoice) => Number(invoice.invoiceNumber.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((highest, current) => Math.max(highest, current), 0)

  return `${prefix}${padSequence(highestSequence + 1)}`
}
