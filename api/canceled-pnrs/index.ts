/// <reference types="node" />

import { timingSafeEqual } from 'node:crypto'

type CanceledPnr = {
  id: string
  name: string
  phone: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

type VercelRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const table = process.env.SUPABASE_CANCELED_PNRS_TABLE || 'canceled_pnrs'

  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key, table }
}

const supabaseFetch = async (path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig()
  if (!config) {
    return new Response(JSON.stringify({ error: 'Central database is not configured.' }), { status: 503 })
  }

  return fetch(`${config.url}/rest/v1/${config.table}${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...(init.headers ?? {}),
    },
  })
}

const toRows = (canceledPnrs: CanceledPnr[]) =>
  canceledPnrs.map((pnr) => ({
    id: pnr.id,
    created_at: pnr.createdAt,
    updated_at: pnr.updatedAt,
    data: pnr,
  }))

const getStringQuery = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const isValidCanceledPnr = (value: unknown): value is CanceledPnr => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && candidate.id.length > 0 && typeof candidate.name === 'string'
}

const safeEqual = (a: string, b: string) => {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

const getRequestToken = (req: VercelRequest) => {
  const authHeader = getStringQuery(req.headers?.authorization)
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim()
  return getStringQuery(req.headers?.['x-api-key'])?.trim() ?? ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  // The Supabase service-role key bypasses row level security, so the API must not be public.
  // When the central database is configured a shared access token is mandatory, and every
  // request must present it via `Authorization: Bearer <token>` or the `x-api-key` header.
  const expectedToken = process.env.CRM_API_TOKEN
  if (getSupabaseConfig() && !expectedToken) {
    res.status(503).json({ error: 'Central database access requires CRM_API_TOKEN to be configured.' })
    return
  }
  if (expectedToken) {
    const token = getRequestToken(req)
    if (!token || !safeEqual(token, expectedToken)) {
      res.status(401).json({ error: 'Unauthorized.' })
      return
    }
  }

  if (req.method === 'GET') {
    const id = getStringQuery(req.query.id)
    const query = id
      ? `?select=data&id=eq.${encodeURIComponent(id)}&limit=1`
      : '?select=data&order=created_at.desc'
    const response = await supabaseFetch(query)
    const payload = await response.json()

    if (!response.ok) {
      res.status(response.status).json(payload)
      return
    }

    const pnrs = (payload as Array<{ data: CanceledPnr }>).map((row) => row.data)
    res.status(200).json(id ? pnrs[0] ?? null : pnrs)
    return
  }

  if (req.method === 'PUT') {
    const pnr = req.body
    if (!isValidCanceledPnr(pnr)) {
      res.status(400).json({ error: 'A valid canceled PNR payload is required.' })
      return
    }
    const response = await supabaseFetch('?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows([pnr])),
    })
    const payload = await response.json()
    res.status(response.ok ? 200 : response.status).json(response.ok ? pnr : payload)
    return
  }

  if (req.method === 'POST') {
    const pnrs = req.body
    if (!Array.isArray(pnrs) || !pnrs.every(isValidCanceledPnr)) {
      res.status(400).json({ error: 'An array of valid canceled PNRs is required.' })
      return
    }
    const response = await supabaseFetch('?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows(pnrs)),
    })
    const payload = await response.json()
    res.status(response.ok ? 200 : response.status).json(response.ok ? pnrs : payload)
    return
  }

  if (req.method === 'DELETE') {
    const id = getStringQuery(req.query.id)
    if (!id) {
      res.status(400).json({ error: 'Canceled PNR id is required.' })
      return
    }

    const response = await supabaseFetch(`?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
    const payload = response.status === 204 ? null : await response.json()
    res.status(response.ok ? 200 : response.status).json(payload ?? { ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed.' })
}
