import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { RESULT_TYPE } from '@/shared/contracts'
import type { Parameter, ParameterInput } from '@/shared/contracts'

interface ParamFormProps {
  param?: Parameter | null
  examenId: number
  onSaved: () => void
  onCancel: () => void
  onSubmit: (input: ParameterInput & { id?: number }) => Promise<{ ok: boolean; error?: string }>
}

const emptyForm: ParameterInput = {
  examen_id: 0,
  nombre: '',
  orden: 1,
  unidad: null,
  tipo_resultado: RESULT_TYPE.NUMERICO,
  opciones_cualitativas: null,
}

function paramToForm(param: Parameter | null | undefined): ParameterInput {
  if (!param) return emptyForm
  return {
    examen_id: param.examen_id,
    nombre: param.nombre,
    orden: param.orden,
    unidad: param.unidad,
    tipo_resultado: param.tipo_resultado,
    opciones_cualitativas: param.opciones_cualitativas,
  }
}

export function ParamForm({ param, examenId, onSaved, onCancel, onSubmit }: ParamFormProps) {
  const [form, setForm] = useState<ParameterInput>(() => ({
    ...paramToForm(param),
    examen_id: examenId,
  }))
  const formRef = useRef(form)
  const [errors, setErrors] = useState<Partial<Record<keyof ParameterInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  const validate = (current: ParameterInput): boolean => {
    const next: Partial<Record<keyof ParameterInput, string>> = {}
    if (current.nombre.trim().length < 1) next.nombre = 'El nombre es requerido.'
    if (current.orden < 0) next.orden = 'El orden no puede ser negativo.'
    if (current.tipo_resultado === RESULT_TYPE.CUALITATIVO) {
      const opts = current.opciones_cualitativas
      if (!opts || opts.length < 2 || opts.some((o) => !o.trim())) {
        next.opciones_cualitativas = 'Ingrese al menos dos opciones separadas por coma.'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const parseOptions = (value: string): string[] =>
    value
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const current = formRef.current
    if (!validate(current)) return

    setSubmitting(true)
    const result = await onSubmit({
      id: param?.id,
      examen_id: examenId,
      nombre: current.nombre.trim(),
      orden: Number(current.orden),
      unidad: current.unidad?.trim() || null,
      tipo_resultado: current.tipo_resultado,
      opciones_cualitativas:
        current.tipo_resultado === RESULT_TYPE.CUALITATIVO
          ? parseOptions(formRef.current.opciones_cualitativas?.join(',') ?? '')
          : null,
    })
    setSubmitting(false)

    if (result.ok) {
      onSaved()
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar el parámetro.')
    }
  }

  const update = <K extends keyof ParameterInput>(field: K, value: ParameterInput[K]) => {
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

      <Input
        label="Nombre"
        value={form.nombre}
        onChange={(e) => update('nombre', e.target.value)}
        placeholder="Hemoglobina"
        error={errors.nombre}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Orden"
          type="number"
          min={0}
          value={form.orden}
          onChange={(e) => update('orden', Number(e.target.value))}
          error={errors.orden}
        />
        <Input
          label="Unidad"
          value={form.unidad ?? ''}
          onChange={(e) => update('unidad', e.target.value || null)}
          placeholder="g/dL"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="tipo_resultado" className="block text-sm font-medium text-ink-700">
          Tipo de resultado
        </label>
        <select
          id="tipo_resultado"
          value={form.tipo_resultado}
          onChange={(e) => update('tipo_resultado', e.target.value as ParameterInput['tipo_resultado'])}
          className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value={RESULT_TYPE.NUMERICO}>Numérico</option>
          <option value={RESULT_TYPE.CUALITATIVO}>Cualitativo</option>
        </select>
      </div>

      {form.tipo_resultado === RESULT_TYPE.CUALITATIVO && (
        <Input
          label="Opciones cualitativas"
          value={form.opciones_cualitativas?.join(', ') ?? ''}
          onChange={(e) =>
            update('opciones_cualitativas', parseOptions(e.target.value))
          }
          placeholder="Positivo, Negativo"
          error={errors.opciones_cualitativas}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="param-form-submit">
          {submitting ? 'Guardando…' : param ? 'Actualizar parámetro' : 'Crear parámetro'}
        </Button>
      </div>
    </form>
  )
}
