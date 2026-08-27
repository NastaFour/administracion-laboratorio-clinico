import { CalendarDays, ClipboardList } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { useTodayKpis } from './useDashboard'

function formatBs(value: number): string {
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * View 1 — today's orders & collections (M11.1). Every number is a real
 * aggregate; an empty day shows an empty state, never a fabricated zero.
 */
export function TodayView() {
  const { data, loading, error } = useTodayKpis()

  const hasActivity =
    data !== null &&
    (data.ordenes_hoy > 0 || data.resultados_pendientes > 0 || data.ingreso_bs > 0 || data.ingreso_usd > 0)

  const categories = data ? Object.entries(data.examenes_por_categoria) : []

  return (
    <div className="space-y-4" data-testid="today-view">
      {loading && <p className="text-sm text-ink-500">Cargando panel del día…</p>}
      {!loading && error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && data !== null && !hasActivity && (
        <EmptyState
          icon={CalendarDays}
          title="Hoy aún no hay actividad"
          description="Las órdenes, cobros y resultados del día aparecerán aquí en tiempo real."
        />
      )}
      {!loading && !error && data !== null && hasActivity && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
          <p className="text-xs text-ink-500 dark:text-ink-600">Órdenes de hoy</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-ink-950 tabular-nums" data-testid="kpi-ordenes-hoy">
            {data.ordenes_hoy}
          </p>
        </div>
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
          <p className="text-xs text-ink-500 dark:text-ink-600">Resultados pendientes</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-ink-950 tabular-nums" data-testid="kpi-resultados-pendientes">
            {data.resultados_pendientes}
          </p>
        </div>
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
          <p className="text-xs text-ink-500 dark:text-ink-600">Ingreso de hoy (Bs)</p>
          <p className="mt-1 text-2xl font-semibold text-primary-700 dark:text-primary-400 tabular-nums" data-testid="kpi-ingreso-bs">
            {formatBs(data.ingreso_bs)}
          </p>
        </div>
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
          <p className="text-xs text-ink-500 dark:text-ink-600">Ingreso de hoy (USD)</p>
          <p className="mt-1 text-2xl font-semibold text-primary-700 dark:text-primary-400 tabular-nums" data-testid="kpi-ingreso-usd">
            {formatUsd(data.ingreso_usd)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-950">Exámenes por categoría</h3>
        {categories.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin exámenes registrados hoy"
            description="Los exámenes ordenados hoy se agrupan aquí por categoría."
          />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {categories.map(([categoria, cantidad]) => (
              <div key={categoria} className="rounded-md bg-paper-50 dark:bg-paper-100 px-3 py-2">
                <p className="text-xs text-ink-500 dark:text-ink-600">{categoria}</p>
                <p className="text-lg font-semibold text-ink-900 dark:text-ink-950 tabular-nums">{cantidad}</p>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}