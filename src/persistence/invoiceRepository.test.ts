import { afterEach, describe, expect, it, vi } from 'vitest'
import { CentralDbError, invoiceRepository } from './invoiceRepository'

const stubFetch = (status: number, body: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('invoiceRepository.list error surfacing', () => {
  it('surfaces a 401 as an unauthorized CentralDbError instead of silently returning empty data', async () => {
    stubFetch(401, { error: 'Unauthorized.' })

    const error = await invoiceRepository.list().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CentralDbError)
    expect((error as CentralDbError).kind).toBe('unauthorized')
    expect((error as CentralDbError).status).toBe(401)
  })

  it('treats a 503 missing-token response as unauthorized', async () => {
    stubFetch(503, { error: 'Central database access requires CRM_API_TOKEN to be configured.' })

    const error = await invoiceRepository.list().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CentralDbError)
    expect((error as CentralDbError).kind).toBe('unauthorized')
  })

  it('surfaces an upstream 500 as an unavailable CentralDbError', async () => {
    stubFetch(500, { error: 'Internal error' })

    const error = await invoiceRepository.list().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CentralDbError)
    expect((error as CentralDbError).kind).toBe('unavailable')
    expect((error as CentralDbError).status).toBe(500)
  })
})
