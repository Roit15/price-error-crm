import { useCallback, useEffect, useState } from 'react'
import type { Invoice } from '../domain/invoice'
import { invoiceRepository } from '../persistence/invoiceRepository'

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setInvoices(await invoiceRepository.list())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let isActive = true

    const loadInitialInvoices = async () => {
      const nextInvoices = await invoiceRepository.list()
      if (!isActive) return
      setInvoices(nextInvoices)
      setIsLoading(false)
    }

    void loadInitialInvoices()

    return () => {
      isActive = false
    }
  }, [])

  return { invoices, isLoading, reload }
}
