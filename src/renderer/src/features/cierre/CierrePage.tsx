import { useState } from 'react'
import { useCierre } from './useCierre'
import { METHOD_LABELS, METHOD_OPTIONS } from '../payments/methods'
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CierrePage() {
  const [fecha, setFecha] = useState(todayIso())
  const { cierre, loading, error, run, print } = useCierre(fecha)

  const handleRun = () => {
    void run()
  }

  const handlePrint = async () => {
    const html = await print()
    if (!html) return
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="cierre-heading">
          Cierre de caja
        </h2>
        <p className="text-sm text-ink-500">Consolide los pagos del día por método, con totales Bs y USD.</p>
      </div>

      <div className="flex items-end gap-4">
        <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Button type="button" onClick={() => void handleRun()} disabled={loading} data-testid="cierre-run">
          {loading ? 'Procesando…' : 'Ejecutar cierre'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {cierre && (
        <div className="space-y-4" data-testid="cierre-summary">
          <div className="rounded-lg border border-paper-200 p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-ink-500">Total Bs</p>
                <p className="text-xl font-semibold text-ink-900 tabular-nums">{formatMoney(cierre.total_bs, 'Bs')}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Total USD</p>
                <p className="text-xl font-semibold text-ink-900 tabular-nums">{formatMoney(cierre.total_usd, 'USD')}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-paper-200">
                  <th className="py-2 pr-3">Método</th>
                  <th className="py-2 pr-3 text-right">Bs</th>
                  <th className="py-2 text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {METHOD_OPTIONS.map((method) => {
                  const row = cierre.detalle_por_metodo[method] ?? { bs: 0, usd: 0 }
                  return (
                    <tr key={method} className="border-b border-paper-100">
                      <td className="py-2 pr-3">{METHOD_LABELS[method]}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(row.bs, 'Bs')}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(row.usd, 'USD')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-ink-500">
              <p>Tasa BCV: Bs {cierre.tasa_bcv.toFixed(2)}</p>
              <p data-testid="cierre-rate-updated">Última actualización de la tasa: {formatDateTime(cierre.tasa_actualizado_en)}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => void handlePrint()} data-testid="cierre-print">
              Imprimir
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
