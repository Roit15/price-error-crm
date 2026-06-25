create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null unique,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_status_idx on public.invoices (status);

alter table public.invoices enable row level security;

-- The Vercel API uses SUPABASE_SERVICE_ROLE_KEY server-side, so it bypasses RLS.
-- Do not expose the service role key in frontend VITE_* environment variables.
