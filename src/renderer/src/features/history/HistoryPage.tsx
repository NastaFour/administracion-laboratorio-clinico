import { useState } from 'react'
import { History, Printer, FileDown, Search, X, Eye } from 'lucide-react'
import type { OrderStatus, Patient } from '@/shared/contracts'
import { ORDER_STATUS } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { cn } from '../../lib/cn'
import { paymentStateLabel } from '../../lib/historyCsv'
import { getPeriodRange, type PeriodRange } from '../../lib/dates'
import { useHistory } from './useHistory'

const STATUS_OPTIONS: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: ORDER_STATUS.PENDIENTE, label: 'Pendiente' },
  { value: ORDER_STATUS.PROCESANDO, label: 'Procesando' },
  { value: ORDER_STATUS.COMPLETADA, label: 'Completada' },
  { value: ORDER_STATUS.ENTREGADA, label: 'Entregada' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'Todos los pagos' },
  { value: 'Pendiente', label: 'Con saldo pendiente' },
  { value: 'Pagado', label: 'Pagadas' },
] as const

function formatFecha(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

export function HistoryPage() {
  // M4: period navigation — Historial defaults to the current month (archive
  // view). The PeriodSelector is the source of the base date range; the manual
  // Desde/Hasta inputs stay in sync and remain editable.
  const [period, setPeriod] = useState<PeriodRange>(() => getPeriodRange('mes'))
  const { rows, exams, loading, error, filters, setFilters, reprint, reexport, preview, exportCsv } = useHistory({
    desde: period.desde,
    hasta: period.hasta,
  })
  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handlePatientSearch = async (query: string) => {
    setPatientQuery(query)
    setSelectedPatient(null)
    if (query.trim().length === 0) {
      setPatientResults([])
      setFilters({ ...filters, pacienteId: undefined })
      return
    }
    setSearching(true)
    try {
      const result = await window.api.patients.search({ query: query.trim(), limit: 10 })
      if (result.ok) {
        setPatientResults(result.data)
      }
    } finally {
      setSearching(false)
    }
  }

  const pickPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientResults([])
    setPatientQuery(`${patient.apellido}, ${patient.nombre}`)
    setFilters({ ...filters, pacienteId: patient.id })
  }

  const clearPatient = () => {
    setSelectedPatient(null)
    setPatientQuery('')
    setPatientResults([])
    setFilters({ ...filters, pacienteId: undefined })
  }

  const handleReprint = async (ordenId: number) => {
    setActionError(null)
    const result = await reprint(ordenId)
    if (!result.ok) {
      setActionError(result.error ?? 'No se pudo reimprimir el reporte.')
    }
  }

  const handlePreview = async (ordenId: number) => {
    setActionError(null)
    const result = await preview(ordenId)
    if (!result.ok) {
      setActionError(result.error ?? 'No se pudo abrir la vista previa.')
    }
  }

  const handleReexport = async (ordenId: number) => {
    setActionError(null)
    const result = await reexport(ordenId)
    if (!result.ok) {
      setActionError(result.error ?? 'No se pudo reexportar el reporte.')
    }
  }

  // The base period (desde/hasta) is always active; only the extra filters
  // (patient/status/payment) count as "filters" for the clear button.
  const hasFilters =
    filters.pacienteId !== undefined ||
    filters.estatus !== undefined ||
    filters.pendientePago !== undefined

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900" data-testid="history-heading">
            Historial de órdenes
          </h2>
          <p className="text-sm text-ink-500">
            Todas las órdenes con filtros por fecha, paciente, estado y pago. Reimprima o reexporte cualquier reporte.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0} data-testid="history-export-csv">
          <FileDown size={16} className="mr-2" />
          Exportar CSV
        </Button>
      </div>

      <PeriodSelector
        value={period}
        onChange={(range) => {
          setPeriod(range)
          setFilters({ ...filters, desde: range.desde, hasta: range.hasta })
        }}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
        <Input
          label="Desde"
          type="date"
          value={filters.desde ?? ''}
          onChange={(event) => setFilters({ ...filters, desde: event.target.value || undefined })}
        />
        <Input
          label="Hasta"
          type="date"
          value={filters.hasta ?? ''}
          onChange={(event) => setFilters({ ...filters, hasta: event.target.value || undefined })}
        />
        <div className="min-w-56">
          <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-700" htmlFor="history-patient">
            Paciente
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="history-patient"
              className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card py-2 pl-8 pr-8 text-sm text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none"
              placeholder="Cédula, nombre o apellido…"
              value={patientQuery}
              onChange={(event) => void handlePatientSearch(event.target.value)}
              data-testid="history-patient-search"
            />
            {selectedPatient && (
              <button
                type="button"
                onClick={clearPatient}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-ink-300"
                aria-label="Quitar filtro de paciente"
              >
                <X size={14} />
              </button>
            )}
            {patientResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card shadow-lg">
                {patientResults.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-surface-hover"
                      onClick={() => pickPatient(patient)}
                    >
                      <span className="font-medium text-ink-900">
                        {patient.apellido}, {patient.nombre}
                      </span>
                      <span className="ml-2 text-xs text-ink-500">{patient.cedula}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searching && <p className="mt-1 text-xs text-ink-400">Buscando…</p>}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="history-status">
            Estado
          </label>
          <select
            id="history-status"
            className="rounded-md border border-paper-300 bg-white px-3 py-2 text-sm text-ink-900"
            value={filters.estatus ?? ''}
            onChange={(event) =>
              setFilters({
                ...filters,
                estatus: (event.target.value || undefined) as OrderStatus | undefined,
              })
            }
            data-testid="history-status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="history-payment">
            Pago
          </label>
          <select
            id="history-payment"
            className="rounded-md border border-paper-300 bg-white px-3 py-2 text-sm text-ink-900"
            value={filters.pendientePago === undefined ? '' : filters.pendientePago ? 'Pendiente' : 'Pagado'}
            onChange={(event) =>
              setFilters({
                ...filters,
                pendientePago:
                  event.target.value === '' ? undefined : event.target.value === 'Pendiente',
              })
            }
            data-testid="history-payment"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <Button
            variant="secondary"
            onClick={() => {
              // Clear the extra filters but keep the active period base range.
              setFilters({ desde: period.desde, hasta: period.hasta })
              setPatientQuery('')
              setSelectedPatient(null)
              setPatientResults([])
            }}
            data-testid="history-clear"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert" data-testid="history-action-error">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-500" data-testid="history-loading">
          Cargando historial…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No hay órdenes con estos filtros"
          description="Cambie o limpie los filtros para ver el historial completo."
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => setFilters({})}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
          <table className="w-full text-sm">
            <thead className="bg-paper-100 dark:bg-paper-100">
              <tr className="border-b border-paper-200 dark:border-surface-border text-left text-xs uppercase tracking-wide text-ink-600 dark:text-ink-700">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Cédula</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Exámenes</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ orden, balance, pacienteNombre, pacienteCedula }) => (
                <tr key={orden.id} className="border-b border-paper-100" data-testid={`history-row-${orden.id}`}>
                  <td className="px-4 py-2.5 tabular-nums">{formatFecha(orden.fecha)}</td>
                  <td className="px-4 py-2.5 font-medium text-ink-900">{pacienteNombre}</td>
                  <td className="px-4 py-2.5 text-ink-600">{pacienteCedula}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-paper-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                      {orden.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {orden.examenes.map((exam) => exams.get(exam.examen_id) ?? `#${exam.examen_id}`).join(', ')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{orden.total_bs.toLocaleString('es-VE')} Bs</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        balance.saldo_bs <= 0
                          ? 'bg-primary-50 text-primary-700'
                          : orden.credito
                            ? 'bg-paper-200 text-ink-700'
                            : 'bg-danger-50 text-danger-700',
                      )}
                    >
                      {paymentStateLabel(balance.saldo_bs, orden.credito)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handlePreview(orden.id)}
                        data-testid={`history-preview-${orden.id}`}
                      >
                        <Eye size={14} className="mr-1" />
                        Vista previa
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleReprint(orden.id)}
                        data-testid={`history-reprint-${orden.id}`}
                        title="Reimprimir resultados de la orden"
                      >
                        <Printer size={14} className="mr-1" />
                        Reimprimir
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleReexport(orden.id)}
                        data-testid={`history-reexport-${orden.id}`}
                        title="Descargar reporte médico en PDF"
                      >
                        <FileDown size={14} className="mr-1" />
                        Descargar PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}