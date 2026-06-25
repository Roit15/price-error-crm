import type { AppSettings, Invoice } from './invoice'
import { getInvoiceTerms } from './invoiceContent'
import { formatInr } from './pricing'

const normalizePhoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
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
