/// <reference types="node" />

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

type VercelRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
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
  const table = process.env.SUPABASE_INVOICES_TABLE || 'invoices'

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

const toRows = (invoices: Invoice[]) =>
  invoices.map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    status: invoice.status,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
    data: invoice,
  }))

const getStringQuery = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

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

    const invoices = (payload as Array<{ data: Invoice }>).map((row) => row.data)
    res.status(200).json(id ? invoices[0] ?? null : invoices)
    return
  }

  if (req.method === 'PUT') {
    const invoice = req.body as Invoice
    const response = await supabaseFetch('?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows([invoice])),
    })
    const payload = await response.json()
    res.status(response.ok ? 200 : response.status).json(response.ok ? invoice : payload)
    return
  }

  if (req.method === 'POST') {
    const invoices = req.body as Invoice[]
    const response = await supabaseFetch('?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(toRows(invoices)),
    })
    const payload = await response.json()
    res.status(response.ok ? 200 : response.status).json(response.ok ? invoices : payload)
    return
  }

  if (req.method === 'DELETE') {
    const id = getStringQuery(req.query.id)
    if (!id) {
      res.status(400).json({ error: 'Invoice id is required.' })
      return
    }

    const response = await supabaseFetch(`?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
    const payload = response.status === 204 ? null : await response.json()
    res.status(response.ok ? 200 : response.status).json(payload ?? { ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed.' })
}
