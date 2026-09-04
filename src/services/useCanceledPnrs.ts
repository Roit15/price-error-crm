import { useEffect, useState, useCallback, useRef } from 'react'
import type { CanceledPnr } from '../domain/canceledPnr'
import { canceledPnrRepository } from '../persistence/canceledPnrRepository'
import { CentralDbError } from '../persistence/invoiceRepository'

export const useCanceledPnrs = () => {
  const [pnrs, setPnrs] = useState<CanceledPnr[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)

  const reload = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const data = await canceledPnrRepository.list()
      setPnrs(data)
      setError(null)
    } catch (err) {
      if (err instanceof CentralDbError) {
        setError(err.message)
      } else {
        setError('Failed to load canceled PNRs from database.')
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { pnrs, isLoading, error, reload }
}
