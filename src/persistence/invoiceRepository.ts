import type { Invoice } from '../domain/invoice'
import type { localInvoiceRepository as LocalInvoiceRepository } from './localInvoiceRepository'

type LocalRepository = typeof LocalInvoiceRepository

let localRepositoryPromise: Promise<{
  localInvoiceRepository: LocalRepository
  normalizeInvoice: (invoice: Invoice) => Invoice
}> | null = null

const loadLocalRepository = () => {
  localRepositoryPromise ??= import('./localInvoiceRepository')
  return localRepositoryPromise
}

const normalizeRemoteInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  invoiceType: invoice.invoiceType ?? 'FlightTicket',
  digitalService: invoice.digitalService ?? { itemName: '' },
})

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Central invoice database request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

const runWithLocalFallback = async <T>(remoteAction: () => Promise<T>, localAction: () => Promise<T>) => {
  try {
    return await remoteAction()
  } catch {
    return localAction()
  }
}

const mergeAndSyncLocalInvoices = async (remoteInvoices: Invoice[]) => {
  const { localInvoiceRepository, normalizeInvoice } = await loadLocalRepository()
  const localInvoices = await localInvoiceRepository.list()
  const remoteById = new Map(remoteInvoices.map((invoice) => [invoice.id, invoice]))
  const remoteInvoiceNumbers = new Set(remoteInvoices.map((invoice) => invoice.invoiceNumber))
  const localOnlyInvoices = localInvoices.filter(
    (invoice) => !remoteById.has(invoice.id) && !remoteInvoiceNumbers.has(invoice.invoiceNumber),
  )
  const newerLocalInvoices = localInvoices.filter((invoice) => {
    const remoteInvoice = remoteById.get(invoice.id)
    return remoteInvoice ? invoice.updatedAt > remoteInvoice.updatedAt : false
  })
  const invoicesToSync = [...localOnlyInvoices, ...newerLocalInvoices]

  if (invoicesToSync.length > 0) {
    await requestJson<Invoice[]>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoicesToSync),
    })
  }

  return [...remoteInvoices, ...localOnlyInvoices]
    .map(normalizeInvoice)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const invoiceRepository = {
  list: () =>
    runWithLocalFallback(
      async () => mergeAndSyncLocalInvoices((await requestJson<Invoice[]>('/api/invoices')).map(normalizeRemoteInvoice)),
      async () => {
        const { localInvoiceRepository } = await loadLocalRepository()
        return localInvoiceRepository.list()
      },
    ),
  get: (id: string) =>
    runWithLocalFallback(
      async () => {
        const invoice = await requestJson<Invoice | null>(`/api/invoices?id=${encodeURIComponent(id)}`)
        return invoice ? normalizeRemoteInvoice(invoice) : undefined
      },
      async () => {
        const { localInvoiceRepository } = await loadLocalRepository()
        return localInvoiceRepository.get(id)
      },
    ),
  save: (invoice: Invoice) =>
    runWithLocalFallback(
      async () => {
        await requestJson<Invoice>('/api/invoices', {
          method: 'PUT',
          body: JSON.stringify(invoice),
        })
      },
      async () => {
        const { localInvoiceRepository } = await loadLocalRepository()
        await localInvoiceRepository.save(invoice)
      },
    ),
  delete: (id: string) =>
    runWithLocalFallback(
      async () => {
        await requestJson(`/api/invoices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      },
      async () => {
        const { localInvoiceRepository } = await loadLocalRepository()
        return localInvoiceRepository.delete(id)
      },
    ),
  bulkPut: (invoices: Invoice[]) =>
    runWithLocalFallback(
      async () => {
        await requestJson<Invoice[]>('/api/invoices', {
          method: 'POST',
          body: JSON.stringify(invoices),
        })
      },
      async () => {
        const { localInvoiceRepository } = await loadLocalRepository()
        await localInvoiceRepository.bulkPut(invoices)
      },
    ),
}
