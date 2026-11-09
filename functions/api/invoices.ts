export interface Env {
  SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  SUPABASE_INVOICES_TABLE?: string
  CRM_API_TOKEN?: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })

const getSupabaseConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  const table = env.SUPABASE_INVOICES_TABLE || 'invoices'

  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key, table }
}

const supabaseFetch = async (env: Env, path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig(env)
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

const toRows = (invoices: Invoice[]) =>
  invoices.map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    status: invoice.status,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
    data: invoice,
  }))

const isValidInvoice = (value: unknown): value is Invoice => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && candidate.id.length > 0 && typeof candidate.invoiceNumber === 'string'
}

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

const getRequestToken = (request: Request): string => {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim()
  return request.headers.get('x-api-key')?.trim() ?? ''
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    })
  }

  const expectedToken = env.CRM_API_TOKEN
  if (getSupabaseConfig(env) && !expectedToken) {
    return jsonResponse({ error: 'Central database access requires CRM_API_TOKEN to be configured.' }, 503)
  }
  if (expectedToken) {
    const token = getRequestToken(request)
    if (!token || !safeEqual(token, expectedToken)) {
      return jsonResponse({ error: 'Unauthorized.' }, 401)
    }
  }

  if (request.method === 'GET') {
    const id = url.searchParams.get('id')
    const query = id
      ? `?select=data&id=eq.${encodeURIComponent(id)}&limit=1`
      : '?select=data&order=created_at.desc'
    const response = await supabaseFetch(env, query)
    const payload = await response.json()

    if (!response.ok) {
      return jsonResponse(payload, response.status)
    }

    const invoices = (payload as Array<{ data: Invoice }>).map((row) => row.data)
    return jsonResponse(id ? invoices[0] ?? null : invoices, 200)
  }

  if (request.method === 'PUT') {
    let invoice: unknown
    try {
      invoice = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON.' }, 400)
    }
    if (!isValidInvoice(invoice)) {
      return jsonResponse({ error: 'A valid invoice payload is required.' }, 400)
    }
    const response = await supabaseFetch(env, '?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows([invoice])),
    })
    const payload = await response.json()
    return jsonResponse(response.ok ? invoice : payload, response.ok ? 200 : response.status)
  }

  if (request.method === 'POST') {
    let invoices: unknown
    try {
      invoices = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON.' }, 400)
    }
    if (!Array.isArray(invoices) || !invoices.every(isValidInvoice)) {
      return jsonResponse({ error: 'An array of valid invoices is required.' }, 400)
    }
    const response = await supabaseFetch(env, '?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows(invoices)),
    })
    const payload = await response.json()
    return jsonResponse(response.ok ? invoices : payload, response.ok ? 200 : response.status)
  }

  if (request.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      return jsonResponse({ error: 'Invoice id is required.' }, 400)
    }

    const response = await supabaseFetch(env, `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
    const payload = response.status === 204 ? null : await response.json()
    return jsonResponse(payload ?? { ok: true }, response.ok ? 200 : response.status)
  }

  return jsonResponse({ error: 'Method not allowed.' }, 405)
}
