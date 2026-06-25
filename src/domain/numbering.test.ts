import { describe, expect, it } from 'vitest'
import { generateInvoiceNumber } from './numbering'

describe('generateInvoiceNumber', () => {
  it('uses PE date and the next daily sequence', () => {
    const date = new Date('2026-05-25T10:00:00')

    expect(
      generateInvoiceNumber(
        [
          { invoiceNumber: 'PE-20260525-001' },
          { invoiceNumber: 'PE-20260524-009' },
          { invoiceNumber: 'PE-20260525-002' },
        ],
        date,
      ),
    ).toBe('PE-20260525-003')
  })
})
