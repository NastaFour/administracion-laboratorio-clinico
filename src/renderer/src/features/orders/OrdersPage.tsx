import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useOrders } from './useOrders'
import { OrderList } from './OrderList'
import { OrderForm } from './OrderForm'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useSessionStore } from '../../stores/useSessionStore'
import type { CreateOrderRequest, OrderStatus, OrderWithExams } from '@/shared/contracts'
import { ORDER_STATUS } from '@/shared/contracts'

const CREDIT_ROLES = ['admin', 'bioanalista']

export function OrdersPage() {
  const { session } = useSessionStore()
  const canAuthorizeCredit = session ? CREDIT_ROLES.includes(session.rol) : false

  const [filters, setFilters] = useState<{ estatus: OrderStatus | ''; pendientePago: '' | 'true' | 'false' }>({
    estatus: '',
    pendientePago: '',
  })
  const { orders, loading, error, refetch, create, update, authorizeCredit } = useOrders({
    estatus: filters.estatus || undefined,
    pendientePago: filters.pendientePago === '' ? undefined : filters.pendientePago === 'true',
  })

  const [editing, setEditing] = useState<OrderWithExams | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creditOrder, setCreditOrder] = useState<OrderWithExams | null>(null)
  const [creditMonto, setCreditMonto] = useState('')
  const [creditMotivo, setCreditMotivo] = useState('')
  const [creditError, setCreditError] = useState<string | null>(null)
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  const handleCreate = async (input: CreateOrderRequest) => {
    const result = await create(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    return { ok: true }
  }

  const handleUpdate = async (input: CreateOrderRequest & { id?: number }) => {
    if (!editing) return { ok: false, error: 'No hay orden seleccionada.' }
    const result = await update(input as Parameters<typeof update>[0])
    if (!result.ok) return { ok: false, error: result.error }
    setEditing(null)
    setShowForm(false)
    return { ok: true }
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

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="order-status-filter" className="block text-sm font-medium text-ink-700">
            Estatus
          </label>
          <select
            id="order-status-filter"
            value={filters.estatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, estatus: e.target.value as OrderStatus | '' }))}
            className="rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
          <label htmlFor="order-payment-filter" className="block text-sm font-medium text-ink-700">
            Pago
          </label>
          <select
            id="order-payment-filter"
            value={filters.pendientePago}
            onChange={(e) => setFilters((prev) => ({ ...prev, pendientePago: e.target.value as '' | 'true' | 'false' }))}
            className="rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
        onEdit={openEdit}
        onAuthorizeCredit={openCredit}
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
    </div>
  )
}
