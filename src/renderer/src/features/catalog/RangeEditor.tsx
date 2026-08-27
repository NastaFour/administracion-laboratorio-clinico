import { useState } from 'react'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { useRanges } from './useCatalog'
import { AGE_UNIT, SEX, type ReferenceRange, type ReferenceRangeInput } from '@/shared/contracts'

interface RangeEditorProps {
  parametroId: number
  canManage: boolean
}

const emptyRange: ReferenceRangeInput = {
  parametro_id: 0,
  sexo: 'Ambos',
  edad_unidad: AGE_UNIT.ANIOS,
  edad_min: 0,
  edad_max: 99,
  valor_min: null,
  valor_max: null,
  interpretacion: null,
  valor_min_critico: null,
  valor_max_critico: null,
}

function rangeToInput(range: ReferenceRange): ReferenceRangeInput {
  return {
    parametro_id: range.parametro_id,
    sexo: range.sexo,
    edad_unidad: range.edad_unidad,
    edad_min: range.edad_min,
    edad_max: range.edad_max,
    valor_min: range.valor_min,
    valor_max: range.valor_max,
    interpretacion: range.interpretacion,
    valor_min_critico: range.valor_min_critico,
    valor_max_critico: range.valor_max_critico,
  }
}

const UNIT_LABELS: Record<string, string> = {
  [AGE_UNIT.DIAS]: 'días',
  [AGE_UNIT.MESES]: 'meses',
  [AGE_UNIT.ANIOS]: 'años',
}

function formatRange(range: ReferenceRange): string {
  const ageText = `${range.edad_min}–${range.edad_max} ${UNIT_LABELS[range.edad_unidad] ?? range.edad_unidad}`
  const valueText = [range.valor_min, range.valor_max]
    .map((v) => (v === null ? '—' : String(v)))
    .join(' – ')
  return `${ageText} · ${valueText}`
}

export function RangeEditor({ parametroId, canManage }: RangeEditorProps) {
  const { ranges, loading, error, saveRange, deactivateRange } = useRanges(parametroId)
  const [showForm, setShowForm] = useState(false)
  const [editingRange, setEditingRange] = useState<ReferenceRange | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<ReferenceRange | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingRange(null)
    setSubmitError(null)
    setShowForm(true)
  }

  const openEdit = (range: ReferenceRange) => {
    setEditingRange(range)
    setSubmitError(null)
    setShowForm(true)
  }

  const handleSubmit = async (input: ReferenceRangeInput & { id?: number }) => {
    setSubmitError(null)
    const result = await saveRange(input)
    if (result.ok) {
      setShowForm(false)
      setEditingRange(null)
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar el rango.')
    }
  }

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return
    await deactivateRange(confirmDeactivate.id)
    setConfirmDeactivate(null)
  }

  return (
    <div className="space-y-3 rounded-lg border border-paper-200 bg-paper-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink-900">Valores de referencia</h4>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <PlusCircle size={14} className="mr-1.5" />
            Agregar rango
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-3 py-2 text-sm" role="alert">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-ink-500">Cargando rangos…</p>}

      {ranges.length === 0 && !loading ? (
        <p className="text-sm text-ink-500">No hay rangos configurados para este parámetro.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-paper-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 text-ink-700">
              <tr>
                <th className="px-3 py-2 font-medium">Sexo</th>
                <th className="px-3 py-2 font-medium">Edad</th>
                <th className="px-3 py-2 font-medium">Rango</th>
                <th className="px-3 py-2 font-medium">Críticos</th>
                <th className="px-3 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {ranges.map((range) => (
                <tr key={range.id} className="bg-white hover:bg-paper-50">
                  <td className="px-3 py-2 text-ink-700">{range.sexo}</td>
                  <td className="px-3 py-2 text-ink-700">
                    {range.edad_min}–{range.edad_max} {UNIT_LABELS[range.edad_unidad] ?? range.edad_unidad}
                  </td>
                  <td className="px-3 py-2 text-ink-700">
                    {range.valor_min ?? '—'} – {range.valor_max ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-ink-700">
                    {range.valor_min_critico ?? '—'} / {range.valor_max_critico ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(range)}
                          aria-label="Editar rango"
                          title="Editar rango"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeactivate(range)}
                          aria-label="Desactivar rango"
                          title="Desactivar rango"
                        >
                          <Trash2 size={14} className="text-danger-600" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        title={editingRange ? 'Editar rango' : 'Nuevo rango'}
        onClose={() => setShowForm(false)}
      >
        <RangeForm
          parametroId={parametroId}
          range={editingRange}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          submitError={submitError}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Desactivar rango"
        message={`¿Está seguro de desactivar el rango ${confirmDeactivate ? formatRange(confirmDeactivate) : ''}?`}
        confirmLabel="Desactivar"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  )
}

interface RangeFormProps {
  parametroId: number
  range: ReferenceRange | null
  onSubmit: (input: ReferenceRangeInput & { id?: number }) => Promise<void>
  onCancel: () => void
  submitError: string | null
}

function RangeForm({ parametroId, range, onSubmit, onCancel, submitError }: RangeFormProps) {
  const [form, setForm] = useState<ReferenceRangeInput>(() =>
    range ? rangeToInput(range) : { ...emptyRange, parametro_id: parametroId },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ReferenceRangeInput, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const update = <K extends keyof ReferenceRangeInput>(field: K, value: ReferenceRangeInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const parseNumber = (value: string): number | null => {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }

  const validate = (current: ReferenceRangeInput): boolean => {
    const next: Partial<Record<keyof ReferenceRangeInput, string>> = {}
    if (current.edad_min < 0) next.edad_min = 'La edad mínima no puede ser negativa.'
    if (current.edad_max < current.edad_min) next.edad_max = 'La edad máxima debe ser mayor o igual a la mínima.'
    if (current.valor_min !== null && current.valor_max !== null && current.valor_max < current.valor_min) {
      next.valor_max = 'El valor máximo debe ser mayor o igual al mínimo.'
    }
    if (
      current.valor_min_critico !== null &&
      current.valor_max_critico !== null &&
      current.valor_max_critico < current.valor_min_critico
    ) {
      next.valor_max_critico = 'El crítico máximo debe ser mayor o igual al mínimo.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(form)) return
    setSubmitting(true)
    await onSubmit({
      id: range?.id,
      parametro_id: parametroId,
      sexo: form.sexo,
      edad_unidad: form.edad_unidad,
      edad_min: Number(form.edad_min),
      edad_max: Number(form.edad_max),
      valor_min: form.valor_min,
      valor_max: form.valor_max,
      interpretacion: form.interpretacion?.trim() || null,
      valor_min_critico: form.valor_min_critico,
      valor_max_critico: form.valor_max_critico,
    })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="sexo" className="block text-sm font-medium text-ink-700">
            Sexo
          </label>
          <select
            id="sexo"
            value={form.sexo}
            onChange={(e) => update('sexo', e.target.value as ReferenceRangeInput['sexo'])}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="Ambos">Ambos</option>
            <option value={SEX.MALE}>Masculino</option>
            <option value={SEX.FEMALE}>Femenino</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="edad_unidad" className="block text-sm font-medium text-ink-700">
            Unidad de edad
          </label>
          <select
            id="edad_unidad"
            value={form.edad_unidad}
            onChange={(e) => update('edad_unidad', e.target.value as ReferenceRangeInput['edad_unidad'])}
            className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value={AGE_UNIT.DIAS}>Días</option>
            <option value={AGE_UNIT.MESES}>Meses</option>
            <option value={AGE_UNIT.ANIOS}>Años</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Edad mínima"
          type="number"
          min={0}
          value={form.edad_min}
          onChange={(e) => update('edad_min', Number(e.target.value))}
          error={errors.edad_min}
        />
        <Input
          label="Edad máxima"
          type="number"
          min={0}
          value={form.edad_max}
          onChange={(e) => update('edad_max', Number(e.target.value))}
          error={errors.edad_max}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Valor mínimo"
          type="number"
          step="any"
          value={form.valor_min ?? ''}
          onChange={(e) => update('valor_min', parseNumber(e.target.value))}
          placeholder="Opcional"
        />
        <Input
          label="Valor máximo"
          type="number"
          step="any"
          value={form.valor_max ?? ''}
          onChange={(e) => update('valor_max', parseNumber(e.target.value))}
          placeholder="Opcional"
          error={errors.valor_max}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Crítico mínimo"
          type="number"
          step="any"
          value={form.valor_min_critico ?? ''}
          onChange={(e) => update('valor_min_critico', parseNumber(e.target.value))}
          placeholder="Opcional"
        />
        <Input
          label="Crítico máximo"
          type="number"
          step="any"
          value={form.valor_max_critico ?? ''}
          onChange={(e) => update('valor_max_critico', parseNumber(e.target.value))}
          placeholder="Opcional"
          error={errors.valor_max_critico}
        />
      </div>

      <Input
        label="Interpretación"
        value={form.interpretacion ?? ''}
        onChange={(e) => update('interpretacion', e.target.value || null)}
        placeholder="Ej: Reactivo / No reactivo"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : range ? 'Actualizar rango' : 'Crear rango'}
        </Button>
      </div>
    </form>
  )
}
