import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useCatalog, useParameters } from './useCatalog'
import { ExamList } from './ExamList'
import { ExamForm } from './ExamForm'
import { ParamList } from './ParamList'
import { ParamForm } from './ParamForm'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useSessionStore } from '../../stores/useSessionStore'
import type { Exam, Parameter } from '@/shared/contracts'

const MANAGE_ROLES = ['admin', 'bioanalista']

export function CatalogPage() {
  const { session } = useSessionStore()
  const canManage = session ? MANAGE_ROLES.includes(session.rol) : false

  const [searchQuery, setSearchQuery] = useState('')
  const { exams, loading, error, refetch, saveExam, deactivateExam } = useCatalog()
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const {
    params,
    loading: paramsLoading,
    error: paramsError,
    refetch: refetchParams,
    saveParam,
    deactivateParam,
  } = useParameters(selectedExam?.id ?? null)

  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [showExamForm, setShowExamForm] = useState(false)
  const [confirmDeactivateExam, setConfirmDeactivateExam] = useState<Exam | null>(null)

  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [showParamForm, setShowParamForm] = useState(false)
  const [confirmDeactivateParam, setConfirmDeactivateParam] = useState<Parameter | null>(null)

  const handleSaveExam = async (input: Parameters<typeof saveExam>[0]) => {
    const result = await saveExam(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowExamForm(false)
    setEditingExam(null)
    return { ok: true }
  }

  const handleDeactivateExam = async () => {
    if (!confirmDeactivateExam) return
    await deactivateExam(confirmDeactivateExam.id)
    if (selectedExam?.id === confirmDeactivateExam.id) {
      setSelectedExam(null)
    }
    setConfirmDeactivateExam(null)
  }

  const handleSaveParam = async (input: Parameters<typeof saveParam>[0]) => {
    const result = await saveParam(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowParamForm(false)
    setEditingParam(null)
    return { ok: true }
  }

  const handleDeactivateParam = async () => {
    if (!confirmDeactivateParam) return
    await deactivateParam(confirmDeactivateParam.id)
    setConfirmDeactivateParam(null)
  }

  const openCreateExam = () => {
    setEditingExam(null)
    setShowExamForm(true)
  }

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam)
    setShowExamForm(true)
  }

  const openCreateParam = () => {
    setEditingParam(null)
    setShowParamForm(true)
  }

  const openEditParam = (param: Parameter) => {
    setEditingParam(param)
    setShowParamForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900" data-testid="catalog-heading">
            Catálogo de exámenes
          </h2>
          <p className="text-sm text-ink-500">Gestione exámenes, parámetros y precios.</p>
        </div>
        {canManage && (
          <Button onClick={openCreateExam}>
            <PlusCircle size={18} className="mr-2" />
            Nuevo examen
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="text-ink-500">Cargando catálogo…</p>}

      <ExamList
        exams={exams}
        searchQuery={searchQuery}
        selectedExam={selectedExam}
        onSearchChange={setSearchQuery}
        onSelect={setSelectedExam}
        onEdit={openEditExam}
        onDeactivate={setConfirmDeactivateExam}
        canManage={canManage}
      />

      {selectedExam && (
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-950">{selectedExam.nombre}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-600">
                {selectedExam.codigo} · {selectedExam.categoria} · {selectedExam.tipo_muestra}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void refetchParams()}>
              Recargar parámetros
            </Button>
          </div>

          {paramsError && (
            <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
              {paramsError}
            </div>
          )}
          {paramsLoading && <p className="text-ink-500">Cargando parámetros…</p>}

          <ParamList
            params={params}
            canManage={canManage}
            onAdd={openCreateParam}
            onEdit={openEditParam}
            onDeactivate={setConfirmDeactivateParam}
          />
        </div>
      )}

      <Modal
        open={showExamForm}
        title={editingExam ? 'Editar examen' : 'Nuevo examen'}
        onClose={() => setShowExamForm(false)}
      >
        <ExamForm
          exam={editingExam}
          onSaved={() => {
            setShowExamForm(false)
            void refetch()
          }}
          onCancel={() => setShowExamForm(false)}
          onSubmit={handleSaveExam}
        />
      </Modal>

      <Modal
        open={showParamForm}
        title={editingParam ? 'Editar parámetro' : 'Nuevo parámetro'}
        onClose={() => setShowParamForm(false)}
      >
        {selectedExam && (
          <ParamForm
            param={editingParam}
            examenId={selectedExam.id}
            canManage={canManage}
            onSaved={() => {
              setShowParamForm(false)
              void refetchParams()
            }}
            onCancel={() => setShowParamForm(false)}
            onSubmit={handleSaveParam}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivateExam}
        title="Desactivar examen"
        message={`¿Está seguro de desactivar ${confirmDeactivateExam?.nombre}? Los resultados históricos se conservan.`}
        confirmLabel="Desactivar"
        onConfirm={handleDeactivateExam}
        onCancel={() => setConfirmDeactivateExam(null)}
      />

      <ConfirmDialog
        open={!!confirmDeactivateParam}
        title="Desactivar parámetro"
        message={`¿Está seguro de desactivar ${confirmDeactivateParam?.nombre}? Los resultados históricos se conservan.`}
        confirmLabel="Desactivar"
        onConfirm={handleDeactivateParam}
        onCancel={() => setConfirmDeactivateParam(null)}
      />
    </div>
  )
}
