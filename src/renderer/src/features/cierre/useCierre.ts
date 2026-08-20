import { useCallback, useState } from 'react'
import type { Cierre } from '@/shared/contracts'

function mapError(code: string): string {
  const messages: Record<string, string> = {
    PERMISSION_DENIED: 'No tiene permiso para ejecutar el cierre de caja.',
    DB_ERROR: 'Ocurrió un error al ejecutar el cierre de caja.',
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

  const print = useCallback(async () => {
    const result = await window.api.cierre.print({ fecha })
    if (!result.ok) {
      setError(mapError(result.error.code))
      return null
    }
    return result.data
  }, [fecha])

  return { cierre, loading, error, run, print }
}
