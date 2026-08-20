import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface RegisterProps {
  open: boolean
  ordenId: number | null
  onClose: () => void
  onRegister: (recoleccion_en?: string) => Promise<{ ok: boolean; error?: string }>
}

export function Register({ open, ordenId, onClose, onRegister }: RegisterProps) {
  const [recoleccionEn, setRecoleccionEn] = useState(() => toDateTimeLocal(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ordenId === null) return
    setError(null)
    const parsed = new Date(recoleccionEn)
    if (Number.isNaN(parsed.getTime())) {
      setError('Ingrese una fecha y hora de recolección válida.')
      return
    }
    setSubmitting(true)
    const iso = parsed.toISOString()
    const result = await onRegister(iso)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudieron registrar las muestras.')
      return
    }
    onClose()
  }

  return (
    <Modal open={open} title={`Registrar muestras - Orden #${ordenId ?? ''}`} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="recoleccion-en" className="block text-sm font-medium text-ink-700">
            Fecha y hora de recolección
          </label>
          <input
            id="recoleccion-en"
            type="datetime-local"
            value={recoleccionEn}
            onChange={(e) => setRecoleccionEn(e.target.value)}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Registrar muestras'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hour}:${minute}`
}
