import { useCallback, useEffect, useState } from 'react'
import type { Cierre, CierreHistoryItem, CierreMetrics } from '@/shared/contracts'

function mapError(code: string): string {
  const messages: Record<string, string> = {
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

export function useCierre(fecha: string) {
  const [cierre, setCierre] = useState<Cierre | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await window.api.cierre.run({ fecha })
    setLoading(false)
    if (!result.ok) {
      setError(mapError(result.error.code))
      return null
    }
    setCierre(result.data)
    return result.data
  }, [fecha])

  const print = useCallback(
    async (fechaToPrint?: string) => {
      const targetFecha = fechaToPrint ?? fecha
      const result = await window.api.cierre.print({ fecha: targetFecha })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return null
      }
      return result.data
    },
    [fecha],
  )

  return { cierre, loading, error, run, print }
}

export function useCierreMetrics(fechaReferencia?: string) {
  const [metrics, setMetrics] = useState<CierreMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.cierre.metrics({ fechaReferencia })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setMetrics(result.data)
    } finally {
      setLoading(false)
    }
  }, [fechaReferencia])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { metrics, loading, error, refetch: fetch }
}

export function useCierreHistory(filters: { desde?: string; hasta?: string } = {}) {
  const [history, setHistory] = useState<CierreHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { desde, hasta } = filters

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.cierre.list({ desde, hasta })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setHistory(result.data)
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { history, loading, error, refetch: fetch }
}
