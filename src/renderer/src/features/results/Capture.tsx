import { useEffect, useMemo, useState } from 'react'
import { Search, Eye, Printer, FileDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { cn } from '../../lib/cn'
import { getPeriodRange, type PeriodRange } from '../../lib/dates'
import { useSessionStore } from '../../stores/useSessionStore'
import { useOrders } from '../orders/useOrders'
import { useParamsForCapture, useResultActions } from './useResults'
import {
  FLAG,
  ORDER_STATUS,
  RESULT_STATUS,
  RESULT_TYPE,
  ROLES,
  type CaptureValue,
  type Flag,
  type OrderWithExams,
  type ParamForCapture,
  type ReferenceRange,
  type Role,
  type Patient,
} from '@/shared/contracts'

const CAN_VALIDATE: Role[] = [ROLES.BIOANALISTA, ROLES.ADMIN]

/**
 * WU9a/WU9b result capture and validation screen. Each parameter row shows the
 * reference band selected from the patient's sex + exact age (M7.1), captures
 * a value (M7.6 auto-flagging computed in main), and exposes the validation
 * workflow actions guarded by role in main (D8 / M7.3 / M7.4 / M7.5).
 */
export function CapturePage() {
  // M4: period navigation — default to today (Día), switchable via PeriodSelector.
  const [period, setPeriod] = useState<PeriodRange>(() => getPeriodRange('dia'))
  const { orders, loading: ordersLoading } = useOrders({ desde: period.desde, hasta: period.hasta })
  const [orderSearch, setOrderSearch] = useState('')
  const [patientsMap, setPatientsMap] = useState<Map<number, Patient>>(new Map())
  const [selectedOrder, setSelectedOrder] = useState<OrderWithExams | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const { params, loading, error: loadError, refetch } = useParamsForCapture(selectedExamId)

  // Map examen_id → name so exam tabs read naturally (catalog is read-only here).
  const [examNames, setExamNames] = useState<Map<number, string>>(new Map())
  useEffect(() => {
    void window.api.catalog.listExams({ activos: true }).then((result) => {
      if (!result.ok) return
      setExamNames(new Map(result.data.map((exam) => [exam.id, exam.nombre])))
    })

    if (window.api?.patients?.list) {
      void window.api.patients.list({ activos: false }).then((res) => {
        if (res.ok && res.data) {
          const map = new Map<number, Patient>()
          for (const p of res.data) map.set(p.id, p)
          setPatientsMap(map)
        }
      })
    }
  }, [])

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) => {
      const patient = patientsMap.get(order.paciente_id)
      const pName = patient ? `${patient.nombre} ${patient.apellido} ${patient.cedula}`.toLowerCase() : ''
      return (
        order.id.toString().includes(q) ||
        order.estatus.toLowerCase().includes(q) ||
        pName.includes(q)
      )
    })
  }, [orders, orderSearch, patientsMap])

  const examOptions = useMemo(() => selectedOrder?.examenes ?? [], [selectedOrder])

  const selectOrder = (order: OrderWithExams) => {
    setSelectedOrder(order)
    const first = order.examenes.find((exam) => exam.id !== undefined)
    setSelectedExamId(first?.id ?? null)
    setReportError(null)
  }

  // Report actions (preview / print / download) for the selected order — same
  // triad available in Historial (M10.3), available once the order is
  // Completada/Entregada.
  const [reportError, setReportError] = useState<string | null>(null)
  const canReport = selectedOrder
    ? selectedOrder.estatus === ORDER_STATUS.COMPLETADA || selectedOrder.estatus === ORDER_STATUS.ENTREGADA
    : false

  const handleReportAction = async (action: 'preview' | 'print' | 'savePdf') => {
    if (!selectedOrder) return
    setReportError(null)
    const result = await window.api.reports[action]({ ordenId: selectedOrder.id, copia: false })
    if (!result.ok) {
      setReportError(result.error?.message ?? 'No se pudo completar la acción.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="results-heading">
          Resultados
        </h2>
        <p className="text-sm text-ink-500">Capture y valide los resultados por examen.</p>
      </div>

      <PeriodSelector value={period} onChange={(range) => setPeriod(range)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-950 mb-2 flex items-center gap-2">
              <Search size={16} />
              Órdenes
            </h3>
            <div className="mb-3">
              <Input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar por orden, paciente o cédula…"
                inputClassName="text-xs"
              />
            </div>
            {ordersLoading && <p className="text-ink-500 dark:text-ink-600 text-sm">Cargando órdenes…</p>}
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {filteredOrders.map((order) => {
                const patient = patientsMap.get(order.paciente_id)
                return (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className={cn(
                      'w-full text-left rounded-md border px-3 py-2 transition-all active:scale-[0.99]',
                      selectedOrder?.id === order.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-100/30 text-primary-900 dark:text-primary-300 shadow-2xs'
                        : 'border-paper-200 dark:border-surface-border hover:bg-paper-50 dark:hover:bg-surface-hover',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink-900 dark:text-ink-950">
                        {patient ? `${patient.nombre} ${patient.apellido}` : `Orden #${order.id}`}
                      </p>
                      <span className="text-xs text-ink-500 dark:text-ink-600 capitalize">{order.estatus}</span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-600">
                      Orden #{order.id} · {patient?.cedula ? `${patient.cedula} · ` : ''}{order.examenes.length} exámenes
                    </p>
                  </button>
                )
              })}
              {!ordersLoading && filteredOrders.length === 0 && (
                <p className="text-sm text-ink-500 dark:text-ink-600">
                  {orders.length === 0 ? 'No hay órdenes registradas.' : 'No hay órdenes que coincidan.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-ink-900">Orden #{selectedOrder.id}</h3>
                  <p className="text-sm text-ink-500">{examOptions.length} exámenes solicitados</p>
                </div>
                {canReport && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleReportAction('preview')}
                      data-testid="results-preview"
                    >
                      <Eye size={14} className="mr-1" />
                      Vista previa
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleReportAction('print')}
                      data-testid="results-print"
                    >
                      <Printer size={14} className="mr-1" />
                      Imprimir
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleReportAction('savePdf')}
                      data-testid="results-save-pdf"
                    >
                      <FileDown size={14} className="mr-1" />
                      Descargar PDF
                    </Button>
                  </div>
                )}
              </div>

              {reportError && (
                <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert" data-testid="results-report-error">
                  {reportError}
                </div>
              )}

              {examOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {examOptions.map((exam, index) => {
                    const active = exam.id === selectedExamId
                    return (
                      <button
                        key={exam.id}
                        onClick={() => setSelectedExamId(exam.id ?? null)}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-primary-500 bg-primary-600 text-white'
                            : 'border-paper-300 text-ink-700 hover:bg-paper-50',
                        )}
                      >
                        {examNames.get(exam.examen_id) ?? `Examen ${index + 1}`}
                      </button>
                    )
                  })}
                </div>
              )}

              {loadError && (
                <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
                  {loadError}
                </div>
              )}

              {loading && <p className="text-ink-500">Cargando parámetros…</p>}

              {!loading && !loadError && selectedExamId !== null && (
                <div className="space-y-4">
                  {params.length === 0 && (
                    <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
                      <p className="text-ink-500">Este examen no tiene parámetros definidos.</p>
                    </div>
                  )}
                  {params.map((param) => (
                    <ResultRow
                      key={param.parametro_id}
                      param={param}
                      ordenExamenId={selectedExamId}
                      onSaved={() => void refetch()}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
              <p className="text-ink-500">Seleccione una orden para capturar resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_QUALITATIVE_SUGGESTIONS = [
  'NO REACTIVO',
  'REACTIVO',
  'POSITIVO',
  'NEGATIVO',
  'ESCASAS',
  'MODERADAS',
  'ABUNDANTES',
  'NORMAL',
]

const QUICK_COMMENT_SUGGESTIONS = [
  'Muestra hemolizada',
  'Muestra ictérica',
  'Muestra escasa',
  'Repetido para verificar',
]

interface ResultRowProps {
  param: ParamForCapture
  ordenExamenId: number
  onSaved: () => void
}

function ResultRow({ param, ordenExamenId, onSaved }: ResultRowProps) {
  const session = useSessionStore((s) => s.session)
  const { capture, validate, reject, reopen } = useResultActions()

  const status = param.resultado?.estatus_validacion ?? RESULT_STATUS.PENDIENTE
  const existing = param.resultado
  const [value, setValue] = useState(
    existing?.valor_numerico?.toString() ?? existing?.valor_cualitativo ?? '',
  )
  const [comentario, setComentario] = useState(existing?.comentario ?? '')
  const [reason, setReason] = useState('')
  const [pendingAction, setPendingAction] = useState<'reject' | 'reopen' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qualitativeOptions = useMemo(() => {
    const custom = param.opciones_cualitativas ?? []
    const combined = Array.from(new Set([...custom, ...DEFAULT_QUALITATIVE_SUGGESTIONS]))
    return combined
  }, [param.opciones_cualitativas])

  const canValidate = session !== null && CAN_VALIDATE.includes(session.rol)
  const isAdmin = session?.rol === ROLES.ADMIN

  const handleCapture = async () => {
    if (value.trim() === '') {
      setError('Ingrese un valor para capturar.')
      return
    }
    setBusy(true)
    setError(null)
    const valor: CaptureValue =
      param.tipo_resultado === RESULT_TYPE.NUMERICO
        ? { tipo: RESULT_TYPE.NUMERICO, valor: Number(value) }
        : { tipo: RESULT_TYPE.CUALITATIVO, valor: value }
    const res = await capture({
      orden_examen_id: ordenExamenId,
      parametro_id: param.parametro_id,
      valor,
      comentario: comentario.trim() === '' ? null : comentario,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPendingAction(null)
    setReason('')
    onSaved()
  }

  const handleValidate = async () => {
    if (!existing) return
    setBusy(true)
    setError(null)
    const res = await validate(existing.id)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved()
  }

  const confirmAction = async () => {
    if (!existing || !pendingAction || reason.trim() === '') {
      setError('Indique el motivo.')
      return
    }
    setBusy(true)
    setError(null)
    const res =
      pendingAction === 'reject'
        ? await reject(existing.id, reason.trim())
        : await reopen(existing.id, reason.trim())
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPendingAction(null)
    setReason('')
    onSaved()
  }

  return (
    <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 space-y-3 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink-900 dark:text-ink-950">{param.nombre}</p>
            {param.unidad && <span className="text-sm text-ink-500 dark:text-ink-600">{param.unidad}</span>}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-700 mt-1">{bandLabel(param.banda)}</p>
        </div>
        <StatusPill status={status} flag={existing?.flag ?? null} />
      </div>

      {existing?.motivo_rechazo && (
        <p className="text-sm text-danger-700 bg-danger-50 rounded-md px-3 py-2">
          Rechazado: {existing.motivo_rechazo}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">
            Valor {param.tipo_resultado === RESULT_TYPE.NUMERICO ? 'numérico' : 'cualitativo'}
          </label>
          {param.tipo_resultado === RESULT_TYPE.NUMERICO ? (
            <Input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={status === RESULT_STATUS.VALIDADO}
              data-testid={`value-${param.parametro_id}`}
            />
          ) : (
            <div>
              <Input
                list={`qualitative-list-${param.parametro_id}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={status === RESULT_STATUS.VALIDADO}
                placeholder="Escriba o elija sugerencia…"
                data-testid={`value-${param.parametro_id}`}
              />
              <datalist id={`qualitative-list-${param.parametro_id}`}>
                {qualitativeOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {qualitativeOptions.slice(0, 4).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={status === RESULT_STATUS.VALIDADO}
                    onClick={() => setValue(opt)}
                    className="text-2xs px-1.5 py-0.5 rounded border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-hover hover:bg-primary-50 hover:text-primary-700 dark:hover:text-primary-300 text-ink-600 dark:text-ink-700 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Comentario</label>
          <Input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={status === RESULT_STATUS.VALIDADO}
            placeholder="Comentario del examen"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {QUICK_COMMENT_SUGGESTIONS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={status === RESULT_STATUS.VALIDADO}
                onClick={() => setComentario(c)}
                className="text-2xs px-1.5 py-0.5 rounded border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-hover hover:bg-paper-100 text-ink-600 dark:text-ink-700 transition-colors"
                title="Insertar comentario rápido"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-end gap-2 pt-6">
          <Button
            size="sm"
            onClick={() => void handleCapture()}
            disabled={busy || status === RESULT_STATUS.VALIDADO}
          >
            Guardar
          </Button>
          {status === RESULT_STATUS.CAPTURADO && canValidate && (
            <>
              <Button size="sm" variant="secondary" onClick={() => void handleValidate()} disabled={busy}>
                Validar
              </Button>
              <Button size="sm" variant="danger" onClick={() => setPendingAction('reject')} disabled={busy}>
                Rechazar
              </Button>
            </>
          )}
          {status === RESULT_STATUS.VALIDADO && isAdmin && (
            <Button size="sm" variant="secondary" onClick={() => setPendingAction('reopen')} disabled={busy}>
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {pendingAction && (
        <div className="flex items-end gap-2 rounded-md bg-paper-50 p-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-700 mb-1">Motivo</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={pendingAction === 'reject' ? 'Ej: muestra hemolizada' : 'Ej: corrección de valor'}
            />
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" variant="danger" onClick={() => void confirmAction()} disabled={busy}>
            Confirmar
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function StatusPill({ status, flag }: { status: string; flag: Flag | null }) {
  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
          status === RESULT_STATUS.VALIDADO && 'bg-success-50 text-success-700',
          status === RESULT_STATUS.CAPTURADO && 'bg-primary-50 text-primary-700',
          status === RESULT_STATUS.PENDIENTE && 'bg-paper-100 text-ink-600',
        )}
      >
        {status}
      </span>
      {flag && <FlagBadge flag={flag} />}
    </span>
  )
}

function FlagBadge({ flag }: { flag: Flag }) {
  const label: Record<Flag, string> = {
    [FLAG.BAJO]: 'Bajo',
    [FLAG.ALTO]: 'Alto',
    [FLAG.CRITICO]: 'Crítico',
  }
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-bold',
        flag === FLAG.CRITICO && 'bg-danger-500 text-white',
        flag === FLAG.ALTO && 'bg-warning-500 text-white',
        flag === FLAG.BAJO && 'bg-warning-500 text-white',
      )}
    >
      {label[flag]}
    </span>
  )
}

function bandLabel(band: ReferenceRange | null): string {
  if (!band) {
    return 'Sin banda de referencia definida'
  }
  const sexo = band.sexo === 'Ambos' ? 'Ambos' : band.sexo === 'M' ? 'Masculino' : 'Femenino'
  const min = band.valor_min !== null ? String(band.valor_min) : '—'
  const max = band.valor_max !== null ? String(band.valor_max) : '—'
  return `${sexo} · ${band.edad_min}–${band.edad_max} ${band.edad_unidad} · ref ${min}–${max}`
}
