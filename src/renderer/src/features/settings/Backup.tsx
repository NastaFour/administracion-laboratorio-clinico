import { FolderArchive } from 'lucide-react'

/**
 * Focused backup screen shell (M13.3 split). Backup/restore/import/export
 * logic lands with the backup work unit — this screen keeps the settings
 * area structured without stubbing fake functionality.
 */
export function Backup() {
  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-backup">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Respaldo y restauración</h3>
        <p className="text-sm text-ink-500">
          Creación de respaldos, restauración y fusión de datos.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-paper-300 p-8 text-center">
        <FolderArchive size={32} className="mx-auto text-ink-400" aria-hidden />
        <p className="mt-3 text-sm text-ink-600 font-medium">Disponible en la próxima entrega</p>
        <p className="mt-1 text-sm text-ink-500">
          El módulo de respaldo automático, restauración validada e importación con resolución de
          conflictos se habilitará con la entrega de respaldos.
        </p>
      </div>
    </div>
  )
}
