import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { usePatients } from '../patients/usePatients'
import { useCatalog } from '../catalog/useCatalog'
import { useMedicos } from '../medicos/useMedicos'
import { cn } from '../../lib/cn'
import type { CreateOrderRequest, OrderWithExams, Patient } from '@/shared/contracts'

interface OrderFormProps {
  order?: OrderWithExams | null
  onSaved: () => void
  onCancel: () => void
  onSubmit: (input: CreateOrderRequest & { id?: number }) => Promise<{ ok: boolean; error?: string }>
}

interface FormState {
  selectedPatientId: number | null
  selectedExamIds: Set<number>
  medicoId: number | null
  observaciones: string
}

function orderToForm(order: OrderWithExams | null | undefined): FormState {
  if (!order) {
    return {
      selectedPatientId: null,
      selectedExamIds: new Set(),
      medicoId: null,
      observaciones: '',
    }
  }
  return {
    selectedPatientId: order.paciente_id,
    selectedExamIds: new Set(order.examenes.map((e) => e.examen_id)),
    medicoId: order.medico_id,
    observaciones: order.observaciones ?? '',
  }
}

function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount)
}

export function OrderForm({ order, onSaved, onCancel, onSubmit }: OrderFormProps) {
  const { patients, loading: patientsLoading } = usePatients({ searchQuery: '' })
  const { exams, loading: examsLoading } = useCatalog()
  const { medicos, loading: medicosLoading } = useMedicos()

  const [form, setForm] = useState<FormState>(() => orderToForm(order))
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === form.selectedPatientId) ?? null,
    [patients, form.selectedPatientId],
  )

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return patients
      .filter(
        (p) =>
          p.cedula.toLowerCase().includes(query) ||
          `${p.nombre} ${p.apellido}`.toLowerCase().includes(query) ||
          (p.telefono ?? '').toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [searchQuery, patients])

  const selectedExams = useMemo(
    () => exams.filter((e) => form.selectedExamIds.has(e.id)),
    [exams, form.selectedExamIds],
  )

  const computedTotal = useMemo(
    () => selectedExams.reduce((sum, exam) => sum + exam.precio, 0),
    [selectedExams],
  )

  const validate = (current: FormState): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!current.selectedPatientId) next.selectedPatientId = 'Seleccione un paciente.'
    if (current.selectedExamIds.size === 0) next.selectedExamIds = 'Seleccione al menos un examen.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate(form)) return

    const input: CreateOrderRequest & { id?: number } = {
      id: order?.id,
      paciente_id: form.selectedPatientId!,
      medico_id: form.medicoId,
      empresa_id: null,
      examenes: selectedExams.map((exam) => ({
        examen_id: exam.id,
        precio: exam.precio,
        tercerizado: exam.tercerizado,
        proveedor: exam.proveedor,
        comentario: null,
      })),
      observaciones: form.observaciones.trim() || null,
    }

    setSubmitting(true)
    const result = await onSubmit(input)
    setSubmitting(false)

    if (result.ok) {
      onSaved()
    } else {
      setSubmitError(result.error ?? 'No se pudo guardar la orden.')
    }
  }

  const toggleExam = (id: number) => {
    setForm((prev) => {
      const next = new Set(prev.selectedExamIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, selectedExamIds: next }
    })
  }

  const selectPatient = (patient: Patient) => {
    setForm((prev) => ({ ...prev, selectedPatientId: patient.id }))
    setSearchQuery('')
    setShowResults(false)
  }

  const isLoading = patientsLoading || examsLoading || medicosLoading

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {submitError && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {submitError}
        </div>
      )}

      {isLoading && <p className="text-ink-500 text-sm">Cargando datos…</p>}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink-700">Paciente</label>
        {selectedPatient && (
          <div className="rounded-md bg-primary-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">
              {selectedPatient.nombre} {selectedPatient.apellido}
            </span>
            <span className="ml-2 text-ink-500">{selectedPatient.cedula}</span>
            {!order && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, selectedPatientId: null }))}
                className="ml-3 text-primary-700 hover:text-primary-800 font-medium"
              >
                Cambiar
              </button>
            )}
          </div>
        )}
        {!selectedPatient && (
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Buscar por cédula, nombre o teléfono"
              aria-label="Buscar pacientes"
              error={errors.selectedPatientId}
              disabled={!!order}
            />
            {showResults && filteredPatients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-paper-200 bg-white shadow-lg max-h-60 overflow-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-paper-50 focus:bg-paper-50 focus:outline-none"
                  >
                    <span className="font-medium text-ink-900">
                      {patient.nombre} {patient.apellido}
                    </span>
                    <span className="ml-2 text-ink-500">{patient.cedula}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="medico" className="block text-sm font-medium text-ink-700">
          Médico referente
        </label>
        <select
          id="medico"
          value={form.medicoId ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, medicoId: e.target.value ? Number(e.target.value) : null }))}
          className="w-full rounded-md border border-paper-300 bg-white px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Sin médico referente</option>
          {medicos.map((medico) => (
            <option key={medico.id} value={medico.id}>
              {medico.nombre} — {medico.especialidad}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink-700">Exámenes</label>
        {errors.selectedExamIds && <p className="text-sm text-danger-600">{errors.selectedExamIds}</p>}
        <div className="max-h-60 overflow-auto rounded-md border border-paper-200 bg-white">
          {exams.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">No hay exámenes activos en el catálogo.</p>
          ) : (
            <ul className="divide-y divide-paper-100">
              {exams.map((exam) => {
                const selected = form.selectedExamIds.has(exam.id)
                return (
                  <li
                    key={exam.id}
                    className={cn(
                      'flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-paper-50',
                      selected && 'bg-primary-50',
                    )}
                    onClick={() => toggleExam(exam.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleExam(exam.id)}
                        className="h-4 w-4 rounded border-paper-300 text-primary-600 focus:ring-primary-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-900">{exam.nombre}</p>
                        <p className="text-xs text-ink-500">
                          {exam.codigo} · {exam.categoria}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-ink-700">{formatBs(exam.precio)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="observaciones" className="block text-sm font-medium text-ink-700">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          value={form.observaciones}
          onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
          rows={3}
          placeholder="Indicaciones clínicas, ayunas, etc."
          className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center justify-between rounded-md bg-paper-100 px-4 py-3">
        <span className="text-sm font-medium text-ink-700">Total estimado</span>
        <span className="text-lg font-bold text-primary-700">{formatBs(computedTotal)}</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} data-testid="order-form-submit">
          {submitting ? 'Guardando…' : order ? 'Actualizar orden' : 'Crear orden'}
        </Button>
      </div>
    </form>
  )
}
