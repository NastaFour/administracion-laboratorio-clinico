import { useState } from 'react'
import { ImagePlus, Save } from 'lucide-react'
import type { LabConfig } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useLabConfig } from './useSettings'

const EMPTY_LOGO_ERROR = 'No se pudo cargar la imagen.'

export function Lab() {
  const { config, loading, error, save, setLogo } = useLabConfig()
  const [form, setForm] = useState<LabConfig | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  // Initialize the editable draft once the server config arrives. This is the
  // documented render-phase state adjustment (no cascading effect).
  if (!loading && !error && config && !form) {
    setForm(config)
  }

  if (loading || error || !form) {
    return (
      <>
        {loading && <p className="text-ink-500">Cargando configuración…</p>}
        {!loading && error && <p className="text-danger-600" role="alert">{error}</p>}
      </>
    )
  }

  const update = (patch: Partial<LabConfig>): void => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleSave = async (): Promise<void> => {
    const result = await save(form)
    setFeedback(
      result.ok
        ? { ok: true, message: 'Configuración guardada.' }
        : { ok: false, message: result.error },
    )
  }

  const handleLogoFile = (file: File | undefined): void => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError(EMPTY_LOGO_ERROR)
      return
    }
    // Read as a base64 data URI (N11.3): no filesystem paths ever reach config.
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUri.startsWith('data:image/')) {
        setLogoError(EMPTY_LOGO_ERROR)
        return
      }
      setLogoError(null)
      void setLogo(dataUri).then((result) => {
        if (result.ok) {
          setForm((prev) => (prev ? { ...prev, logo: dataUri } : prev))
          setFeedback({ ok: true, message: 'Logo actualizado.' })
        } else {
          setLogoError(result.error)
        }
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-lab">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Datos del laboratorio</h3>
        <p className="text-sm text-ink-500">
          Estos datos aparecen en el encabezado de los reportes impresos.
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
          label="Nombre del laboratorio"
          value={form.nombre}
          onChange={(e) => update({ nombre: e.target.value })}
          data-testid="lab-nombre-input"
        />
        <Input
          label="RIF"
          value={form.rif ?? ''}
          onChange={(e) => update({ rif: e.target.value || null })}
        />
        <Input
          label="Dirección"
          value={form.direccion ?? ''}
          onChange={(e) => update({ direccion: e.target.value || null })}
        />
        <Input
          label="Teléfono"
          value={form.telefono ?? ''}
          onChange={(e) => update({ telefono: e.target.value || null })}
        />
        <Input
          label="Correo"
          value={form.email ?? ''}
          onChange={(e) => update({ email: e.target.value || null })}
        />
      </div>

      <div className="rounded-lg border border-paper-200 p-4 space-y-3">
        <p className="text-sm font-medium text-ink-700">Logo del laboratorio</p>
        {form.logo && (
          <img src={form.logo} alt="Logo del laboratorio" className="h-16 w-auto" data-testid="logo-preview" />
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="logo-input"
            onChange={(e) => handleLogoFile(e.target.files?.[0])}
          />
          <span className="inline-flex items-center gap-2 rounded-md border border-paper-300 px-3 py-2 text-sm text-ink-700 hover:bg-paper-50 transition-colors">
            <ImagePlus size={16} />
            Cargar imagen…
          </span>
        </label>
        <p className="text-xs text-ink-500">
          La imagen se guarda dentro del sistema (no como archivo externo).
        </p>
        {logoError && <p className="text-sm text-danger-600">{logoError}</p>}
      </div>

      <Button onClick={() => void handleSave()} data-testid="lab-save-button">
        <Save size={16} className="mr-2" />
        Guardar cambios
      </Button>
    </div>
  )
}
