import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { maskCedula, maskPhone } from '../../lib/masks'
import type { Patient, PatientInput, Sex } from '@/shared/contracts'

interface PatientFormProps {
  patient?: Patient | null
  onSaved: () => void
  onCancel: () => void
  onSubmit: (input: PatientInput) => Promise<{ ok: boolean; error?: string }>
}

const emptyForm: PatientInput = {
  cedula: '',
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  sexo: 'M',
  telefono: '',
  email: '',
  direccion: '',
}

function patientToForm(patient: Patient | null | undefined): PatientInput {
  if (!patient) return emptyForm
  return {
    cedula: patient.cedula,
    nombre: patient.nombre,
    apellido: patient.apellido,
    fecha_nacimiento: patient.fecha_nacimiento,
    sexo: patient.sexo,
    telefono: patient.telefono ?? '',
    email: patient.email ?? '',
    direccion: patient.direccion ?? '',
  }
}

export function PatientForm({ patient, onSaved, onCancel, onSubmit }: PatientFormProps) {
  const [form, setForm] = useState<PatientInput>(() => patientToForm(patient))
  const formRef = useRef(form)
  const [errors, setErrors] = useState<Partial<Record<keyof PatientInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  const validate = (current: PatientInput): boolean => {
    const next: Partial<Record<keyof PatientInput, string>> = {}
    if (!/^V-\d+$/.test(current.cedula) && !/^E-\d+$/.test(current.cedula)) {
      next.cedula = 'Cédula inválida. Use V- o E- seguido de dígitos.'
    }
    if (current.nombre.trim().length < 2) next.nombre = 'El nombre es requerido.'
    if (current.apellido.trim().length < 2) next.apellido = 'El apellido es requerido.'
    if (!current.fecha_nacimiento) next.fecha_nacimiento = 'La fecha de nacimiento es requerida.'
    if (current.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) {
      next.email = 'Correo electrónico inválido.'
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
      apellido: current.apellido.trim(),
      telefono: current.telefono || null,
      email: current.email || null,
      direccion: current.direccion || null,
    })
    setSubmitting(false)

    if (result.ok) {
      onSaved()
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar el paciente.')
    }
  }

  const update = <K extends keyof PatientInput>(field: K, value: PatientInput[K]) => {
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
          label="Cédula"
          value={form.cedula}
          onChange={(e) => update('cedula', maskCedula(e.target.value))}
          placeholder="V-12345678"
          error={errors.cedula}
          disabled={!!patient}
        />
        <Input
          label="Teléfono"
          value={form.telefono ?? ''}
          onChange={(e) => update('telefono', maskPhone(e.target.value))}
          placeholder="0412-1234567"
          error={errors.telefono}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={(e) => update('nombre', e.target.value)}
          placeholder="Nombre"
          error={errors.nombre}
        />
        <Input
          label="Apellido"
          value={form.apellido}
          onChange={(e) => update('apellido', e.target.value)}
          placeholder="Apellido"
          error={errors.apellido}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={form.fecha_nacimiento}
          onChange={(e) => update('fecha_nacimiento', e.target.value)}
          error={errors.fecha_nacimiento}
        />
        <div className="space-y-1">
          <label htmlFor="sexo" className="block text-sm font-medium text-ink-700">
            Sexo
          </label>
          <select
            id="sexo"
            value={form.sexo}
            onChange={(e) => update('sexo', e.target.value as Sex)}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
      </div>

      <Input
        label="Correo electrónico"
        type="email"
        value={form.email ?? ''}
        onChange={(e) => update('email', e.target.value)}
        placeholder="paciente@ejemplo.com"
        error={errors.email}
      />

      <Input
        label="Dirección"
        value={form.direccion ?? ''}
        onChange={(e) => update('direccion', e.target.value)}
        placeholder="Dirección completa"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="patient-form-submit">
          {submitting ? 'Guardando…' : patient ? 'Actualizar paciente' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  )
}
