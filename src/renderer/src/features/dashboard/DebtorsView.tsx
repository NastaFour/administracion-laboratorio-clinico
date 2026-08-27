import { Users } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { useDebtors } from './useDashboard'
import type { DebtorBucket } from '@/shared/contracts'

const BUCKET_LABELS: Record<DebtorBucket['rango'], string> = {
  '0-30': '0 – 30 días',
  '31-60': '31 – 60 días',
  '61-90': '61 – 90 días',
  '90+': 'Más de 90 días',
}

const BUCKET_ORDER: Array<DebtorBucket['rango']> = ['0-30', '31-60', '61-90', '90+']

function formatBs(value: number): string {
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
}

/**
 * View 2 — debtors with aging buckets (0-30 / 31-60 / 61-90 / 90+).
 * The buckets come from the real balances on the main side (M11.1 aging).
 */
export function DebtorsView() {
  const { data, loading, error } = useDebtors()

  return (
    <div className="space-y-4" data-testid="debtors-view">
      {loading && <p className="text-sm text-ink-500">Cargando deudores…</p>}
      {!loading && error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={Users}
          title="No hay saldos pendientes"
          description="Ninguna orden tiene saldo pendiente. Los deudores por antigüedad aparecerán aquí."
        />
      )}
      {!loading && !error && data && data.length > 0 && (
      <>
      {BUCKET_ORDER.map((rango) => {
        const bucket = data.filter((debtor) => debtor.rango === rango)
        const total = bucket.reduce((sum, debtor) => sum + debtor.saldo_bs, 0)
        return (
          <div key={rango} className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
            <div className="flex items-center justify-between border-b border-paper-100 dark:border-surface-border px-4 py-2.5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-950" data-testid={`bucket-${rango}`}>
                {BUCKET_LABELS[rango]}
              </h3>
              <p className="text-sm font-semibold text-danger-700 dark:text-danger-400 tabular-nums">{formatBs(total)}</p>
            </div>
            {bucket.length === 0 ? (
              <p className="px-4 py-3 text-xs text-ink-400 dark:text-ink-600">Sin deudores en este rango.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500 dark:text-ink-600 border-b border-paper-100 dark:border-surface-border">
                    <th className="px-4 py-2">Paciente</th>
                    <th className="px-4 py-2 text-right">Días pendientes</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-100 dark:divide-surface-border">
                  {bucket.map((debtor, index) => (
                    <tr key={`${debtor.paciente_id}-${index}`} className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-2 font-medium text-ink-900 dark:text-ink-950">{debtor.paciente_nombre}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-600 dark:text-ink-700">{debtor.dias_pendientes}</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-danger-700 dark:text-danger-400">
                        {formatBs(debtor.saldo_bs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
      </>
      )}
    </div>
  )
}