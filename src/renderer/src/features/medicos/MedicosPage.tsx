import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useMedicos } from './useMedicos'
import { MedicoList } from './MedicoList'
import { MedicoForm } from './MedicoForm'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useSessionStore } from '../../stores/useSessionStore'
import type { Medico, MedicoInput } from '@/shared/contracts'

const MANAGE_ROLES = ['admin', 'bioanalista']

export function MedicosPage() {
  const { session } = useSessionStore()
  const canManage = session ? MANAGE_ROLES.includes(session.rol) : false

  const { medicos, loading, error, refetch, save, deactivate } = useMedicos()
  const [editing, setEditing] = useState<Medico | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Medico | null>(null)

  const handleSave = async (input: MedicoInput & { id?: number }) => {
    const result = await save(input)
    if (!result.ok) return { ok: false, error: result.error }
    setShowForm(false)
    setEditing(null)
    return { ok: true }
  }

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return
    await deactivate(confirmDeactivate.id)
    setConfirmDeactivate(null)
  }

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (medico: Medico) => {
    setEditing(medico)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900" data-testid="medicos-heading">
            Médicos referentes
          </h2>
          <p className="text-sm text-ink-500">Gestione los médicos que pueden referir órdenes.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <PlusCircle size={18} className="mr-2" />
            Nuevo médico
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="text-ink-500">Cargando médicos…</p>}

      <MedicoList
        medicos={medicos}
        canManage={canManage}
        onEdit={openEdit}
        onDeactivate={setConfirmDeactivate}
      />

      <Modal
        open={showForm}
        title={editing ? 'Editar médico' : 'Nuevo médico'}
        onClose={() => setShowForm(false)}
      >
        <MedicoForm
          medico={editing}
          onSaved={() => {
            setShowForm(false)
            void refetch()
          }}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSave}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Desactivar médico"
        message={`¿Está seguro de desactivar a ${confirmDeactivate?.nombre}? Ya no aparecerá en nuevas órdenes.`}
        confirmLabel="Desactivar"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  )
}
