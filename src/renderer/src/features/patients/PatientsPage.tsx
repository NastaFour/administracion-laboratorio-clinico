import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { usePatients } from './usePatients'
import { PatientList } from './PatientList'
import { PatientForm } from './PatientForm'
import { PatientHistory } from './PatientHistory'
import { PatientDossierModal } from './PatientDossierModal'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/useToast'
import type { Patient, PatientInput } from '@/shared/contracts'

export function PatientsPage() {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const { patients, loading, error, create, update, deactivate } = usePatients({ searchQuery })
  const [editing, setEditing] = useState<Patient | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null)
  const [dossierPatient, setDossierPatient] = useState<Patient | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Patient | null>(null)

  const handleCreate = async (input: PatientInput) => {
    const result = await create(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    toast.success('Paciente registrado exitosamente.')
    return { ok: true }
  }

  const handleUpdate = async (input: PatientInput) => {
    if (!editing) return { ok: false, error: 'No hay paciente seleccionado.' }
    const result = await update(editing.id, input)
    if (!result.ok) return { ok: false, error: result.error }
    setEditing(null)
    setShowForm(false)
    toast.success('Paciente actualizado exitosamente.')
    return { ok: true }
  }

  const confirmDeactivatePatient = async () => {
    if (!confirmDeactivate) return
    await deactivate(confirmDeactivate.id)
    toast.success('Paciente desactivado.')
    setConfirmDeactivate(null)
  }

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (patient: Patient) => {
    setEditing(patient)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900" data-testid="patients-heading">Pacientes</h2>
          <p className="text-sm text-ink-500">Busque, registre y gestione pacientes.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle size={18} className="mr-2" />
          Nuevo paciente
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="text-ink-500">Cargando pacientes…</p>}

      <PatientList
        patients={patients}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onEdit={openEdit}
        onDeactivate={setConfirmDeactivate}
        onHistory={setHistoryPatient}
        onDossier={setDossierPatient}
      />

      <Modal
        open={showForm}
        title={editing ? 'Editar paciente' : 'Nuevo paciente'}
        onClose={() => setShowForm(false)}
      >
        <PatientForm
          patient={editing}
          onSaved={() => {}}
          onCancel={() => setShowForm(false)}
          onSubmit={editing ? handleUpdate : handleCreate}
        />
      </Modal>

      <PatientHistory
        key={historyPatient?.id ?? 'none'}
        patient={historyPatient}
        open={!!historyPatient}
        onClose={() => setHistoryPatient(null)}
      />

      <PatientDossierModal
        key={dossierPatient?.id ?? 'dossier-none'}
        patient={dossierPatient}
        open={!!dossierPatient}
        onClose={() => setDossierPatient(null)}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Desactivar paciente"
        message={`¿Está seguro de desactivar a ${confirmDeactivate?.nombre} ${confirmDeactivate?.apellido}? Los datos y órdenes asociadas se conservan.`}
        confirmLabel="Desactivar"
        onConfirm={confirmDeactivatePatient}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  )
}

