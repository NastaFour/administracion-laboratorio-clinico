import { useCallback, useEffect, useState } from 'react'
import type { Patient, PatientInput } from '@/shared/contracts'

interface UsePatientsOptions {
  searchQuery?: string
}

export function usePatients(options: UsePatientsOptions = {}) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (options.searchQuery && options.searchQuery.trim().length > 0) {
        const result = await window.api.patients.search({ query: options.searchQuery.trim(), limit: 50 })
        if (!result.ok) {
          setError(mapError(result.error.code))
          return
        }
        setPatients(result.data)
      } else {
        const result = await window.api.patients.list({ activos: true })
        if (!result.ok) {
          setError(mapError(result.error.code))
          return
        }
        setPatients(result.data)
      }
    } finally {
      setLoading(false)
    }
  }, [options.searchQuery])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const create = useCallback(async (input: PatientInput) => {
    const result = await window.api.patients.create(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setPatients((prev) => [...prev, result.data])
    return { ok: true, patient: result.data } as const
  }, [])

  const update = useCallback(async (id: number, input: Partial<PatientInput>) => {
    const result = await window.api.patients.update({ id, ...input })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setPatients((prev) => prev.map((p) => (p.id === id ? result.data : p)))
    return { ok: true, patient: result.data } as const
  }, [])

  const deactivate = useCallback(async (id: number) => {
    const result = await window.api.patients.deactivate({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setPatients((prev) => prev.filter((p) => p.id !== id))
    return { ok: true } as const
  }, [])

  return { patients, loading, error, refetch: fetch, create, update, deactivate }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El paciente no existe.',
    DUPLICATE: 'Ya existe un paciente con esa cédula.',
    CONFLICT: 'La acción no puede completarse por un conflicto.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
