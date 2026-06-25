import { describe, expect, it } from 'vitest'
import { calculateInvoiceTotal } from './pricing'

describe('calculateInvoiceTotal', () => {
  it('applies discount percentage to the total fare', () => {
    expect(
      calculateInvoiceTotal({
        totalFare: 25_000,
        discountPercentage: 10,
      }),
    ).toBe(22_500)
  })

  it('never returns a negative quotation', () => {
    expect(
      calculateInvoiceTotal({
        totalFare: 100,
        discountPercentage: 500,
      }),
    ).toBe(0)
  })
})
