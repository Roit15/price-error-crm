import type { AppSettings, Invoice } from './invoice'
import { getInvoiceTerms } from './invoiceContent'
import { formatInr } from './pricing'

const normalizePhoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

// Business owner's WhatsApp number that receives the pending-PNR reminders.
export const REMINDER_WHATSAPP_NUMBER = '918569977977'

const formatReminderDate = (value: string) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

// Whole days elapsed between the invoice creation date and the moment the reminder is sent.
const daysSinceInvoice = (value: string) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000))
}

// A flight ticket whose PNR is still pending: payment captured (Paid) or the PNR is being processed.
// Mirrors the dashboard's "PNR pending" definition.
export const getPendingPnrInvoices = (invoices: Invoice[]) =>
  invoices.filter(
    (invoice) =>
      invoice.invoiceType === 'FlightTicket' && (invoice.status === 'Paid' || invoice.status === 'InProcessPNR'),
  )

export const buildPendingPnrReminderMessage = (invoices: Invoice[]) => {
  const pending = getPendingPnrInvoices(invoices)

  if (pending.length === 0) {
    return 'No pending PNR tickets right now.'
  }

  const balanceDue = (invoice: Invoice) =>
    Math.max(0, invoice.pricing.total - (invoice.pricing.advancePayment ?? 0))

  const lines = pending.map((invoice, index) => {
    const route = [invoice.flight.origin, invoice.flight.destination].filter(Boolean).join(' to ') || 'N/A'
    return [
      `${index + 1}. ${invoice.customer.name || 'Unknown'}`,
      `   Phone: ${invoice.customer.phone || 'N/A'}`,
      `   Route: ${route}`,
      `   Fly date: ${formatReminderDate(invoice.flight.departureDate)}`,
      `   Passengers: ${invoice.flight.passengerCount}`,
      `   Total amount: ${formatInr(invoice.pricing.total)}`,
      `   Advance taken: ${formatInr(invoice.pricing.advancePayment ?? 0)}`,
      `   Balance due: ${formatInr(balanceDue(invoice))}`,
      `   Days since invoice: ${daysSinceInvoice(invoice.createdAt)}`,
    ].join('\n')
  })

  const totalPending = pending.reduce((sum, invoice) => sum + balanceDue(invoice), 0)

  return [
    `Pending PNR reminder - ${pending.length} ticket${pending.length === 1 ? '' : 's'}`,
    '',
    lines.join('\n\n'),
    '',
    `Total pending amount (after advance): ${formatInr(totalPending)}`,
  ].join('\n')
}

export const buildPendingPnrReminderUrl = (invoices: Invoice[]) => {
  const message = encodeURIComponent(buildPendingPnrReminderMessage(invoices))
  return `https://wa.me/${REMINDER_WHATSAPP_NUMBER}?text=${message}`
}

export const buildWhatsAppInvoiceMessage = (invoice: Invoice, settings: AppSettings) => {
  const terms = getInvoiceTerms(invoice)

  if (invoice.invoiceType === 'DigitalService') {
    return [
      `Hello ${invoice.customer.name || 'there'},`,
      '',
      `Here are your ${settings.brandName} digital service invoice details.`,
      `Invoice: ${invoice.invoiceNumber}`,
      `Item: ${invoice.digitalService?.itemName || 'Digital service'}`,
      `Total price: ${formatInr(invoice.pricing.total)}`,
      '',
      ...terms,
    ].join('\n')
  }

  const route = `${invoice.flight.origin} to ${invoice.flight.destination}`
  const returnDate = invoice.flight.returnDate ? `\nReturn: ${invoice.flight.returnDate}` : ''

  return [
    `Hello ${invoice.customer.name || 'there'},`,
    '',
    `Here are your ${settings.brandName} flight quotation details.`,
    `Invoice: ${invoice.invoiceNumber}`,
    `Route: ${route}`,
    `Departure: ${invoice.flight.departureDate}${returnDate}`,
    `Passengers: ${invoice.flight.passengerCount}`,
    `Total fare: ${formatInr(invoice.pricing.totalFare)}`,
    `Discount: ${invoice.pricing.discountPercentage}%`,
    `Final amount: ${formatInr(invoice.pricing.total)}`,
    '',
    ...terms,
  ].join('\n')
}

export const buildWhatsAppInvoiceUrl = (invoice: Invoice, settings: AppSettings) => {
  const phone = normalizePhoneForWhatsApp(invoice.customer.phone)
  const message = encodeURIComponent(buildWhatsAppInvoiceMessage(invoice, settings))
  const phonePath = phone ? `/${phone}` : ''

  return `https://wa.me${phonePath}?text=${message}`
}
