import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Exam, ExamInput } from '@/shared/contracts'

interface ExamFormProps {
  exam?: Exam | null
  onSaved: () => void
  onCancel: () => void
  onSubmit: (input: ExamInput & { id?: number }) => Promise<{ ok: boolean; error?: string }>
}

const emptyForm: ExamInput = {
  codigo: '',
  nombre: '',
  categoria: '',
  tipo_muestra: '',
  precio: 0,
  tercerizado: false,
  proveedor: null,
}

function examToForm(exam: Exam | null | undefined): ExamInput {
  if (!exam) return emptyForm
  return {
    codigo: exam.codigo,
    nombre: exam.nombre,
    categoria: exam.categoria,
    tipo_muestra: exam.tipo_muestra,
    precio: exam.precio,
    tercerizado: exam.tercerizado,
    proveedor: exam.proveedor,
  }
}

export function ExamForm({ exam, onSaved, onCancel, onSubmit }: ExamFormProps) {
  const [form, setForm] = useState<ExamInput>(() => examToForm(exam))
  const formRef = useRef(form)
  const [errors, setErrors] = useState<Partial<Record<keyof ExamInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  const validate = (current: ExamInput): boolean => {
    const next: Partial<Record<keyof ExamInput, string>> = {}
    if (current.codigo.trim().length < 2) next.codigo = 'El código es requerido (mínimo 2 caracteres).'
    if (current.nombre.trim().length < 2) next.nombre = 'El nombre es requerido.'
    if (current.categoria.trim().length < 1) next.categoria = 'La categoría es requerida.'
    if (current.tipo_muestra.trim().length < 1) next.tipo_muestra = 'El tipo de muestra es requerido.'
    if (current.precio < 0) next.precio = 'El precio no puede ser negativo.'
    if (current.tercerizado && !current.proveedor?.trim()) {
      next.proveedor = 'El proveedor es requerido cuando el examen es tercerizado.'
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
      id: exam?.id,
      codigo: current.codigo.trim(),
      nombre: current.nombre.trim(),
      categoria: current.categoria.trim(),
      tipo_muestra: current.tipo_muestra.trim(),
      precio: Number(current.precio.toFixed(2)),
      tercerizado: current.tercerizado,
      proveedor: current.tercerizado ? (current.proveedor?.trim() ?? null) : null,
    })
    setSubmitting(false)

    if (result.ok) {
      onSaved()
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar el examen.')
    }
  }

  const update = <K extends keyof ExamInput>(field: K, value: ExamInput[K]) => {
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
          label="Código"
          value={form.codigo}
          onChange={(e) => update('codigo', e.target.value)}
          placeholder="HEM-01"
          error={errors.codigo}
          disabled={!!exam}
        />
        <Input
          label="Precio"
          type="number"
          min={0}
          step={0.01}
          value={form.precio}
          onChange={(e) => update('precio', Number(e.target.value))}
          placeholder="0.00"
          error={errors.precio}
        />
      </div>

      <Input
        label="Nombre"
        value={form.nombre}
        onChange={(e) => update('nombre', e.target.value)}
        placeholder="Hemograma Completo"
        error={errors.nombre}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Categoría"
          value={form.categoria}
          onChange={(e) => update('categoria', e.target.value)}
          placeholder="Hematología"
          error={errors.categoria}
        />
        <Input
          label="Tipo de muestra"
          value={form.tipo_muestra}
          onChange={(e) => update('tipo_muestra', e.target.value)}
          placeholder="Sangre"
          error={errors.tipo_muestra}
        />
      </div>

      <div className="rounded-md border border-paper-200 p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.tercerizado}
            onChange={(e) => update('tercerizado', e.target.checked)}
            className="h-4 w-4 rounded border-paper-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-ink-900">Examen tercerizado</span>
        </label>

        {form.tercerizado && (
          <Input
            label="Proveedor (dato interno)"
            value={form.proveedor ?? ''}
            onChange={(e) => update('proveedor', e.target.value)}
            placeholder="Lab Externo C.A."
            error={errors.proveedor}
          />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="exam-form-submit">
          {submitting ? 'Guardando…' : exam ? 'Actualizar examen' : 'Crear examen'}
        </Button>
      </div>
    </form>
  )
}
