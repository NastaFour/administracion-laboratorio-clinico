import { useState } from 'react'
import { BarChart as BarChartIcon, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { currentMonthRange, useStats } from './useDashboard'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
}

function monthLabel(mes: string): string {
  const [year, month] = mes.split('-')
  return `${MONTH_LABELS[month] ?? month} ${year ?? ''}`.trim()
}

function formatBs(value: number): string {
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
}

function formatCompact(value: number): string {
  return value.toLocaleString('es-VE', { maximumFractionDigits: 0 })
}

/**
 * View 3 — lab statistics (M11.3): top exams by volume and monthly revenue vs
 * the previous month, both wired to real range-bound aggregates and rendered
 * with recharts. Empty ranges show empty states, never fabricated numbers.
 */
export function StatsView() {
  const initial = currentMonthRange()
  const [desde, setDesde] = useState(initial.desde)
  const [hasta, setHasta] = useState(initial.hasta)
  const [range, setRange] = useState(initial)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const { data, loading, error } = useStats(range.desde, range.hasta)

  const applyRange = () => {
    if (!desde || !hasta) {
      setRangeError('Seleccione ambas fechas para consultar.')
      return
    }
    if (desde > hasta) {
      setRangeError('La fecha "Desde" no puede ser posterior a "Hasta".')
      return
    }
    setRangeError(null)
    setRange({ desde, hasta })
  }

  const chartData = (data?.ingreso_mensual ?? []).map((row) => ({
    ...row,
    mes: monthLabel(row.mes),
  }))
  const topData = (data?.top_examenes ?? []).map((exam) => ({
    ...exam,
    nombre: exam.examen_nombre.length > 18 ? `${exam.examen_nombre.slice(0, 17)}…` : exam.examen_nombre,
  }))
  const hasStats = (data?.top_examenes.length ?? 0) > 0 || (data?.ingreso_mensual.some((row) => row.bs > 0 || row.usd > 0) ?? false)

  return (
    <div className="space-y-4" data-testid="stats-view">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
        <Input
          label="Desde"
          type="date"
          value={desde}
          onChange={(event) => {
            setDesde(event.target.value)
            if (rangeError) setRangeError(null)
          }}
        />
        <Input
          label="Hasta"
          type="date"
          value={hasta}
          onChange={(event) => {
            setHasta(event.target.value)
            if (rangeError) setRangeError(null)
          }}
        />
        <Button type="button" onClick={applyRange} data-testid="stats-apply">
          Aplicar rango
        </Button>
        {data && data.ingreso_mensual.length > 0 && (
          <p className="ml-auto text-sm text-ink-600 dark:text-ink-700">
            Mes anterior:{' '}
            <span className="font-semibold tabular-nums text-ink-900 dark:text-ink-950">
              {formatBs(data.ingreso_mes_anterior_bs)}
            </span>{' '}
            <span className="text-ink-500 dark:text-ink-600 tabular-nums">
              ({formatUsd(data.ingreso_mes_anterior_usd)})
            </span>
          </p>
        )}
        {rangeError && (
          <p className="w-full text-xs text-danger-600 dark:text-danger-400 mt-1" role="alert">
            {rangeError}
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-ink-500">Cargando estadísticas…</p>}
      {error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && data && !hasStats && (
        <EmptyState
          icon={BarChartIcon}
          title="Sin estadísticas en este rango"
          description="Elija un rango con órdenes o cobros para ver los exámenes más solicitados y el ingreso mensual."
        />
      )}
      {!loading && !error && data && hasStats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-paper-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">Exámenes más solicitados</h3>
            <div className="mt-3 h-64" data-testid="stats-top-chart">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 256 }}>
                <BarChart data={topData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-paper-200)" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} />
                  <Tooltip formatter={(value) => [formatCompact(Number(value)), 'Órdenes']} />
                  <Bar dataKey="cantidad" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="py-1.5">Examen</th>
                  <th className="py-1.5 text-right">Órdenes</th>
                  <th className="py-1.5 text-right">Ingreso Bs</th>
                </tr>
              </thead>
              <tbody>
                {data.top_examenes.map((exam) => (
                  <tr key={exam.examen_id} className="border-t border-paper-100">
                    <td className="py-1.5 font-medium text-ink-900">{exam.examen_nombre}</td>
                    <td className="py-1.5 text-right tabular-nums">{exam.cantidad}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatBs(exam.ingreso_bs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-paper-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">Ingreso mensual (Bs)</h3>
            <div className="mt-3 h-64" data-testid="stats-revenue-chart">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 256 }}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-paper-200)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} />
                  <Tooltip formatter={(value) => [formatBs(Number(value)), 'Ingreso Bs']} />
                  <Line
                    type="monotone"
                    dataKey="bs"
                    stroke="var(--color-primary-600)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              <TrendingUp size={14} />
              Comparado con el mes anterior: {formatBs(data.ingreso_mes_anterior_bs)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}