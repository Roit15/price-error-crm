import type { Pricing } from './invoice'

type PricingInput = Omit<Pricing, 'total'>

export const calculateDiscountAmount = (totalFare: number, discountPercentage: number) =>
  Math.round(totalFare * (discountPercentage / 100))

export const calculateInvoiceTotal = ({
  totalFare,
  discountPercentage,
}: Pick<Pricing, 'totalFare' | 'discountPercentage'>) => {
  const discountAmount = calculateDiscountAmount(totalFare, discountPercentage)
  return Math.max(0, totalFare - discountAmount)
}

export const buildPricing = (pricing: Omit<PricingInput, 'discountAmount'>): Pricing => {
  const discountAmount = calculateDiscountAmount(pricing.totalFare, pricing.discountPercentage)

  return {
    ...pricing,
    discountAmount,
    total: calculateInvoiceTotal(pricing),
    advancePayment: pricing.advancePayment ?? 0,
  }
}

export const formatInr = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
