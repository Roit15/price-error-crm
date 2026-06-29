import { useCallback, useEffect, useState } from 'react'
import type { Invoice } from '../domain/invoice'
import { CentralDbError, invoiceRepository } from '../persistence/invoiceRepository'

const describeError = (error: unknown) => {
  if (error instanceof CentralDbError) {
    if (error.kind === 'unauthorized') {
      return "Can't reach the central database — the app is missing its access token. Your saved invoices are safe in the database; set CRM_API_TOKEN and VITE_CRM_API_TOKEN in the deployment and redeploy."
    }
    return `Central database is temporarily unavailable (status ${error.status}). Your saved invoices are safe — please retry.`
  }
  return 'Could not load invoices. Please retry.'
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setInvoices(await invoiceRepository.list())
    } catch (caught) {
      // Keep any previously loaded invoices on screen rather than wiping to an empty list.
      setError(describeError(caught))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadInitialInvoices = async () => {
      try {
        const nextInvoices = await invoiceRepository.list()
        if (isActive) setInvoices(nextInvoices)
      } catch (caught) {
        if (isActive) setError(describeError(caught))
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadInitialInvoices()

    return () => {
      isActive = false
    }
  }, [])

  return { invoices, isLoading, error, reload: load }
}
