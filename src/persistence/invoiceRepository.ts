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

const apiToken = import.meta.env.VITE_CRM_API_TOKEN as string | undefined

// 'unconfigured' means there is no central database (local-only deployment or dev): falling back
// to local storage is correct. 'unauthorized'/'unavailable' mean a central database IS configured
// but cannot be reached — we must surface that instead of silently showing empty local data.
export type CentralDbErrorKind = 'unconfigured' | 'unauthorized' | 'unavailable'

export class CentralDbError extends Error {
  readonly kind: CentralDbErrorKind
  readonly status: number

  constructor(kind: CentralDbErrorKind, status: number, message: string) {
    super(message)
    this.name = 'CentralDbError'
    this.kind = kind
    this.status = status
  }
}

// True when falling back to local storage is the right behaviour: either no central database is
// configured, or a transient network error where we cannot tell (offline tolerance).
const isLocalModeError = (error: unknown) =>
  !(error instanceof CentralDbError) || error.kind === 'unconfigured'

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const rawBody = await response.text()
  const parsedBody = ((): unknown => {
    if (!rawBody) return null
    try {
      return JSON.parse(rawBody)
    } catch {
      return null
    }
  })()

  if (response.ok) {
    // A non-JSON 200 means the request hit the SPA fallback, i.e. no serverless API is present
    // (typical in local dev) — treat it as "no central database".
    if (parsedBody === null && rawBody) {
      throw new CentralDbError('unconfigured', response.status, 'Central database API is not available.')
    }
    return parsedBody as T
  }

  const serverMessage =
    parsedBody && typeof (parsedBody as { error?: unknown }).error === 'string'
      ? (parsedBody as { error: string }).error
      : ''

  if (response.status === 503 && serverMessage === 'Central database is not configured.') {
    throw new CentralDbError('unconfigured', response.status, serverMessage)
  }
  if (response.status === 404) {
    throw new CentralDbError('unconfigured', response.status, 'Central database API is not available.')
  }
  if (response.status === 401 || (response.status === 503 && /CRM_API_TOKEN/i.test(serverMessage))) {
    throw new CentralDbError(
      'unauthorized',
      response.status,
      serverMessage || 'Central database access is not authorized.',
    )
  }
  throw new CentralDbError(
    'unavailable',
    response.status,
    serverMessage || `Central invoice database request failed: ${response.status}`,
  )
}

// Writes stay resilient: during a central-database outage they fall back to local storage and are
// merged back up on the next successful list(). The read path (list) is the one that must surface
// outages, so it does not use this helper.
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
  // Unlike the writes below, list surfaces a configured-but-unreachable central database instead of
  // silently returning empty local data, so an outage can never look like total data loss.
  list: async (): Promise<Invoice[]> => {
    try {
      const remoteInvoices = (await requestJson<Invoice[]>('/api/invoices')).map(normalizeRemoteInvoice)
      return await mergeAndSyncLocalInvoices(remoteInvoices)
    } catch (error) {
      if (isLocalModeError(error)) {
        const { localInvoiceRepository } = await loadLocalRepository()
        return localInvoiceRepository.list()
      }
      throw error
    }
  },
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
