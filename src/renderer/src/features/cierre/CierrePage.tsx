import { useEffect, useRef, useState } from 'react'
import { useCierre } from './useCierre'
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
  // Bumped on every Imprimir click: keying the print effect on this counter
  // (not on the HTML string) makes repeated clicks re-trigger printing even
  // when the receipt HTML is identical between clicks.
  const [printSeq, setPrintSeq] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { cierre, loading, error, run, print } = useCierre(fecha)

  const handleRun = () => {
    void run()
  }

  const handlePrint = async () => {
    // Print through a same-origin srcdoc iframe instead of window.open, which
    // is denied in this renderer (sandbox: true + deny-all window-open handler).
    const html = await print()
    if (!html) return
    setPrintHtml(html)
    setPrintSeq((s) => s + 1)
  }

  useEffect(() => {
    // Skip the initial mount and any run without pending HTML; printSeq alone
    // drives re-runs so every click prints, even with identical HTML.
    if (printSeq === 0 || printHtml === null) return
    const iframe = iframeRef.current
    if (!iframe) return

    const doPrint = () => {
      const win = iframe.contentWindow
      if (!win) return
      win.focus()
      win.print()
    }

    iframe.srcdoc = printHtml

    // If the frame already finished loading its document, print now;
    // otherwise wait for the load event so the receipt never prints blank.
    if (iframe.contentDocument?.readyState === 'complete') {
      doPrint()
      return
    }

    const onLoad = () => doPrint()
    iframe.addEventListener('load', onLoad, { once: true })
    return () => {
      iframe.removeEventListener('load', onLoad)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- printSeq alone triggers re-runs; printHtml is read as the latest pending HTML.
  }, [printSeq])

  return (
    <div className="space-y-6">
      <iframe
        ref={iframeRef}
        title="Cierre de caja"
        className="absolute h-0 w-0 border-0"
        tabIndex={-1}
        aria-hidden="true"
      />
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
