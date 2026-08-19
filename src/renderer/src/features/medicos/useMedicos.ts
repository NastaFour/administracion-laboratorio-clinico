import { useCallback, useEffect, useState } from 'react'
import type { Medico, MedicoInput } from '@/shared/contracts'

export function useMedicos() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.medicos.list({ activos: true })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setMedicos(result.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const save = useCallback(async (input: MedicoInput & { id?: number }) => {
    const result = await window.api.medicos.save(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setMedicos((prev) => {
      const exists = prev.some((m) => m.id === result.data.id)
      if (exists) {
        return prev.map((m) => (m.id === result.data.id ? result.data : m))
      }
      return [...prev, result.data]
    })
    return { ok: true, medico: result.data } as const
  }, [])

  const deactivate = useCallback(async (id: number) => {
    const result = await window.api.medicos.deactivate({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setMedicos((prev) => prev.filter((m) => m.id !== id))
    return { ok: true } as const
  }, [])

  return { medicos, loading, error, refetch: fetch, save, deactivate }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El médico no existe.',
    DUPLICATE: 'Ya existe un médico con esa cédula.',
    CONFLICT: 'La acción no puede completarse por un conflicto.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
