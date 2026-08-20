import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import type { Sample } from '@/shared/contracts'

const REJECT_REASONS = ['Hemólisis', 'Coágulo', 'Volumen insuficiente', 'Otro']

interface RejectProps {
  open: boolean
  sample: Sample | null
  onClose: () => void
  onReject: (id: number, motivo: string) => Promise<{ ok: boolean; error?: string }>
}

export function Reject({ open, sample, onClose, onReject }: RejectProps) {
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sample) return
    setError(null)
    setSubmitting(true)
    const result = await onReject(sample.id, motivo.trim())
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo rechazar la muestra.')
      return
    }
    onClose()
  }

  return (
    <Modal open={open} title={`Rechazar muestra - ${sample?.codigo ?? ''}`} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="reject-reason" className="block text-sm font-medium text-ink-700">
            Motivo de rechazo
          </label>
          <select
            id="reject-reason"
            value={REJECT_REASONS.includes(motivo) ? motivo : 'Otro'}
            onChange={(e) => setMotivo(e.target.value === 'Otro' ? '' : e.target.value)}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="reject-reason-other" className="block text-sm font-medium text-ink-700">
            Especifique
          </label>
          <textarea
            id="reject-reason-other"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo del rechazo"
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? 'Rechazando…' : 'Rechazar muestra'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
