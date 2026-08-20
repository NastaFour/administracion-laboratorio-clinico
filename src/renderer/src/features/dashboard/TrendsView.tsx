import { useState } from 'react'
import { Activity, Search } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Patient } from '@/shared/contracts'
import { EmptyState } from '../../components/ui/EmptyState'
import { usePatientAnalytes, useTrends } from './useDashboard'

function formatFecha(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}` : iso
}

/**
 * View 4 — per-patient analyte trends (M10.4 Should): numeric result series
 * over time (WU9 records), rendered with recharts. Both pickers are fed by
 * real data (patient search + the patient's own analytes).
 */
export function TrendsView() {
  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [parametroId, setParametroId] = useState<number | null>(null)
  const analytes = usePatientAnalytes(patient?.id ?? null)
  const trend = useTrends(patient?.id ?? null, parametroId)

  const handlePatientSearch = async (query: string) => {
    setPatientQuery(query)
    if (query.trim().length === 0) {
      setPatientResults([])
      return
    }
    const result = await window.api.patients.search({ query: query.trim(), limit: 8 })
    if (result.ok) {
      setPatientResults(result.data)
    }
  }

  const pickPatient = (selected: Patient) => {
    setPatient(selected)
    setPatientQuery(`${selected.apellido}, ${selected.nombre}`)
    setPatientResults([])
    setParametroId(null)
  }

  const chartData = (trend.data?.puntos ?? []).map((point) => ({ ...point, fecha: formatFecha(point.fecha) }))

  return (
    <div className="space-y-4" data-testid="trends-view">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-paper-200 bg-white p-4">
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="trends-patient">
            Paciente
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="trends-patient"
              className="w-full rounded-md border border-paper-300 bg-white py-2 pl-8 pr-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none"
              placeholder="Cédula, nombre o apellido…"
              value={patientQuery}
              onChange={(event) => void handlePatientSearch(event.target.value)}
              data-testid="trends-patient-search"
            />
            {patientResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-paper-200 bg-white shadow-lg">
                {patientResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                      onClick={() => pickPatient(result)}
                    >
                      <span className="font-medium text-ink-900">
                        {result.apellido}, {result.nombre}
                      </span>
                      <span className="ml-2 text-xs text-ink-500">{result.cedula}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="trends-analyte">
            Análisis
          </label>
          <select
            id="trends-analyte"
            className="min-w-56 rounded-md border border-paper-300 bg-white px-3 py-2 text-sm text-ink-900"
            value={parametroId ?? ''}
            disabled={!patient || analytes.loading}
            onChange={(event) => setParametroId(event.target.value ? Number(event.target.value) : null)}
            data-testid="trends-analyte"
          >
            <option value="">{!patient ? 'Seleccione un paciente' : 'Seleccione un análisis…'}</option>
            {(analytes.data ?? []).map((analyte) => (
              <option key={analyte.parametro_id} value={analyte.parametro_id}>
                {analyte.parametro_nombre}
                {analyte.unidad ? ` (${analyte.unidad})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!patient && (
        <EmptyState
          icon={Activity}
          title="Seleccione un paciente"
          description="Busque un paciente para ver la evolución de sus análisis numéricos a lo largo del tiempo."
        />
      )}
      {patient && !parametroId && analytes.data && analytes.data.length === 0 && (
        <EmptyState
          icon={Activity}
          title="Este paciente no tiene análisis numéricos"
          description="Solo los resultados numéricos pueden graficarse como tendencia."
        />
      )}
      {patient && parametroId && trend.loading && <p className="text-sm text-ink-500">Cargando tendencia…</p>}
      {patient && parametroId && !trend.loading && trend.error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {trend.error}
        </div>
      )}
      {patient && parametroId && trend.data && trend.data.puntos.length === 0 && (
        <EmptyState
          icon={Activity}
          title="Sin resultados numéricos para este análisis"
          description="Cuando el paciente tenga resultados numéricos de este análisis, la serie aparecerá aquí."
        />
      )}
      {patient && parametroId && trend.data && trend.data.puntos.length > 0 && (
        <div className="rounded-lg border border-paper-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink-900">
            {trend.data.parametro_nombre} — {patient.apellido}, {patient.nombre}
          </h3>
          <div className="mt-3 h-72" data-testid="trends-chart">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 288 }}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-paper-200)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-600)' }} />
                <Tooltip formatter={(value) => [String(value), trend.data?.puntos[0]?.unidad ?? '']} />
                <Line type="monotone" dataKey="valor" stroke="var(--color-primary-600)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}