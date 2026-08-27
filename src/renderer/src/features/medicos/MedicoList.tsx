import { Edit2, Trash2 } from 'lucide-react'
import type { Medico } from '@/shared/contracts'

interface MedicoListProps {
  medicos: Medico[]
  canManage: boolean
  onEdit: (medico: Medico) => void
  onDeactivate: (medico: Medico) => void
}

export function MedicoList({ medicos, canManage, onEdit, onDeactivate }: MedicoListProps) {
  if (medicos.length === 0) {
    return (
      <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
        <p className="text-ink-500">No hay médicos registrados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
      <table className="w-full text-sm">
        <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Nombre</th>
            <th className="px-4 py-3 text-left font-medium">Especialidad</th>
            <th className="px-4 py-3 text-left font-medium">Cédula</th>
            <th className="px-4 py-3 text-left font-medium">Teléfono</th>
            {canManage && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-100 dark:divide-surface-border">
          {medicos.map((medico) => (
            <tr key={medico.id} className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-ink-900 dark:text-ink-950 font-medium">{medico.nombre}</td>
              <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{medico.especialidad}</td>
              <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{medico.cedula ?? '—'}</td>
              <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{medico.telefono ?? '—'}</td>
              {canManage && (
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onEdit(medico)}
                      className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                      aria-label={`Editar ${medico.nombre}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeactivate(medico)}
                      className="p-1.5 text-ink-500 hover:text-danger-600 hover:bg-danger-50 rounded-md transition-colors"
                      aria-label={`Desactivar ${medico.nombre}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
