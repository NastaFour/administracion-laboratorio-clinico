import { useState } from 'react'
import type { BcvRate, PaymentMethod, RecordPaymentRequest } from '@/shared/contracts'
import { PAYMENT_METHOD } from '@/shared/contracts'
import { METHOD_LABELS, METHOD_OPTIONS } from './methods'
import { todayLocalDateIso } from '../../lib/dates'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface PaymentRecordFormProps {
  ordenId: number
  rate: BcvRate | null
  onSubmit: (req: RecordPaymentRequest) => Promise<{ ok: boolean; error?: string }>
  onCancel: () => void
}

export function PaymentRecordForm({ ordenId, rate, onSubmit, onCancel }: PaymentRecordFormProps) {
  const [metodo, setMetodo] = useState<PaymentMethod>(PAYMENT_METHOD.EFECTIVO)
  const [montoBs, setMontoBs] = useState('')
  const [montoUsd, setMontoUsd] = useState('')
  const [referencia, setReferencia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const usdAmount = Number(montoUsd) || 0
  const bsAmount = Number(montoBs) || 0
  const usdEquivalentBs = rate && usdAmount > 0 ? usdAmount * rate.tasa : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (bsAmount <= 0 && usdAmount <= 0) {
      setError('Ingrese un monto en Bs o en USD.')
      return
    }
    if (usdAmount > 0 && !rate) {
      setError('Debe configurar la tasa BCV antes de registrar un pago en USD.')
      return
    }

    setSubmitting(true)
    const result = await onSubmit({
      orden_id: ordenId,
      cuenta_id: null,
      metodo,
      monto_bs: bsAmount,
      monto_usd: usdAmount,
      referencia: referencia.trim() || null,
      // Local business date (YYYY-MM-DD) — the contract rejects full ISO strings.
      fecha: todayLocalDateIso(),
    })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error ?? 'No se pudo registrar el pago.')
      return
    }
    setMontoBs('')
    setMontoUsd('')
    setReferencia('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="payment-form">
      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="payment-method" className="block text-sm font-medium text-ink-700">
          Método
        </label>
        <select
          id="payment-method"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
          className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {METHOD_OPTIONS.map((method) => (
            <option key={method} value={method}>
              {METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Monto Bs"
          type="number"
          min={0}
          step="0.01"
          value={montoBs}
          onChange={(e) => setMontoBs(e.target.value)}
          placeholder="0.00"
        />
        <Input
          label="Monto USD"
          type="number"
          min={0}
          step="0.01"
          value={montoUsd}
          onChange={(e) => setMontoUsd(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {usdAmount > 0 && rate && (
        <p className="text-sm text-ink-500" data-testid="usd-preview">
          Equivalente: Bs {(usdEquivalentBs).toFixed(2)} (tasa {rate.tasa})
        </p>
      )}

      <Input
        label="Referencia"
        value={referencia}
        onChange={(e) => setReferencia(e.target.value)}
        placeholder="Número de referencia (opcional)"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="payment-submit">
          {submitting ? 'Registrando…' : 'Registrar pago'}
        </Button>
      </div>
    </form>
  )
}
