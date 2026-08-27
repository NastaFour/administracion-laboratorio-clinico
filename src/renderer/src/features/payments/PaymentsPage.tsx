import { useState, useEffect, useMemo } from 'react'
import { PlusCircle, Search, DollarSign, Clock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useBcvRate, usePaymentsForOrder, useAllPayments } from './usePayments'
import { PaymentRecordForm } from './Record'
import { PaymentList } from './List'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/useToast'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { getPeriodRange, type PeriodRange, todayLocalDateIso } from '../../lib/dates'
import { METHOD_LABELS } from './methods'
import { cn } from '../../lib/cn'
import type { RecordPaymentRequest } from '@/shared/contracts'

type FilterTab = 'todos' | 'deudores' | 'pagados'

function formatMoney(amount: number, currency: 'Bs' | 'USD'): string {
  const formatted = amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'Bs' ? `Bs ${formatted}` : `$ ${formatted}`
}

export function PaymentsPage() {
  const toast = useToast()
  const today = todayLocalDateIso()

  // State for single-order lookup (maintains backwards compatibility & tests)
  const [ordenInput, setOrdenInput] = useState('')
  const [ordenId, setOrdenId] = useState<number | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [targetRecordOrderId, setTargetRecordOrderId] = useState<number | null>(null)

  // State for cancelling payment
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  // State for Global Payments View (M1) — default "Todos" so pending and paid
  // payments from any day are visible without searching.
  const [periodRange, setPeriodRange] = useState<PeriodRange>(() => getPeriodRange('todos'))
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = useState<FilterTab>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { rate } = useBcvRate()
  const {
    payments: orderPayments,
    balance: orderBalance,
    loading: orderLoading,
    error: orderErrorMsg,
    record: recordForOrder,
    cancel: cancelPaymentCall,
  } = usePaymentsForOrder(ordenId)

  // Query global payments
  const globalFilters = useMemo(
    () => ({
      desde: periodRange.desde || undefined,
      hasta: periodRange.hasta || undefined,
      soloDeudores: activeTab === 'deudores',
      query: debouncedQuery.trim() || undefined,
    }),
    [periodRange.desde, periodRange.hasta, activeTab, debouncedQuery],
  )

  const {
    payments: allPayments,
    loading: globalLoading,
    error: globalError,
    refetch: refetchGlobal,
  } = useAllPayments(globalFilters)

  // Single order lookup handler
  const loadOrder = () => {
    const parsed = Number(ordenInput)
    if (Number.isInteger(parsed) && parsed > 0) {
      setOrdenId(parsed)
      setOrderError(null)
    } else {
      setOrderError('Ingrese un número de orden válido.')
    }
  }

  // Submit payment handler (works for both single order and table abono)
  const handleSubmit = async (req: RecordPaymentRequest) => {
    const result = await recordForOrder(req)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    setTargetRecordOrderId(null)
    toast.success('Pago registrado exitosamente.')
    void refetchGlobal()
    return { ok: true }
  }

  // Cancel payment handler
  const handleCancel = async () => {
    if (cancelId === null) return
    const result = await cancelPaymentCall(cancelId, motivo.trim() || 'Anulado por el cajero')
    setCancelId(null)
    setMotivo('')
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo anular el pago.')
    } else {
      toast.success('Pago anulado exitosamente.')
      void refetchGlobal()
    }
  }

  // Open record form with specific order ID
  const openRecordForOrder = (id: number) => {
    setTargetRecordOrderId(id)
    setShowForm(true)
  }

  // Filtered rows for the table
  const displayedPayments = useMemo(() => {
    if (activeTab === 'pagados') {
      return allPayments.filter((p) => p.saldoActualOrden === 0)
    }
    return allPayments
  }, [allPayments, activeTab])

  // KPIs
  const kpis = useMemo(() => {
    let recaudadoHoyBs = 0
    let recaudadoHoyUsd = 0
    const seenOrders = new Set<number>()
    let porCobrarBs = 0

    for (const p of allPayments) {
      if (!p.anulado && p.fecha === today) {
        recaudadoHoyBs += p.monto_bs
        recaudadoHoyUsd += p.monto_usd
      }
      if (!seenOrders.has(p.ordenId)) {
        seenOrders.add(p.ordenId)
        if (p.saldoActualOrden > 0) {
          porCobrarBs += p.saldoActualOrden
        }
      }
    }

    return {
      recaudadoHoyBs,
      recaudadoHoyUsd,
      porCobrarBs,
      totalRegistros: displayedPayments.length,
    }
  }, [allPayments, displayedPayments, today])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-950" data-testid="payments-heading">
            Pagos
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-600">
            Registre pagos, consulte el saldo de cada orden y audite el historial de cobros.
          </p>
        </div>
        <Button
          onClick={() => {
            if (ordenId) {
              openRecordForOrder(ordenId)
            } else {
              setTargetRecordOrderId(null)
              setShowForm(true)
            }
          }}
          className="gap-2"
        >
          <PlusCircle size={18} />
          Registrar cobro
        </Button>
      </div>

      {/* Top KPIs (M1 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
            <DollarSign size={15} className="text-success-600 dark:text-success-400" />
            Recaudado Hoy
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
              {formatMoney(kpis.recaudadoHoyBs, 'Bs')}
            </span>
            {kpis.recaudadoHoyUsd > 0 && (
              <span className="text-sm font-semibold text-success-700 dark:text-success-400 tabular-nums">
                ({formatMoney(kpis.recaudadoHoyUsd, 'USD')})
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
            <Clock size={15} className="text-warning-600 dark:text-warning-400" />
            Por Cobrar (Deuda Activa)
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-danger-700 dark:text-danger-400 tabular-nums">
              {formatMoney(kpis.porCobrarBs, 'Bs')}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
            <AlertCircle size={15} className="text-primary-600 dark:text-primary-400" />
            Transacciones en Vista
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
              {kpis.totalRegistros}
            </span>
          </div>
        </div>
      </div>

      {/* Specific Order Lookup Banner */}
      <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card/60 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Input
              label="Orden #"
              type="number"
              min={1}
              value={ordenInput}
              onChange={(e) => {
                setOrdenInput(e.target.value)
                if (orderError) setOrderError(null)
              }}
              placeholder="Ej: 1"
            />
          </div>
          <Button type="button" variant="secondary" onClick={loadOrder}>
            Cargar
          </Button>
          {ordenId !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOrdenId(null)
                setOrdenInput('')
              }}
            >
              Cerrar detalle de orden
            </Button>
          )}
        </div>
        {orderError && (
          <p className="text-xs text-danger-600 dark:text-danger-400" role="alert">
            {orderError}
          </p>
        )}
      </div>

      {/* Selected Order Detail (Shown when specific order is loaded) */}
      {ordenId !== null && (
        <div className="rounded-xl border border-primary-200 dark:border-primary-900/50 bg-primary-50/30 dark:bg-primary-950/10 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-900 dark:text-ink-950">
              Detalle de Orden #{ordenId}
            </h3>
            <Button size="sm" onClick={() => openRecordForOrder(ordenId)}>
              Registrar pago
            </Button>
          </div>

          {orderErrorMsg && (
            <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
              {orderErrorMsg}
            </div>
          )}

          {orderLoading ? (
            <p className="text-ink-500">Cargando orden…</p>
          ) : (
            <PaymentList
              payments={orderPayments}
              balance={orderBalance}
              onCancel={(id) => setCancelId(id)}
            />
          )}
        </div>
      )}

      {/* Period Selector & Controls for Global Payments History */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <PeriodSelector
            showAll
            value={periodRange}
            anchorDate={anchorDate}
            onChange={(range, newAnchor) => {
              setPeriodRange(range)
              setAnchorDate(newAnchor)
            }}
            className="w-full md:w-auto"
          />

          {/* Search Input with Debounce */}
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-600"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cédula, paciente, orden..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Buscar pagos"
            />
          </div>
        </div>

        {/* Segmented Filter Tabs: Todos / Deudores / Pagados */}
        <div className="flex items-center gap-2 border-b border-paper-200 dark:border-surface-border pb-2">
          {(
            [
              { id: 'todos', label: 'Todos los pagos' },
              { id: 'deudores', label: 'Con saldo pendiente (Deudores)' },
              { id: 'pagados', label: 'Pagados al 100%' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 font-semibold'
                  : 'text-ink-600 dark:text-ink-400 hover:bg-paper-100 dark:hover:bg-surface-hover',
              )}
            >
              {tab.label}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetchGlobal()}
            className="ml-auto text-xs gap-1.5"
            title="Recargar pagos"
          >
            <RefreshCw size={13} />
            Recargar
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {globalError}
        </div>
      )}

      {/* Global Payments Table */}
      {globalLoading ? (
        <div className="p-8 text-center text-ink-500 dark:text-ink-600">Cargando pagos…</div>
      ) : displayedPayments.length === 0 ? (
        <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-8 text-center space-y-2">
          <p className="text-ink-500 dark:text-ink-600">
            No se encontraron cobros para el período y filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Nº Orden</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Cajero</th>
                  <th className="px-4 py-3 text-right">Saldo Orden</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
                {displayedPayments.map((p) => {
                  const isAnulado = p.anulado
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors',
                        isAnulado && 'opacity-50 bg-paper-50/50 dark:bg-surface-card/40',
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-ink-700 dark:text-ink-700 font-mono text-xs">
                        {p.fecha}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900 dark:text-ink-950">
                          {p.pacienteNombre}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-ink-600 font-mono">
                          {p.pacienteCedula}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-primary-700 dark:text-primary-400">
                        #{p.ordenId}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-variant-numeric tabular-nums font-semibold text-ink-900 dark:text-ink-950">
                        {formatMoney(p.monto_bs, 'Bs')}
                        {p.monto_usd > 0 && (
                          <div className="text-xs text-ink-500 font-normal">
                            ({formatMoney(p.monto_usd, 'USD')})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-paper-100 dark:bg-paper-100/40 text-ink-800 dark:text-ink-300">
                          {METHOD_LABELS[p.metodo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-600 dark:text-ink-700 text-xs">
                        {p.cajero}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {p.saldoActualOrden > 0 ? (
                          <span className="font-semibold text-warning-700 dark:text-warning-400 tabular-nums">
                            {formatMoney(p.saldoActualOrden, 'Bs')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700 dark:text-success-400">
                            <CheckCircle2 size={13} />
                            Saldada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.saldoActualOrden > 0 && !isAnulado && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openRecordForOrder(p.ordenId)}
                              className="text-xs h-7 px-2"
                              title="Registrar abono para esta orden"
                            >
                              Abonar
                            </Button>
                          )}
                          {!isAnulado && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelId(p.id)}
                              className="text-xs h-7 px-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/20"
                            >
                              Anular
                            </Button>
                          )}
                          {isAnulado && (
                            <span className="text-xs text-ink-400 italic">Anulado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={showForm}
        title={targetRecordOrderId ? `Registrar Cobro · Orden #${targetRecordOrderId}` : 'Registrar Cobro'}
        onClose={() => {
          setShowForm(false)
          setTargetRecordOrderId(null)
        }}
        size="md"
      >
        <PaymentRecordForm
          ordenId={targetRecordOrderId ?? ordenId ?? 1}
          rate={rate}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setTargetRecordOrderId(null)
          }}
        />
      </Modal>

      {/* Cancel Payment Dialog with Reason Input */}
      <Modal
        open={cancelId !== null}
        title="Anular pago"
        onClose={() => {
          setCancelId(null)
          setMotivo('')
        }}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-700 dark:text-ink-300">
            Registre el motivo de la anulación del pago.
          </p>
          <Input
            label="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Error en el monto"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCancelId(null)
                setMotivo('')
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              Anular pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
