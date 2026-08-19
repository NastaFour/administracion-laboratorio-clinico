import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Medico, MedicoInput } from '@/shared/contracts'

interface MedicoFormProps {
  medico?: Medico | null
  onSaved: () => void
  onCancel: () => void
  onSubmit: (input: MedicoInput & { id?: number }) => Promise<{ ok: boolean; error?: string }>
}

const emptyForm: MedicoInput = {
  nombre: '',
  cedula: '',
  especialidad: '',
  telefono: '',
}

function medicoToForm(medico: Medico | null | undefined): MedicoInput {
  if (!medico) return emptyForm
  return {
    nombre: medico.nombre,
    cedula: medico.cedula ?? '',
    especialidad: medico.especialidad,
    telefono: medico.telefono ?? '',
  }
}

export function MedicoForm({ medico, onSaved, onCancel, onSubmit }: MedicoFormProps) {
  const [form, setForm] = useState<MedicoInput>(() => medicoToForm(medico))
  const formRef = useRef(form)
  const [errors, setErrors] = useState<Partial<Record<keyof MedicoInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  const validate = (current: MedicoInput): boolean => {
    const next: Partial<Record<keyof MedicoInput, string>> = {}
    if (current.nombre.trim().length < 2) next.nombre = 'El nombre es requerido.'
    if (current.especialidad.trim().length < 2) next.especialidad = 'La especialidad es requerida.'
    if (current.cedula && !/^V-\d+$/.test(current.cedula) && !/^E-\d+$/.test(current.cedula)) {
      next.cedula = 'Cédula inválida. Use V- o E- seguido de dígitos.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const current = formRef.current
    if (!validate(current)) return

    setSubmitting(true)
    const result = await onSubmit({
      ...current,
      nombre: current.nombre.trim(),
      especialidad: current.especialidad.trim(),
      cedula: current.cedula?.trim() || null,
      telefono: current.telefono?.trim() || null,
      id: medico?.id,
    })
    setSubmitting(false)

    if (result.ok) {
      onSaved()
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar el médico.')
    }
  }

  const update = <K extends keyof MedicoInput>(field: K, value: MedicoInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      formRef.current = next
      return next
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={(e) => update('nombre', e.target.value)}
          placeholder="Dr. Pérez"
          error={errors.nombre}
        />
        <Input
          label="Especialidad"
          value={form.especialidad}
          onChange={(e) => update('especialidad', e.target.value)}
          placeholder="Cardiología"
          error={errors.especialidad}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Cédula"
          value={form.cedula ?? ''}
          onChange={(e) => update('cedula', e.target.value)}
          placeholder="V-12345678"
          error={errors.cedula}
        />
        <Input
          label="Teléfono"
          value={form.telefono ?? ''}
          onChange={(e) => update('telefono', e.target.value)}
          placeholder="0412-1234567"
          error={errors.telefono}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="medico-form-submit">
          {submitting ? 'Guardando…' : medico ? 'Actualizar médico' : 'Crear médico'}
        </Button>
      </div>
    </form>
  )
}
