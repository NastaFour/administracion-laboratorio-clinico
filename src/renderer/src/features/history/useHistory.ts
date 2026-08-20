import { useCallback, useEffect, useState } from 'react'
import type { OrderFilters, Patient } from '@/shared/contracts'
import { buildHistoryCsv, type HistoryRow } from '../../lib/historyCsv'

export type HistoryFilters = OrderFilters

export interface HistoryState {
  rows: HistoryRow[]
  exams: Map<number, string>
  loading: boolean
  error: string | null
  filters: HistoryFilters
  setFilters: (filters: HistoryFilters) => void
  refetch: () => Promise<void>
  reprint: (ordenId: number) => Promise<{ ok: boolean; error?: string }>
  reexport: (ordenId: number) => Promise<{ ok: boolean; error?: string }>
  exportCsv: () => void
}

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

function patientName(patient: Patient | undefined): string {
  return patient ? `${patient.apellido}, ${patient.nombre}` : 'Paciente desconocido'
}

/**
 * Global order history (M10.1/M10.2): filters by date range, patient, status
 * and payment state, with per-order re-print (WU10 pipeline) and re-export
 * (PDF via save dialog / filtered CSV).
 */
export function useHistory(): HistoryState {
  const [filters, setFilters] = useState<HistoryFilters>({})
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [exams, setExams] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersResult, patientsResult, examsResult] = await Promise.all([
        window.api.orders.list(filters),
        window.api.patients.list({ activos: false }),
        window.api.catalog.listExams({ activos: false }),
      ])
      if (!ordersResult.ok) {
        setError(mapError(ordersResult.error.code))
        return
      }
      if (!patientsResult.ok) {
        setError(mapError(patientsResult.error.code))
        return
      }
      if (!examsResult.ok) {
        setError(mapError(examsResult.error.code))
        return
      }

      const patientMap = new Map(patientsResult.data.map((patient) => [patient.id, patient]))
      const examMap = new Map(examsResult.data.map((exam) => [exam.id, exam.nombre]))
      const orders = ordersResult.data

      // Real payment state comes from the payments ledger — one balance query
      // per listed order (offline single-lab, small result set).
      const balances = await Promise.all(
        orders.map(async (orden) => {
          const balanceResult = await window.api.payments.balance({ ordenId: orden.id })
          return balanceResult.ok ? balanceResult.data : null
        }),
      )

      const historyRows: HistoryRow[] = orders
        .map((orden, index) => {
          const balance = balances[index]
          if (!balance) {
            return null
          }
          const patient = patientMap.get(orden.paciente_id)
          return {
            orden,
            balance,
            pacienteNombre: patientName(patient),
            pacienteCedula: patient?.cedula ?? '',
          }
        })
        .filter((row): row is HistoryRow => row !== null)

      setRows(historyRows)
      setExams(examMap)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const reprint = useCallback(async (ordenId: number) => {
    const result = await window.api.reports.print({ ordenId, copia: false })
    if (!result.ok) {
      return { ok: false as const, error: mapError(result.error.code) }
    }
    return { ok: true as const }
  }, [])

  const reexport = useCallback(async (ordenId: number) => {
    const result = await window.api.reports.savePdf({ ordenId, copia: false })
    if (!result.ok) {
      return { ok: false as const, error: mapError(result.error.code) }
    }
    return { ok: true as const }
  }, [])

  const exportCsv = useCallback(() => {
    if (rows.length === 0) {
      return
    }
    const csv = buildHistoryCsv(rows, exams)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `historial-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [rows, exams])

  return {
    rows,
    exams,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetch,
    reprint,
    reexport,
    exportCsv,
  }
}