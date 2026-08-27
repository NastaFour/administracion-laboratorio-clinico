import { Edit2, CreditCard, CheckCheck, Ban, History } from 'lucide-react'
import { cn } from '../../lib/cn'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import type { OrderWithExams, Patient } from '@/shared/contracts'
import { ORDER_STATUS } from '@/shared/contracts'

interface OrderListProps {
  orders: OrderWithExams[]
  canAuthorizeCredit: boolean
  canDeliver?: boolean
  canVoid?: boolean
  patientsMap?: Map<number, Patient>
  onEdit: (order: OrderWithExams) => void
  onAuthorizeCredit: (order: OrderWithExams) => void
  onDeliver?: (order: OrderWithExams) => void
  onVoid?: (order: OrderWithExams) => void
  onNavigateToHistory?: () => void
}

function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function OrderList({
  orders,
  canAuthorizeCredit,
  canDeliver = false,
  canVoid = false,
  patientsMap,
  onEdit,
  onAuthorizeCredit,
  onDeliver,
  onVoid,
  onNavigateToHistory,
}: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-8 text-center space-y-3">
        <p className="text-ink-500 dark:text-ink-600">No hay órdenes en este período.</p>
        {onNavigateToHistory && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onNavigateToHistory}
            className="gap-2"
          >
            <History size={15} />
            Ir a Historial
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
      <table className="w-full text-sm">
        <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border">
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
        <tbody className="divide-y divide-paper-100 dark:divide-surface-border">
          {orders.map((order) => {
            const patient = patientsMap?.get(order.paciente_id)
            return (
              <tr key={order.id} className={cn('hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors', order.anulada && 'opacity-60')}>
                <td className="px-4 py-3 text-ink-900 dark:text-ink-950 font-medium">#{order.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-900 dark:text-ink-950">
                    {patient ? `${patient.nombre} ${patient.apellido}` : `#${order.paciente_id}`}
                  </p>
                  {patient?.cedula && (
                    <p className="text-xs text-ink-500 dark:text-ink-600 font-mono">
                      {patient.cedula}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{order.examenes.length}</td>
                <td className="px-4 py-3 text-right text-ink-900 dark:text-ink-950 font-medium">{formatBs(order.total_bs)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.estatus} />
                  {order.credito && <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800 dark:bg-accent-100/30 dark:text-accent-400">Crédito</span>}
                </td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{formatDate(order.fecha)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    {!order.cerrada && !order.anulada && (
                      <button
                        onClick={() => onEdit(order)}
                        className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-surface-hover rounded-md transition-colors"
                        aria-label={`Editar orden ${order.id}`}
                        title="Editar orden"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {canAuthorizeCredit && !order.credito && !order.anulada && (
                      <button
                        onClick={() => onAuthorizeCredit(order)}
                        className="p-1.5 text-ink-500 hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-surface-hover rounded-md transition-colors"
                        aria-label={`Autorizar crédito orden ${order.id}`}
                        title="Autorizar crédito"
                      >
                        <CreditCard size={16} />
                      </button>
                    )}
                    {canDeliver && order.estatus === ORDER_STATUS.COMPLETADA && !order.anulada && onDeliver && (
                      <button
                        onClick={() => onDeliver(order)}
                        className="p-1.5 text-success-600 hover:text-success-700 hover:bg-success-50 dark:hover:bg-success-100/20 rounded-md transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        aria-label={`Entregar orden ${order.id}`}
                        title="Entregar resultados al paciente"
                      >
                        <CheckCheck size={16} />
                        <span className="hidden xl:inline">Entregar</span>
                      </button>
                    )}
                    {canVoid && !order.anulada && !order.cerrada && onVoid && (
                      <button
                        onClick={() => onVoid(order)}
                        className="p-1.5 text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-100/20 rounded-md transition-colors"
                        aria-label={`Anular orden ${order.id}`}
                        title="Anular orden"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
