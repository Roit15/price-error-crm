import { describe, expect, it } from 'vitest'
import { parseInvoiceBackup } from './backup'

describe('parseInvoiceBackup', () => {
  it('rejects invalid backup JSON', () => {
    expect(() => parseInvoiceBackup(JSON.stringify({ version: 1, exportedAt: 'now', invoices: [{}] }))).toThrow()
  })
})
