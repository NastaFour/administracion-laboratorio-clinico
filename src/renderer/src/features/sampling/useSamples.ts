import { useCallback, useEffect, useState } from 'react'
import type { Sample, SampleStatus } from '@/shared/contracts'

export function useSamples(ordenId: number | null) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (ordenId === null) {
      setSamples([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.samples.list({ ordenId })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setSamples(result.data)
    } finally {
      setLoading(false)
    }
  }, [ordenId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const register = useCallback(
    async (recoleccion_en?: string) => {
      if (ordenId === null) {
        return { ok: false, error: 'No hay orden seleccionada.' } as const
      }
      const result = await window.api.samples.register({ ordenId, recoleccion_en })
      if (!result.ok) {
        return { ok: false, error: mapError(result.error.code) } as const
      }
      setSamples(result.data)
      return { ok: true, samples: result.data } as const
    },
    [ordenId],
  )

  const updateStatus = useCallback(
    async (id: number, estatus: SampleStatus, recoleccion_en?: string) => {
      const result = await window.api.samples.updateStatus({ id, estatus, recoleccion_en })
      if (!result.ok) {
        return { ok: false, error: mapError(result.error.code) } as const
      }
      setSamples((prev) => prev.map((s) => (s.id === id ? result.data : s)))
      return { ok: true, sample: result.data } as const
    },
    [],
  )

  const reject = useCallback(async (id: number, motivo: string) => {
    const result = await window.api.samples.reject({ id, motivo })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setSamples((prev) => prev.map((s) => (s.id === id ? result.data : s)))
    return { ok: true, sample: result.data } as const
  }, [])

  const label = useCallback(async (id: number) => {
    const result = await window.api.samples.label({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    return { ok: true, html: result.data } as const
  }, [])

  return {
    samples,
    loading,
    error,
    refetch: fetch,
    register,
    updateStatus,
    reject,
    label,
  }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'La muestra no existe.',
    DUPLICATE: 'Ya existe un registro con esos datos.',
    CONFLICT: 'La muestra no permite esta acción en su estado actual.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
