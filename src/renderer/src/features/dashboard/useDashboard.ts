import { useCallback, useEffect, useState } from 'react'
import type { DebtorBucket, PatientAnalyte, Stats, TodayKpi, Trend } from '@/shared/contracts'

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El registro solicitado no existe.',
    DUPLICATE: 'Ya existe un registro con esos datos.',
    CONFLICT: 'La operación no está permitida en este estado.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

export { mapError as mapDashboardError }

export function todayLocalIso(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentMonthRange(): { desde: string; hasta: string } {
  const date = new Date()
  const desde = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const hasta = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { desde, hasta }
}

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** dashboard:today — today's orders & collections (optional explicit date). */
export function useTodayKpis(fecha?: string) {
  const [state, setState] = useState<QueryState<TodayKpi>>({ data: null, loading: true, error: null })

  const fetch = useCallback(async () => {
    const result = await window.api.dashboard.today({ fecha })
    setState(
      result.ok
        ? { data: result.data, loading: false, error: null }
        : { data: null, loading: false, error: mapError(result.error.code) },
    )
  }, [fecha])

  useEffect(() => {
    let cancelled = false
    void window.api.dashboard.today({ fecha }).then((result) => {
      if (cancelled) return
      setState(
        result.ok
          ? { data: result.data, loading: false, error: null }
          : { data: null, loading: false, error: mapError(result.error.code) },
      )
    })
    return () => {
      cancelled = true
    }
  }, [fecha])

  return { ...state, refetch: fetch }
}

/** dashboard:debtors — aging buckets for every order with an open balance. */
export function useDebtors() {
  const [state, setState] = useState<QueryState<DebtorBucket[]>>({ data: null, loading: true, error: null })

  const fetch = useCallback(async () => {
    const result = await window.api.dashboard.debtors({})
    setState(
      result.ok
        ? { data: result.data, loading: false, error: null }
        : { data: null, loading: false, error: mapError(result.error.code) },
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    void window.api.dashboard.debtors({}).then((result) => {
      if (cancelled) return
      setState(
        result.ok
          ? { data: result.data, loading: false, error: null }
          : { data: null, loading: false, error: mapError(result.error.code) },
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...state, refetch: fetch }
}

/** dashboard:stats — top exams + monthly revenue vs previous month (range-bound). */
export function useStats(desde: string, hasta: string) {
  const [state, setState] = useState<QueryState<Stats>>({ data: null, loading: true, error: null })

  const fetch = useCallback(async () => {
    const result = await window.api.dashboard.stats({ desde, hasta })
    setState(
      result.ok
        ? { data: result.data, loading: false, error: null }
        : { data: null, loading: false, error: mapError(result.error.code) },
    )
  }, [desde, hasta])

  useEffect(() => {
    let cancelled = false
    void window.api.dashboard.stats({ desde, hasta }).then((result) => {
      if (cancelled) return
      setState(
        result.ok
          ? { data: result.data, loading: false, error: null }
          : { data: null, loading: false, error: mapError(result.error.code) },
      )
    })
    return () => {
      cancelled = true
    }
  }, [desde, hasta])

  return { ...state, refetch: fetch }
}

/** dashboard:patientAnalytes — picker source for the trends view. */
export function usePatientAnalytes(pacienteId: number | null) {
  const [state, setState] = useState<QueryState<PatientAnalyte[]>>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (pacienteId === null) {
      return
    }
    let cancelled = false
    void window.api.dashboard.patientAnalytes({ pacienteId }).then((result) => {
      if (cancelled) return
      setState(
        result.ok
          ? { data: result.data, loading: false, error: null }
          : { data: null, loading: false, error: mapError(result.error.code) },
      )
    })
    return () => {
      cancelled = true
    }
  }, [pacienteId])

  return state
}

/** dashboard:trends — the numeric series for one patient + analyte. */
export function useTrends(pacienteId: number | null, parametroId: number | null) {
  const [state, setState] = useState<QueryState<Trend>>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (pacienteId === null || parametroId === null) {
      return
    }
    let cancelled = false
    void window.api.dashboard.trends({ pacienteId, parametroId }).then((result) => {
      if (cancelled) return
      setState(
        result.ok
          ? { data: result.data, loading: false, error: null }
          : { data: null, loading: false, error: mapError(result.error.code) },
      )
    })
    return () => {
      cancelled = true
    }
  }, [pacienteId, parametroId])

  return state
}