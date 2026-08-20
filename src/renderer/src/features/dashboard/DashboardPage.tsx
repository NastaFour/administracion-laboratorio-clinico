import { useState } from 'react'
import { CalendarDays, Users, BarChart3, Activity } from 'lucide-react'
import { cn } from '../../lib/cn'
import { TodayView } from './TodayView'
import { DebtorsView } from './DebtorsView'
import { StatsView } from './StatsView'
import { TrendsView } from './TrendsView'

type DashboardTab = 'today' | 'debtors' | 'stats' | 'trends'

const TABS: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'today', label: 'Hoy', icon: CalendarDays },
  { id: 'debtors', label: 'Deudores', icon: Users },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'trends', label: 'Tendencias', icon: Activity },
]

/**
 * Real-data dashboard (D10): four views over the live aggregates. Every view
 * renders an empty state when its data set is empty — no fabricated numbers.
 */
export function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>('today')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="dashboard-heading">
          Panel de control
        </h2>
        <p className="text-sm text-ink-500">
          Datos reales del laboratorio: actividad de hoy, deudores, estadísticas y tendencias.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-paper-200 bg-white p-1" role="tablist" aria-label="Vistas del panel">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-primary-600 text-white' : 'text-ink-600 hover:bg-paper-100',
            )}
            data-testid={`dashboard-tab-${id}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'today' && <TodayView />}
      {tab === 'debtors' && <DebtorsView />}
      {tab === 'stats' && <StatsView />}
      {tab === 'trends' && <TrendsView />}
    </div>
  )
}