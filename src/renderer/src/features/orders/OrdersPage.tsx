import { useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'
import { useOrders } from './useOrders'
import { OrderList } from './OrderList'
import { OrderForm } from './OrderForm'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { useToast } from '../../components/ui/useToast'
import { useSessionStore } from '../../stores/useSessionStore'
import { getPeriodRange, type PeriodRange } from '../../lib/dates'
import type { CreateOrderRequest, OrderStatus, OrderWithExams, Patient } from '@/shared/contracts'
import { ORDER_STATUS } from '@/shared/contracts'

const CREDIT_ROLES = ['admin', 'bioanalista']
const DELIVER_ROLES = ['admin', 'recepcion']

interface OrdersPageProps {
  onNavigateToHistory?: () => void
}

export function OrdersPage({ onNavigateToHistory }: OrdersPageProps = {}) {
  const toast = useToast()
  const { session } = useSessionStore()
  const canAuthorizeCredit = session ? CREDIT_ROLES.includes(session.rol) : false
  const canDeliver = session ? DELIVER_ROLES.includes(session.rol) : false
  const canVoid = session ? session.rol === 'admin' : false

  const [filters, setFilters] = useState<{ estatus: OrderStatus | ''; pendientePago: '' | 'true' | 'false' }>({
    estatus: '',
    pendientePago: '',
  })
  // M4: uniform period navigation — default to today (Día), switch to
  // Semana/Mes/Año with the PeriodSelector.
  const [period, setPeriod] = useState<PeriodRange>(() => getPeriodRange('dia'))
  const { orders, loading, error, refetch, create, update, deliver, voidOrder, authorizeCredit } = useOrders({
    estatus: filters.estatus || undefined,
    pendientePago: filters.pendientePago === '' ? undefined : filters.pendientePago === 'true',
    desde: period.desde,
    hasta: period.hasta,
  })

  const [patientsMap, setPatientsMap] = useState<Map<number, Patient>>(new Map())

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const result = await window.api.patients.list({ activos: false })
        if (result.ok && result.data) {
          const map = new Map<number, Patient>()
          for (const p of result.data) {
            map.set(p.id, p)
          }
          setPatientsMap(map)
        }
      } catch {
        // non-blocking
      }
    }
    void loadPatients()
  }, [])

  const [editing, setEditing] = useState<OrderWithExams | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creditOrder, setCreditOrder] = useState<OrderWithExams | null>(null)
  const [creditMonto, setCreditMonto] = useState('')
  const [creditMotivo, setCreditMotivo] = useState('')
  const [creditError, setCreditError] = useState<string | null>(null)
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  // Void order state (Fix A1, A16)
  const [voidModalOrder, setVoidModalOrder] = useState<OrderWithExams | null>(null)
  const [voidMotivo, setVoidMotivo] = useState('')
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidSubmitting, setVoidSubmitting] = useState(false)

  const handleCreate = async (input: CreateOrderRequest) => {
    const result = await create(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    toast.success('Orden creada exitosamente.')
    return { ok: true }
  }

  const handleUpdate = async (input: CreateOrderRequest & { id?: number }) => {
    if (!editing) return { ok: false, error: 'No hay orden seleccionada.' }
    const result = await update(input as Parameters<typeof update>[0])
    if (!result.ok) return { ok: false, error: result.error }
    setEditing(null)
    setShowForm(false)
    toast.success('Orden actualizada exitosamente.')
    return { ok: true }
  }

  const handleDeliver = async (order: OrderWithExams) => {
    const result = await deliver(order.id)
    if (result.ok) {
      toast.success(`Resultados de la orden #${order.id} entregados.`)
    } else {
      toast.error(result.error ?? 'No se pudo entregar la orden.')
    }
  }

  const openVoid = (order: OrderWithExams) => {
    setVoidModalOrder(order)
    setVoidMotivo('')
    setVoidError(null)
  }

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voidModalOrder) return
    if (!voidMotivo.trim()) {
      setVoidError('Debe ingresar un motivo para anular la orden.')
      return
    }
    setVoidSubmitting(true)
    const result = await voidOrder(voidModalOrder.id, voidMotivo.trim())
    setVoidSubmitting(false)
    if (!result.ok) {
      setVoidError(result.error ?? 'No se pudo anular la orden.')
      return
    }
    toast.success(`Orden #${voidModalOrder.id} anulada.`)
    setVoidModalOrder(null)
    setVoidMotivo('')
  }

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (order: OrderWithExams) => {
    setEditing(order)
    setShowForm(true)
  }

  const openCredit = (order: OrderWithExams) => {
    setCreditOrder(order)
    setCreditMonto(order.total_bs.toString())
    setCreditMotivo('')
    setCreditError(null)
  }

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creditOrder) return
    setCreditError(null)

    const monto = Number(creditMonto)
    if (!monto || monto <= 0) {
      setCreditError('Ingrese un monto válido.')
      return
    }
    if (!creditMotivo.trim()) {
      setCreditError('Ingrese el motivo de la autorización.')
      return
    }

    setCreditSubmitting(true)
    const result = await authorizeCredit(creditOrder.id, monto, creditMotivo.trim())
    setCreditSubmitting(false)

    if (!result.ok) {
      setCreditError(result.error)
      return
    }
    toast.success('Crédito autorizado exitosamente.')
    setCreditOrder(null)
    setCreditMonto('')
    setCreditMotivo('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900" data-testid="orders-heading">
            Órdenes
          </h2>
          <p className="text-sm text-ink-500">Cree y gestione órdenes de exámenes.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle size={18} className="mr-2" />
          Nueva orden
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <PeriodSelector value={period} onChange={(range) => setPeriod(range)} />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="order-status-filter" className="block text-sm font-medium text-ink-700">
            Estatus
          </label>
          <select
            id="order-status-filter"
            value={filters.estatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, estatus: e.target.value as OrderStatus | '' }))}
            className="rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos</option>
            {Object.values(ORDER_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="order-payment-filter" className="block text-sm font-medium text-ink-700 dark:text-ink-700">
            Pago
          </label>
          <select
            id="order-payment-filter"
            value={filters.pendientePago}
            onChange={(e) => setFilters((prev) => ({ ...prev, pendientePago: e.target.value as '' | 'true' | 'false' }))}
            className="rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos</option>
            <option value="true">Pendiente</option>
            <option value="false">Pagado</option>
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Recargar
        </Button>
      </div>

      {loading && <p className="text-ink-500">Cargando órdenes…</p>}

      <OrderList
        orders={orders}
        canAuthorizeCredit={canAuthorizeCredit}
        canDeliver={canDeliver}
        canVoid={canVoid}
        patientsMap={patientsMap}
        onEdit={openEdit}
        onAuthorizeCredit={openCredit}
        onDeliver={handleDeliver}
        onVoid={openVoid}
        onNavigateToHistory={onNavigateToHistory}
      />

      <Modal
        open={showForm}
        title={editing ? 'Editar orden' : 'Nueva orden'}
        onClose={() => setShowForm(false)}
        size="md"
      >
        <OrderForm
          order={editing}
          onSaved={() => {
            setShowForm(false)
            void refetch()
          }}
          onCancel={() => setShowForm(false)}
          onSubmit={editing ? handleUpdate : handleCreate}
        />
      </Modal>

      <Modal
        open={!!creditOrder}
        title={`Autorizar crédito - Orden #${creditOrder?.id}`}
        onClose={() => setCreditOrder(null)}
        size="sm"
      >
        <form onSubmit={handleCreditSubmit} className="space-y-4">
          {creditError && (
            <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
              {creditError}
            </div>
          )}
          <Input
            label="Monto autorizado (Bs)"
            type="number"
            min={1}
            step="0.01"
            value={creditMonto}
            onChange={(e) => setCreditMonto(e.target.value)}
            placeholder="0.00"
          />
          <div className="space-y-1">
            <label htmlFor="credit-motivo" className="block text-sm font-medium text-ink-700">
              Motivo
            </label>
            <textarea
              id="credit-motivo"
              value={creditMotivo}
              onChange={(e) => setCreditMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo de la autorización de crédito"
              className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreditOrder(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creditSubmitting}>
              {creditSubmitting ? 'Autorizando…' : 'Autorizar crédito'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!voidModalOrder}
        title={`Anular Orden #${voidModalOrder?.id}`}
        onClose={() => setVoidModalOrder(null)}
        size="sm"
      >
        <form onSubmit={handleVoidSubmit} className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-700">
            ¿Está seguro de anular la orden #{voidModalOrder?.id}? Esta acción registrará una auditoría y no se puede deshacer.
          </p>
          {voidError && (
            <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
              {voidError}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="void-motivo" className="block text-sm font-medium text-ink-700 dark:text-ink-700">
              Motivo de anulación *
            </label>
            <textarea
              id="void-motivo"
              value={voidMotivo}
              onChange={(e) => {
                setVoidMotivo(e.target.value)
                if (voidError) setVoidError(null)
              }}
              rows={3}
              placeholder="Ej: Muestra hemolizada, error en datos..."
              required
              className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setVoidModalOrder(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={voidSubmitting}>
              {voidSubmitting ? 'Anulando…' : 'Anular orden'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
