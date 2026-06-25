import { z } from 'zod'

export const invoiceStatuses = ['Draft', 'Sent', 'Paid', 'InProcessPNR', 'PNRIssued', 'Completed'] as const

export type InvoiceStatus = (typeof invoiceStatuses)[number]

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  Draft: 'Draft',
  Sent: 'Sent',
  Paid: 'Paid',
  InProcessPNR: 'In Process PNR',
  PNRIssued: 'PNR Issued',
  Completed: 'Completed',
}

export const travelClasses = ['Economy', 'Business', 'First'] as const
export type TravelClass = (typeof travelClasses)[number]

export const invoiceTypes = ['FlightTicket', 'DigitalService'] as const
export type InvoiceType = (typeof invoiceTypes)[number]

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  FlightTicket: 'Flight Ticket',
  DigitalService: 'Digital Service',
}

export type Customer = {
  name: string
  phone: string
}

export type FlightDetails = {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  airline?: string
  travelClass: TravelClass
  passengerCount: number
  passengerNames?: string
}

export type Pricing = {
  totalFare: number
  discountPercentage: number
  discountAmount: number
  total: number
  advancePayment: number
}

export const digitalServiceItems = [
  'LinkedIn Voucher 1M Career Premium',
  'LinkedIn Voucher 3M Career Premium',
  'LinkedIn Voucher 6M Career Premium',
  'LinkedIn Voucher 12M Career Premium',
  'LinkedIn Voucher 1M Business Premium',
  'LinkedIn Voucher 3M Business Premium',
  'LinkedIn Voucher 6M Business Premium',
  'LinkedIn Voucher 12M Business Premium',
  'LinkedIn Voucher 1M Sales Navigator Core',
  'LinkedIn Voucher 3M Sales Navigator Core',
  'LinkedIn Voucher 6M Sales Navigator Core',
  'LinkedIn Voucher 12M Sales Navigator Core',
  'Cult Fit Elite 1M',
  'Cult Fit Elite 3M',
  'Cult Fit Elite 6M',
  'Cult Fit Elite 12M',
] as const

export type DigitalServiceDetails = {
  itemName: string
}

export type Invoice = {
  id: string
  invoiceNumber: string
  invoiceDate: string
  invoiceType: InvoiceType
  status: InvoiceStatus
  customer: Customer
  flight: FlightDetails
  digitalService: DigitalServiceDetails
  pricing: Pricing
  createdAt: string
  updatedAt: string
}

export type AppSettings = {
  brandName: string
  tagline: string
  logoUrl: string
  phone: string
  website: string
  upiId: string
  upiPayeeName: string
}

export const defaultSettings: AppSettings = {
  brandName: 'Price Error',
  tagline: 'Premium Deals. Smarter Prices.',
  logoUrl: '/price-error-logo.png',
  phone: '8569977977',
  website: '@priceerror',
  upiId: '',
  upiPayeeName: 'Price Error',
}

const optionalText = z.string().trim().optional().or(z.literal(''))

export const invoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().regex(/^PE-\d{8}-\d{3}$/),
  invoiceDate: z.string().min(1),
  invoiceType: z.enum(invoiceTypes).default('FlightTicket'),
  status: z.enum(invoiceStatuses),
  customer: z.object({
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1),
  }),
  flight: z.object({
    origin: optionalText,
    destination: optionalText,
    departureDate: optionalText,
    returnDate: optionalText,
    airline: optionalText,
    travelClass: z.enum(travelClasses),
    passengerCount: z.coerce.number().int().min(1),
    passengerNames: optionalText,
  }),
  digitalService: z.object({
    itemName: optionalText,
  }).default({ itemName: '' }),
  pricing: z.object({
    totalFare: z.coerce.number().min(0),
    discountPercentage: z.coerce.number().min(0).max(100),
    discountAmount: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
    advancePayment: z.coerce.number().min(0).optional(),
  }),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const invoiceBackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().min(1),
  invoices: z.array(invoiceSchema),
})

export type InvoiceBackup = z.infer<typeof invoiceBackupSchema>
