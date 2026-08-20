import type { Balance, Payment } from '@/shared/contracts'
import { METHOD_LABELS } from './methods'
import { Button } from '../../components/ui/Button'

function formatMoney(value: number, currency: 'Bs' | 'USD'): string {
  const formatted = value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'Bs' ? `Bs ${formatted}` : `$ ${formatted}`
}

interface PaymentListProps {
  payments: Payment[]
  balance: Balance | null
  onCancel: (id: number) => void
}

export function PaymentList({ payments, balance, onCancel }: PaymentListProps) {
  return (
    <div className="space-y-4" data-testid="payment-list">
      {balance && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-paper-200 bg-paper-50 p-4">
            <p className="text-xs text-ink-500">Total</p>
            <p className="text-lg font-semibold text-ink-900 tabular-nums">{formatMoney(balance.total_bs, 'Bs')}</p>
          </div>
          <div className="rounded-lg border border-paper-200 bg-paper-50 p-4">
            <p className="text-xs text-ink-500">Pagado</p>
            <p className="text-lg font-semibold text-ink-900 tabular-nums">{formatMoney(balance.pagado_bs, 'Bs')}</p>
          </div>
          <div className="rounded-lg border border-paper-200 bg-paper-50 p-4">
            <p className="text-xs text-ink-500">Saldo</p>
            <p className="text-lg font-semibold text-danger-700 tabular-nums">{formatMoney(balance.saldo_bs, 'Bs')}</p>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-ink-500 text-sm">Sin pagos registrados para esta orden.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-paper-200">
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Método</th>
              <th className="py-2 pr-3 text-right">Bs</th>
              <th className="py-2 pr-3 text-right">USD</th>
              <th className="py-2 pr-3">Referencia</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-paper-100">
                <td className="py-2 pr-3">{payment.fecha}</td>
                <td className="py-2 pr-3">{METHOD_LABELS[payment.metodo]}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(payment.monto_bs, 'Bs')}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(payment.monto_usd, 'USD')}</td>
                <td className="py-2 pr-3">{payment.referencia ?? '—'}</td>
                <td className="py-2 text-right">
                  {!payment.anulado && (
                    <Button variant="ghost" size="sm" onClick={() => onCancel(payment.id)}>
                      Anular
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
