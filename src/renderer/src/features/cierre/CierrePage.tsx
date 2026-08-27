import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Printer,
  CheckCircle2,
  Receipt,
} from 'lucide-react'
import { useCierre, useCierreMetrics, useCierreHistory } from './useCierre'
import { METHOD_LABELS, METHOD_OPTIONS } from '../payments/methods'
import { todayLocalDateIso } from '../../lib/dates'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

function formatMoney(value: number, currency: 'Bs' | 'USD'): string {
  const formatted = value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'Bs' ? `Bs ${formatted}` : `$ ${formatted}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function CierrePage() {
  // Default to the LOCAL business day — never the UTC day from toISOString().
  const [fecha, setFecha] = useState(todayLocalDateIso())
  const [printHtml, setPrintHtml] = useState<string | null>(null)
  const [printSeq, setPrintSeq] = useState(0)

  const { cierre, loading: runningCierre, error: cierreError, run, print } = useCierre(fecha)
  const { metrics } = useCierreMetrics()
  const { history, loading: loadingHistory, refetch: refetchHistory } = useCierreHistory()

  const handleRun = async () => {
    const res = await run()
    if (res) {
      void refetchHistory()
    }
  }

  const triggerPrint = async (targetFecha?: string) => {
    const html = await print(targetFecha)
    if (!html) return
    setPrintHtml(html)
    setPrintSeq((s) => s + 1)
  }

  const handlePrintFrameLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget
    const win = frame.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  return (
    <div className="space-y-8">
      {/* Hidden iframe for printing receipt */}
      {printSeq > 0 && printHtml !== null && (
        <iframe
          key={printSeq}
          srcDoc={printHtml}
          onLoad={handlePrintFrameLoad}
          title="Cierre de caja"
          className="absolute h-0 w-0 border-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-950" data-testid="cierre-heading">
          Cierre de caja
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-600">
          Consolide los pagos del día por método, audite métricas acumuladas en vivo y revise el histórico de cierres.
        </p>
      </div>

      {/* 4 Métricas Acumuladas en Vivo (Día, Semana, Mes, Año) - M2 Requirement */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink-800 dark:text-ink-200 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-600 dark:text-primary-400" />
          Métricas de Recaudación en Vivo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
            <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
              <Clock size={14} className="text-primary-600 dark:text-primary-400" />
              Recaudado Hoy
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                {formatMoney(metrics?.dia.bs ?? 0, 'Bs')}
              </span>
              <span className="text-xs font-medium text-ink-500 dark:text-ink-600 tabular-nums">
                {formatMoney(metrics?.dia.usd ?? 0, 'USD')}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
            <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
              <Calendar size={14} className="text-success-600 dark:text-success-400" />
              Esta Semana (Lun–Dom)
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                {formatMoney(metrics?.semana.bs ?? 0, 'Bs')}
              </span>
              <span className="text-xs font-medium text-ink-500 dark:text-ink-600 tabular-nums">
                {formatMoney(metrics?.semana.usd ?? 0, 'USD')}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
            <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
              <Calendar size={14} className="text-warning-600 dark:text-warning-400" />
              Este Mes
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                {formatMoney(metrics?.mes.bs ?? 0, 'Bs')}
              </span>
              <span className="text-xs font-medium text-ink-500 dark:text-ink-600 tabular-nums">
                {formatMoney(metrics?.mes.usd ?? 0, 'USD')}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
            <div className="flex items-center gap-2 text-ink-500 dark:text-ink-600 text-xs font-medium uppercase tracking-wider">
              <DollarSign size={14} className="text-primary-700 dark:text-primary-300" />
              Este Año
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                {formatMoney(metrics?.anio.bs ?? 0, 'Bs')}
              </span>
              <span className="text-xs font-medium text-ink-500 dark:text-ink-600 tabular-nums">
                {formatMoney(metrics?.anio.usd ?? 0, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Acción Principal: Ejecutar Cierre Diario */}
      <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-6 shadow-xs space-y-6">
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-950 flex items-center gap-2">
          <Receipt size={18} className="text-primary-600 dark:text-primary-400" />
          Ejecutar Cierre Diario
        </h3>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-52">
            <Input
              label="Fecha de Cierre"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleRun()}
            disabled={runningCierre}
            data-testid="cierre-run"
            className="gap-2"
          >
            <CheckCircle2 size={16} />
            {runningCierre ? 'Procesando…' : 'Ejecutar cierre'}
          </Button>
        </div>

        {cierreError && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {cierreError}
          </div>
        )}

        {/* Resumen del Cierre Ejecutado */}
        {cierre && (
          <div className="space-y-4 rounded-lg border border-paper-200 dark:border-surface-border p-5 bg-paper-50/50 dark:bg-surface-card/50" data-testid="cierre-summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-paper-200 dark:border-surface-border">
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-600 uppercase tracking-wider">
                  Total Bs
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                  {formatMoney(cierre.total_bs, 'Bs')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-600 uppercase tracking-wider">
                  Total USD
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-950 tabular-nums">
                  {formatMoney(cierre.total_usd, 'USD')}
                </p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-600 dark:text-ink-400 border-b border-paper-200 dark:border-surface-border text-xs uppercase">
                  <th className="py-2 pr-3">Método</th>
                  <th className="py-2 pr-3 text-right">Bs</th>
                  <th className="py-2 text-right">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-100 dark:divide-surface-border">
                {METHOD_OPTIONS.map((method) => {
                  const row = cierre.detalle_por_metodo[method] ?? { bs: 0, usd: 0 }
                  return (
                    <tr key={method} className="hover:bg-paper-100/30 dark:hover:bg-surface-hover transition-colors">
                      <td className="py-2 pr-3 font-medium text-ink-900 dark:text-ink-950">
                        {METHOD_LABELS[method]}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-800 dark:text-ink-300">
                        {formatMoney(row.bs, 'Bs')}
                      </td>
                      <td className="py-2 text-right tabular-nums text-ink-800 dark:text-ink-300">
                        {formatMoney(row.usd, 'USD')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-4 pt-4 border-t border-paper-200 dark:border-surface-border text-xs text-ink-500 dark:text-ink-600 flex flex-wrap justify-between items-center gap-2">
              <div>
                <p>Tasa BCV aplicable: Bs {cierre.tasa_bcv.toFixed(2)}</p>
                <p data-testid="cierre-rate-updated">
                  Última actualización de la tasa: {formatDateTime(cierre.tasa_actualizado_en)}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void triggerPrint()}
                data-testid="cierre-print"
                className="gap-2"
              >
                <Printer size={15} />
                Imprimir ticket
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Cierres de Caja Guardados en SQLite */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-950 flex items-center gap-2">
          <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
          Historial de Cierres de Caja
        </h3>

        {loadingHistory ? (
          <div className="p-8 text-center text-ink-500 dark:text-ink-600">Cargando historial…</div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-8 text-center space-y-1">
            <p className="text-ink-700 dark:text-ink-300 font-medium">Aún no hay cierres registrados</p>
            <p className="text-xs text-ink-500 dark:text-ink-600">
              Ejecute el cierre diario para consolidar la caja y guardar el snapshot permanente.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Monto Bs</th>
                    <th className="px-4 py-3 text-right">Monto USD</th>
                    <th className="px-4 py-3 text-right">Tasa BCV</th>
                    <th className="px-4 py-3">Cerrado por</th>
                    <th className="px-4 py-3">Desglose</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-ink-900 dark:text-ink-950 text-xs">
                        {item.fecha}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-ink-900 dark:text-ink-950">
                        {formatMoney(item.total_bs, 'Bs')}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-ink-900 dark:text-ink-950">
                        {formatMoney(item.total_usd, 'USD')}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-xs text-ink-600 dark:text-ink-400">
                        {item.tasa_bcv ? `Bs ${item.tasa_bcv.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-700 dark:text-ink-300">
                        {item.cerrado_por}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(item.detalle_por_metodo).map(([metodo, values]) => {
                            if (values.bs === 0 && values.usd === 0) return null
                            return (
                              <span
                                key={metodo}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-paper-100 dark:bg-paper-100/40 text-ink-700 dark:text-ink-300"
                              >
                                {metodo}: {values.bs > 0 ? `Bs ${values.bs}` : `$${values.usd}`}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void triggerPrint(item.fecha)}
                          className="text-xs h-7 px-2 gap-1"
                          title="Reimprimir ticket de este cierre"
                        >
                          <Printer size={13} />
                          Reimprimir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
