import { useState } from 'react'
import { useBcvRate, usePaymentsForOrder } from './usePayments'
import { PaymentRecordForm } from './Record'
import { PaymentList } from './List'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/useToast'
import type { RecordPaymentRequest } from '@/shared/contracts'

export function PaymentsPage() {
  const toast = useToast()
  const [ordenInput, setOrdenInput] = useState('')
  const [ordenId, setOrdenId] = useState<number | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  const { rate } = useBcvRate()
  const { payments, balance, loading, error, record, cancel } = usePaymentsForOrder(ordenId)

  const loadOrder = () => {
    const parsed = Number(ordenInput)
    if (Number.isInteger(parsed) && parsed > 0) {
      setOrdenId(parsed)
      setOrderError(null)
    } else {
      setOrderError('Ingrese un número de orden válido.')
    }
  }

  const handleSubmit = async (req: RecordPaymentRequest) => {
    const result = await record(req)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    toast.success('Pago registrado exitosamente.')
    return { ok: true }
  }

  const handleCancel = async () => {
    if (cancelId === null) return
    const result = await cancel(cancelId, motivo.trim() || 'Anulado por el cajero')
    setCancelId(null)
    setMotivo('')
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo anular el pago.')
    } else {
      toast.success('Pago anulado exitosamente.')
    }
    return result
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="payments-heading">
          Pagos
        </h2>
        <p className="text-sm text-ink-500">Registre pagos y consulte el saldo de cada orden.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-end gap-4">
          <Input
            label="Orden #"
            type="number"
            min={1}
            value={ordenInput}
            onChange={(e) => {
              setOrdenInput(e.target.value)
              if (orderError) setOrderError(null)
            }}
            placeholder="Ingrese el número de orden"
          />
          <Button type="button" variant="secondary" onClick={loadOrder}>
            Cargar
          </Button>
        </div>
        {orderError && (
          <p className="text-xs text-danger-600 dark:text-danger-400" role="alert">
            {orderError}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="text-ink-500">Cargando pagos…</p>}

      {ordenId !== null && (
        <>
          <PaymentList payments={payments} balance={balance} onCancel={(id) => setCancelId(id)} />

          <div className="flex justify-end">
            <Button onClick={() => setShowForm(true)}>Registrar pago</Button>
          </div>

          <Modal open={showForm} title={`Registrar pago — Orden #${ordenId}`} onClose={() => setShowForm(false)} size="md">
            <PaymentRecordForm
              ordenId={ordenId}
              rate={rate}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </Modal>
        </>
      )}

      <Modal open={cancelId !== null} title="Anular pago" onClose={() => setCancelId(null)} size="sm">
        <div className="space-y-4">
          <p className="text-ink-700">Registre el motivo de la anulación del pago.</p>
          <Input
            label="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la anulación"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleCancel()}>
              Anular pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
