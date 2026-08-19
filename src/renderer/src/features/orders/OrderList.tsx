import { Edit2, CreditCard } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { OrderWithExams } from '@/shared/contracts'
import { ORDER_STATUS } from '@/shared/contracts'

interface OrderListProps {
  orders: OrderWithExams[]
  canAuthorizeCredit: boolean
  onEdit: (order: OrderWithExams) => void
  onAuthorizeCredit: (order: OrderWithExams) => void
}

function statusPill(estatus: string): string {
  switch (estatus) {
    case ORDER_STATUS.PENDIENTE:
      return 'bg-amber-100 text-amber-800'
    case ORDER_STATUS.PROCESANDO:
      return 'bg-primary-100 text-primary-800'
    case ORDER_STATUS.COMPLETADA:
      return 'bg-success-50 text-success-700'
    case ORDER_STATUS.ENTREGADA:
      return 'bg-paper-200 text-ink-600'
    default:
      return 'bg-paper-100 text-ink-700'
  }
}

function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function OrderList({ orders, canAuthorizeCredit, onEdit, onAuthorizeCredit }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
        <p className="text-ink-500">No hay órdenes registradas.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-paper-100 text-ink-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Nº</th>
            <th className="px-4 py-3 text-left font-medium">Paciente</th>
            <th className="px-4 py-3 text-left font-medium">Exámenes</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-left font-medium">Estatus</th>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-100">
          {orders.map((order) => (
            <tr key={order.id} className={cn('hover:bg-paper-50', order.anulada && 'opacity-60')}>
              <td className="px-4 py-3 text-ink-900 font-medium">{order.id}</td>
              <td className="px-4 py-3 text-ink-600">#{order.paciente_id}</td>
              <td className="px-4 py-3 text-ink-600">{order.examenes.length}</td>
              <td className="px-4 py-3 text-right text-ink-900 font-medium">{formatBs(order.total_bs)}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusPill(order.estatus))}>
                  {order.estatus}
                </span>
                {order.credito && <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800">Crédito</span>}
              </td>
              <td className="px-4 py-3 text-ink-600">{formatDate(order.fecha)}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-2">
                  {!order.cerrada && !order.anulada && (
                    <button
                      onClick={() => onEdit(order)}
                      className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                      aria-label={`Editar orden ${order.id}`}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {canAuthorizeCredit && !order.credito && !order.anulada && (
                    <button
                      onClick={() => onAuthorizeCredit(order)}
                      className="p-1.5 text-ink-500 hover:text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
                      aria-label={`Autorizar crédito orden ${order.id}`}
                    >
                      <CreditCard size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
