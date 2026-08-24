import { useCallback, useEffect, useState } from 'react'
import type { AuditEntry, AuditFilters } from '@/shared/contracts'

const PAGE_SIZE = 20

export interface AuditState {
  entries: AuditEntry[]
  users: Map<number, string>
  loading: boolean
  error: string | null
  filters: AuditFilters
  setFilters: (filters: AuditFilters) => void
  refetch: () => Promise<void>
  page: number
  pageSize: number
  totalPages: number
  pageEntries: AuditEntry[]
  setPage: (page: number) => void
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los filtros.',
    PERMISSION_DENIED: 'No tiene permiso para ver la auditoría.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

/**
 * Admin audit viewer (M12.3): fetch the append-only trail through the
 * admin-only `audit:list` channel with filters by actor/action/entity/date
 * range, resolve actor usernames from the user list, and page the result
 * client-side.
 */
export function useAudit(): AuditState {
  const [filters, setFilters] = useState<AuditFilters>({})
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [users, setUsers] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [entriesResult, usersResult] = await Promise.all([
        window.api.audit.list(filters),
        window.api.users.list(),
      ])
      if (!entriesResult.ok) {
        setError(mapError(entriesResult.error.code))
        setEntries([])
        return
      }
      const userMap = new Map<number, string>()
      if (usersResult.ok) {
        for (const user of usersResult.data) {
          userMap.set(user.id, user.usuario)
        }
      }
      setEntries(entriesResult.data)
      setUsers(userMap)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pageEntries = entries.slice(start, start + PAGE_SIZE)

  return {
    entries,
    users,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetch,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    pageEntries,
    setPage,
  }
}
