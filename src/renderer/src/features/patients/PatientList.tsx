import { Search, Edit, Trash2, History, ClipboardList } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import type { Patient } from '@/shared/contracts'

interface PatientListProps {
  patients: Patient[]
  searchQuery: string
  onSearchChange: (value: string) => void
  onEdit: (patient: Patient) => void
  onDeactivate: (patient: Patient) => void
  onHistory: (patient: Patient) => void
  onDossier?: (patient: Patient) => void
}

export function PatientList({
  patients,
  searchQuery,
  onSearchChange,
  onEdit,
  onDeactivate,
  onHistory,
  onDossier,
}: PatientListProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 z-10" size={18} />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por cédula, nombre o teléfono…"
          aria-label="Buscar pacientes"
          inputClassName="pl-10"
        />
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-8 text-center">
          <p className="text-ink-500 dark:text-ink-600">No se encontraron pacientes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Cédula</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-950">{patient.cedula}</td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-700">
                    {patient.nombre} {patient.apellido}
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{patient.telefono ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {onDossier && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDossier(patient)}
                          aria-label="Ver ficha 360°"
                          title="Ficha integral del paciente"
                          data-testid={`patient-dossier-${patient.id}`}
                        >
                          <ClipboardList size={16} className="text-primary-600 dark:text-primary-400" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onHistory(patient)}
                        aria-label="Ver historial"
                        title="Ver historial"
                      >
                        <History size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(patient)}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeactivate(patient)}
                        aria-label="Desactivar"
                        title="Desactivar"
                      >
                        <Trash2 size={16} className="text-danger-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

