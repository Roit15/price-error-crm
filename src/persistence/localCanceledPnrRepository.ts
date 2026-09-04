import type { CanceledPnr } from '../domain/canceledPnr'
import { db } from './database'

export const localCanceledPnrRepository = {
  list: async (): Promise<CanceledPnr[]> => {
    const pnrs = await db.canceledPnrs.toArray()
    return pnrs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  get: (id: string) => db.canceledPnrs.get(id),
  save: async (pnr: CanceledPnr) => {
    await db.canceledPnrs.put(pnr)
  },
  delete: async (id: string) => {
    await db.canceledPnrs.delete(id)
  },
  bulkPut: async (pnrs: CanceledPnr[]) => {
    await db.canceledPnrs.bulkPut(pnrs)
  },
}
