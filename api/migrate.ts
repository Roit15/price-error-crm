import { randomUUID } from 'node:crypto'

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

export default async function handler(req: any, res: any) {
  const pnrs = [
    {
      id: randomUUID(),
      name: "Sridevi Sivadas",
      phone: "8884028821",
      origin: "BLR",
      destination: "BKK",
      departureDate: "2026-10-26"
    },
    {
      id: randomUUID(),
      name: "Aashna Shrishmal",
      phone: "+91 83690 28107",
      origin: "Colombo",
      destination: "Bombay",
      departureDate: "2026-09-24"
    },
    {
      id: randomUUID(),
      name: "Shah Moksha Piyushbhai",
      phone: "+91 83690 28107",
      origin: "COlombo",
      destination: "Bombay",
      departureDate: "2026-09-24"
    },
    {
      id: randomUUID(),
      name: "Ummadevi Muttana",
      phone: "+91 90303 45321",
      origin: "MLE",
      destination: "BLR",
      departureDate: "2026-09-13"
    }
  ]

  const now = new Date().toISOString()
  
  const toRows = pnrs.map((pnr) => ({
    id: pnr.id,
    created_at: now,
    updated_at: now,
    data: { ...pnr, createdAt: now, updatedAt: now },
  }))

  const response = await supabaseFetch('?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify(toRows),
  })
  
  if (!response.ok) {
     const payload = await response.json()
     return res.status(response.status).json(payload)
  }
  
  res.status(200).json({ ok: true, count: toRows.length, pnrs })
}
