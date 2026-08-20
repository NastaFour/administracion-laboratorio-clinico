import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import type { Sample, SampleStatus } from '@/shared/contracts'
import { SAMPLE_STATUS } from '@/shared/contracts'

// Manual transitions only: Resultada is set by the WU9 validation side effect,
// and Rechazada goes through the reject-with-reason flow (M6.4).
const MANUAL_STATUSES: SampleStatus[] = [SAMPLE_STATUS.RECOLECTADA, SAMPLE_STATUS.EN_PROCESO]

interface StatusProps {
  open: boolean
  sample: Sample | null
  onClose: () => void
  onUpdate: (id: number, estatus: SampleStatus, recoleccion_en?: string) => Promise<{ ok: boolean; error?: string }>
}

export function Status({ open, sample, onClose, onUpdate }: StatusProps) {
  const [estatus, setEstatus] = useState<SampleStatus>(SAMPLE_STATUS.RECOLECTADA)
  const [recoleccionEn, setRecoleccionEn] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sample) return
    setError(null)
    setSubmitting(true)
    const recoleccion = recoleccionEn ? new Date(recoleccionEn).toISOString() : undefined
    const result = await onUpdate(sample.id, estatus, recoleccion)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo actualizar el estatus.')
      return
    }
    onClose()
  }

  return (
    <Modal open={open} title={`Cambiar estatus - ${sample?.codigo ?? ''}`} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="sample-status" className="block text-sm font-medium text-ink-700">
            Estatus
          </label>
          <select
            id="sample-status"
            value={estatus}
            onChange={(e) => setEstatus(e.target.value as SampleStatus)}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {MANUAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-500">
            El estado «Resultada» se establece al validar los resultados. El rechazo se realiza con su motivo desde la
            acción de rechazo.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="status-recoleccion" className="block text-sm font-medium text-ink-700">
            Fecha y hora de recolección (opcional)
          </label>
          <input
            id="status-recoleccion"
            type="datetime-local"
            value={recoleccionEn}
            onChange={(e) => setRecoleccionEn(e.target.value)}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Actualizando…' : 'Actualizar estatus'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
