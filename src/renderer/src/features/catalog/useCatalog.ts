import { useCallback, useEffect, useState } from 'react'
import type { Exam, ExamInput, Parameter, ParameterInput, ReferenceRange, ReferenceRangeInput } from '@/shared/contracts'

interface UseCatalogOptions {
  includeInactive?: boolean
}

export function useCatalog(options: UseCatalogOptions = {}) {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.catalog.listExams({ activos: !options.includeInactive })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setExams(result.data)
    } finally {
      setLoading(false)
    }
  }, [options.includeInactive])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const saveExam = useCallback(async (input: ExamInput & { id?: number }) => {
    const result = await window.api.catalog.saveExam(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setExams((prev) => {
      const exists = prev.some((e) => e.id === result.data.id)
      if (exists) {
        return prev.map((e) => (e.id === result.data.id ? result.data : e))
      }
      return [...prev, result.data]
    })
    return { ok: true, exam: result.data } as const
  }, [])

  const deactivateExam = useCallback(async (id: number) => {
    const result = await window.api.catalog.deactivateExam({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setExams((prev) => prev.filter((e) => e.id !== id))
    return { ok: true } as const
  }, [])

  return { exams, loading, error, refetch: fetch, saveExam, deactivateExam }
}

export function useParameters(examenId: number | null) {
  const [params, setParams] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (examenId === null) {
      setParams([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.catalog.listParams({ examenId })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setParams(result.data)
    } finally {
      setLoading(false)
    }
  }, [examenId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const saveParam = useCallback(async (input: ParameterInput & { id?: number }) => {
    const result = await window.api.catalog.saveParam(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setParams((prev) => {
      const exists = prev.some((p) => p.id === result.data.id)
      if (exists) {
        return prev.map((p) => (p.id === result.data.id ? result.data : p))
      }
      return [...prev, result.data]
    })
    return { ok: true, param: result.data } as const
  }, [])

  const deactivateParam = useCallback(async (id: number) => {
    const result = await window.api.catalog.deactivateParam({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setParams((prev) => prev.filter((p) => p.id !== id))
    return { ok: true } as const
  }, [])

  return { params, loading, error, refetch: fetch, saveParam, deactivateParam }
}

export function useRanges(parametroId: number | null) {
  const [ranges, setRanges] = useState<ReferenceRange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (parametroId === null) {
      setRanges([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.catalog.listRanges({ parametroId })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setRanges(result.data)
    } finally {
      setLoading(false)
    }
  }, [parametroId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const saveRange = useCallback(async (input: ReferenceRangeInput & { id?: number }) => {
    const result = await window.api.catalog.saveRange(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setRanges((prev) => {
      const exists = prev.some((r) => r.id === result.data.id)
      if (exists) {
        return prev.map((r) => (r.id === result.data.id ? result.data : r))
      }
      return [...prev, result.data]
    })
    return { ok: true, range: result.data } as const
  }, [])

  const deactivateRange = useCallback(async (id: number) => {
    const result = await window.api.catalog.deactivateRange({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setRanges((prev) => prev.filter((r) => r.id !== id))
    return { ok: true } as const
  }, [])

  return { ranges, loading, error, refetch: fetch, saveRange, deactivateRange }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El examen o parámetro no existe.',
    DUPLICATE: 'Ya existe un examen con ese código.',
    CONFLICT: 'La acción no puede completarse por un conflicto.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
