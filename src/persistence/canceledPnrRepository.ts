import type { CanceledPnr } from '../domain/canceledPnr'
import type { localCanceledPnrRepository as LocalCanceledPnrRepository } from './localCanceledPnrRepository'
import { CentralDbError } from './invoiceRepository'

type LocalRepository = typeof LocalCanceledPnrRepository

let localRepositoryPromise: Promise<{
  localCanceledPnrRepository: LocalRepository
}> | null = null

const loadLocalRepository = () => {
  localRepositoryPromise ??= import('./localCanceledPnrRepository')
  return localRepositoryPromise
}

const apiToken = import.meta.env.VITE_CRM_API_TOKEN as string | undefined

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
    serverMessage || `Central database request failed: ${response.status}`,
  )
}

const runWithLocalFallback = async <T>(remoteAction: () => Promise<T>, localAction: () => Promise<T>) => {
  try {
    return await remoteAction()
  } catch {
    return localAction()
  }
}

const mergeAndSyncLocalPnrs = async (remotePnrs: CanceledPnr[]) => {
  const { localCanceledPnrRepository } = await loadLocalRepository()
  const localPnrs = await localCanceledPnrRepository.list()
  const remoteById = new Map(remotePnrs.map((pnr) => [pnr.id, pnr]))
  const localOnlyPnrs = localPnrs.filter((pnr) => !remoteById.has(pnr.id))
  const newerLocalPnrs = localPnrs.filter((pnr) => {
    const remotePnr = remoteById.get(pnr.id)
    return remotePnr ? pnr.updatedAt > remotePnr.updatedAt : false
  })
  const pnrsToSync = [...localOnlyPnrs, ...newerLocalPnrs]

  if (pnrsToSync.length > 0) {
    await requestJson<CanceledPnr[]>('/api/canceled-pnrs', {
      method: 'POST',
      body: JSON.stringify(pnrsToSync),
    })
  }

  return [...remotePnrs, ...localOnlyPnrs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const canceledPnrRepository = {
  list: async (): Promise<CanceledPnr[]> => {
    try {
      const remotePnrs = await requestJson<CanceledPnr[]>('/api/canceled-pnrs')
      return await mergeAndSyncLocalPnrs(remotePnrs)
    } catch (error) {
      if (isLocalModeError(error)) {
        const { localCanceledPnrRepository } = await loadLocalRepository()
        return localCanceledPnrRepository.list()
      }
      throw error
    }
  },
  get: (id: string) =>
    runWithLocalFallback(
      async () => {
        const pnr = await requestJson<CanceledPnr | null>(`/api/canceled-pnrs?id=${encodeURIComponent(id)}`)
        return pnr ?? undefined
      },
      async () => {
        const { localCanceledPnrRepository } = await loadLocalRepository()
        return localCanceledPnrRepository.get(id)
      },
    ),
  save: (pnr: CanceledPnr) =>
    runWithLocalFallback(
      async () => {
        await requestJson<CanceledPnr>('/api/canceled-pnrs', {
          method: 'PUT',
          body: JSON.stringify(pnr),
        })
      },
      async () => {
        const { localCanceledPnrRepository } = await loadLocalRepository()
        await localCanceledPnrRepository.save(pnr)
      },
    ),
  delete: (id: string) =>
    runWithLocalFallback(
      async () => {
        await requestJson(`/api/canceled-pnrs?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      },
      async () => {
        const { localCanceledPnrRepository } = await loadLocalRepository()
        return localCanceledPnrRepository.delete(id)
      },
    ),
  bulkPut: (pnrs: CanceledPnr[]) =>
    runWithLocalFallback(
      async () => {
        await requestJson<CanceledPnr[]>('/api/canceled-pnrs', {
          method: 'POST',
          body: JSON.stringify(pnrs),
        })
      },
      async () => {
        const { localCanceledPnrRepository } = await loadLocalRepository()
        await localCanceledPnrRepository.bulkPut(pnrs)
      },
    ),
}
