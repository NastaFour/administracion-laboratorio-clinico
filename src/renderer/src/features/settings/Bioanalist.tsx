import { useState } from 'react'
import { Save } from 'lucide-react'
import type { BioanalistaConfig } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useBioanalistaConfig } from './useSettings'

export function Bioanalist() {
  const { config, loading, error, save } = useBioanalistaConfig()
  const [form, setForm] = useState<BioanalistaConfig | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  // Initialize the editable draft once the server config arrives (render-phase
  // state adjustment — no cascading effect).
  if (!loading && !error && config && !form) {
    setForm(config)
  }

  if (loading || error || !form) {
    return (
      <>
        {loading && <p className="text-ink-500">Cargando datos del bioanalista…</p>}
        {!loading && error && <p className="text-danger-600" role="alert">{error}</p>}
      </>
    )
  }

  const update = (patch: Partial<BioanalistaConfig>): void => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleSave = async (): Promise<void> => {
    const result = await save(form)
    setFeedback(
      result.ok
        ? { ok: true, message: 'Datos del bioanalista guardados.' }
        : { ok: false, message: result.error },
    )
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-bioanalist">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Bioanalista responsable</h3>
        <p className="text-sm text-ink-500">
          Aparece en el bloque de firma de los reportes validados.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            feedback.ok ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Nombre completo"
          value={form.nombre}
          onChange={(e) => update({ nombre: e.target.value })}
          data-testid="bioanalist-nombre-input"
        />
        <Input
          label="Título"
          value={form.titulo}
          onChange={(e) => update({ titulo: e.target.value })}
        />
        <Input
          label="Registro MSDS"
          value={form.registro_msds ?? ''}
          onChange={(e) => update({ registro_msds: e.target.value || null })}
        />
        <Input
          label="Registro C.B.Z."
          value={form.registro_cbz ?? ''}
          onChange={(e) => update({ registro_cbz: e.target.value || null })}
        />
      </div>

      <Button onClick={() => void handleSave()} data-testid="bioanalist-save-button">
        <Save size={16} className="mr-2" />
        Guardar cambios
      </Button>
    </div>
  )
}
