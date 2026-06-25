# Price Error CRM

Local-first flight quotation CRM for creating, tracking, printing, and backing up Price Error invoices.

## Commands

- `npm run dev` starts the Vite dev server.
- `npm run build` type-checks and builds the app.
- `npm run lint` runs ESLint.
- `npm test` runs Vitest.

## Storage

Invoices are stored through `/api/invoices` when central database environment variables are configured. If the API is unavailable, the app falls back to local IndexedDB so local development still works.

Brand and UPI settings are stored in browser state via Zustand persistence. Use Settings & backup to export or import JSON backups.

## Central Database

Create a Supabase project, run `docs/supabase-schema.sql` in the SQL editor, then set these Vercel environment variables:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_INVOICES_TABLE` optional, defaults to `invoices`

After setting env vars, redeploy the app. Existing local invoices can be moved to the central DB with Settings & backup: export JSON from the browser that has the invoices, then import JSON after the central DB is configured.
