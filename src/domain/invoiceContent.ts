import type { Invoice } from './invoice'

export const flightBusinessHighlights = [
  'Price locked after confirmation',
  'PNR issued within 7 days',
  '20% token after booking confirmation',
]

export const digitalServiceHighlights = [
  'Premium access support',
  'Final price confirmed',
  'Delivery after confirmation',
]

export const getInvoiceHighlights = (invoice: Pick<Invoice, 'invoiceType'>) =>
  invoice.invoiceType === 'DigitalService' ? digitalServiceHighlights : flightBusinessHighlights

export const flightInvoiceTerms = [
  'PNR Details: You will receive your PNR within 7 days.',
  'Price Lock: The price is fully locked, no need to worry about changes.',
  'Payment: 20% token money payment is required after booking confirmation only.',
  'Important Note: Once the booking is done, no modification or cancellation will be allowed.',
]

export const digitalServiceInvoiceTerms = [
  'Digital service details and final price are confirmed in this invoice.',
  'Work will begin after booking confirmation or payment confirmation, as agreed.',
  'Once the service work is started, cancellation or refund will not be allowed.',
]

export const getInvoiceTerms = (invoice: Pick<Invoice, 'invoiceType'>) =>
  invoice.invoiceType === 'DigitalService' ? digitalServiceInvoiceTerms : flightInvoiceTerms

export const getInvoiceTitle = (invoice: Pick<Invoice, 'invoiceType'>) =>
  invoice.invoiceType === 'DigitalService' ? 'Service Invoice' : 'Flight Quotation'

export const getTotalLabel = (invoice: Pick<Invoice, 'invoiceType'>) =>
  invoice.invoiceType === 'DigitalService' ? 'Total Invoice' : 'Total Quotation'
