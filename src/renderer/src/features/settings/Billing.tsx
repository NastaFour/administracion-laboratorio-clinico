import { useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import type { BcvRateEntry } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatBcvDate, mapConfigError, useBcvHistory } from './useSettings'

export function Billing() {
  const { history, loading, error, reloadHistory } = useBcvHistory()
  const [tasaInput, setTasaInput] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const activeRate: BcvRateEntry | null = history[0] ?? null

  const handleSetRate = async (): Promise<void> => {
    const tasa = Number(tasaInput)
    if (!tasaInput || Number.isNaN(tasa) || tasa <= 0) {
      setFeedback({ ok: false, message: 'Ingrese una tasa válida en bolívares por dólar.' })
      return
    }
    const result = await window.api.config.setBcvRate({ tasa })
    if (!result.ok) {
      setFeedback({ ok: false, message: mapConfigError(result.error.code) })
      return
    }
    setFeedback({ ok: true, message: `Tasa actualizada a ${tasa} Bs/USD.` })
    setTasaInput('')
    void reloadHistory()
  }

  return (
    <div className="space-y-6" data-testid="settings-billing">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Facturación y tasa BCV</h3>
        <p className="text-sm text-ink-500">
          Tasa del Banco Central de Venezuela usada para convertir pagos en dólares.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm max-w-xl ${
            feedback.ok ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-lg border border-paper-200 p-4 flex items-center justify-between max-w-xl">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500 font-semibold">Tasa activa</p>
          <p className="text-2xl font-bold text-ink-900 tabular-nums" data-testid="bcv-active-rate">
            {activeRate ? `${activeRate.tasa.toLocaleString('es-VE')} Bs/USD` : 'Sin tasa'}
          </p>
          {activeRate && (
            <p className="text-xs text-ink-500" data-testid="bcv-last-updated">
              Actualizada el {formatBcvDate(activeRate.actualizado_en)}
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={() => void reloadHistory()} aria-label="Actualizar tasa" data-testid="bcv-refresh-button">
          <RefreshCw size={16} />
        </Button>
      </div>

      <div className="flex items-end gap-3 max-w-xl">
        <Input
          label="Nueva tasa (Bs por USD)"
          type="number"
          step="any"
          min="0"
          value={tasaInput}
          onChange={(e) => setTasaInput(e.target.value)}
          placeholder="Ej: 950,00"
          className="flex-1"
          data-testid="bcv-rate-input"
        />
        <Button onClick={() => void handleSetRate()} data-testid="bcv-save-button">
          <Save size={16} className="mr-2" />
          Registrar tasa
        </Button>
      </div>

      <div className="max-w-xl">
        <p className="text-sm font-medium text-ink-700 mb-2">Historial de tasas</p>
        {loading ? (
          <p className="text-ink-500">Cargando historial…</p>
        ) : error ? (
          <p className="text-danger-600" role="alert">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-ink-500 text-sm">Aún no se ha registrado ninguna tasa.</p>
        ) : (
          <table className="w-full text-sm border border-paper-200 rounded-md overflow-hidden">
            <thead className="bg-paper-100 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium text-ink-700">Tasa (Bs/USD)</th>
                <th scope="col" className="px-3 py-2 font-medium text-ink-700">Fecha de actualización</th>
              </tr>
            </thead>
            <tbody data-testid="bcv-history-body">
              {history.map((entry, index) => (
                <tr
                  key={`${entry.actualizado_en}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-paper-50'}
                >
                  <td className="px-3 py-2 tabular-nums">{entry.tasa.toLocaleString('es-VE')}</td>
                  <td className="px-3 py-2 text-ink-600">{formatBcvDate(entry.actualizado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
