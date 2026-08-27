import { useState } from 'react'
import { Download, FolderArchive, HardDriveDownload, Upload, RefreshCw, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/Modal'
import type { ImportConflict } from '@/shared/contracts'
import { useBackups, useExportFlow, useImportFlow, type ConflictResolution, type ResolutionMap } from './useBackup'

const todayIso = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function conflictLabel(conflict: ImportConflict): string {
  if (conflict.tipo === 'paciente') {
    const nombre = conflict.local ? `${conflict.local.nombre} ${conflict.local.apellido}` : '(nuevo)'
    return `Paciente ${conflict.cedula} — ${nombre}`
  }
  return `Examen ${conflict.codigo} — ${conflict.local?.nombre ?? '(nuevo)'}`
}

/**
 * Backup / restore / import / export screen (WU14). Wires the settings
 * "Respaldo" tab to the real main-process services.
 */
export function BackupScreen() {
  const { backups, loading, error, reload, createBackup, restoreBackup } = useBackups()
  const { conflicts, previewing, error: importError, preview, apply } = useImportFlow()
  const { result, exporting, error: exportError, run: runExport } = useExportFlow()

  const [backupPath, setBackupPath] = useState('')
  const [restorePath, setRestorePath] = useState('')
  const [importPath, setImportPath] = useState('')
  const [resolutions, setResolutions] = useState<ResolutionMap>({})
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const [desde, setDesde] = useState(todayIso())
  const [hasta, setHasta] = useState(todayIso())
  const [formato, setFormato] = useState<'csv' | 'json'>('csv')
  const [passphrase, setPassphrase] = useState('')
  const [confirmRestorePath, setConfirmRestorePath] = useState<string | null>(null)

  const handleCreate = async (): Promise<void> => {
    const res = await createBackup(backupPath)
    setFeedback(
      res.ok ? { ok: true, message: 'Respaldo creado correctamente.' } : { ok: false, message: res.error },
    )
  }

  const handleRestore = async (filePath: string): Promise<void> => {
    const res = await restoreBackup(filePath)
    setFeedback(
      res.ok
        ? { ok: true, message: 'Restauración iniciada. La aplicación se reiniciará.' }
        : { ok: false, message: res.error },
    )
  }

  const handlePreview = async (): Promise<void> => {
    const res = await preview(importPath)
    if (res.ok) {
      const initial: ResolutionMap = {}
      for (const c of res.conflicts) initial[c.id] = 'skip'
      setResolutions(initial)
    } else {
      setFeedback({ ok: false, message: res.error })
    }
  }

  const handleApply = async (): Promise<void> => {
    const res = await apply(importPath, resolutions)
    setFeedback(
      res.ok ? { ok: true, message: 'Importación aplicada.' } : { ok: false, message: res.error },
    )
  }

  const handleExport = async (): Promise<void> => {
    await runExport({ desde, hasta, formato, passphrase: passphrase.trim() || null })
  }

  return (
    <div className="space-y-8 max-w-2xl" data-testid="backup-screen">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Respaldo y restauración</h3>
        <p className="text-sm text-ink-500">
          Respaldo completo, restauración validada, importación con resolución de conflictos y exportación.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          data-testid="backup-feedback"
          className={`rounded-md px-4 py-3 text-sm ${
            feedback.ok ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Crear respaldo */}
      <section className="space-y-3">
        <h4 className="font-medium text-ink-800 flex items-center gap-2">
          <HardDriveDownload size={16} /> Crear respaldo
        </h4>
        <div className="flex gap-2 items-end">
          <Input
            label="Ruta de destino (ej. D:\\respaldos\\labcore.db)"
            value={backupPath}
            onChange={(e) => setBackupPath(e.target.value)}
            placeholder="C:\\respaldo.db"
            data-testid="backup-path-input"
            className="flex-1"
          />
          <Button onClick={() => void handleCreate()} disabled={!backupPath.trim()} data-testid="backup-create-button">
            <FolderArchive size={16} className="mr-2" />
            Crear
          </Button>
        </div>
      </section>

      {/* Respaldos disponibles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-ink-800 flex items-center gap-2">
            <FolderArchive size={16} /> Respaldos disponibles
          </h4>
          <Button variant="ghost" size="sm" onClick={() => void reload()} data-testid="backup-refresh">
            <RefreshCw size={14} className="mr-1" />
            Actualizar
          </Button>
        </div>
        {loading && <p className="text-sm text-ink-500">Cargando respaldos…</p>}
        {!loading && error && <p className="text-sm text-danger-600" role="alert">{error}</p>}
        {!loading && !error && backups.length === 0 && (
          <p className="text-sm text-ink-500">No hay respaldos registrados.</p>
        )}
        {!loading && !error && backups.length > 0 && (
          <ul className="divide-y divide-paper-200 dark:divide-surface-border rounded-lg border border-paper-200 dark:border-surface-border" data-testid="backup-list">
            {backups.map((backup, idx) => (
              <li key={`${backup.path}-${backup.creado_en}-${idx}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink-800 dark:text-ink-950 font-medium">{backup.path}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-600">
                    {new Date(backup.creado_en).toLocaleString('es-VE')} · {backup.size_bytes} bytes
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmRestorePath(backup.path)}>
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 items-end">
          <Input
            label="Restaurar desde una ruta"
            value={restorePath}
            onChange={(e) => setRestorePath(e.target.value)}
            placeholder="C:\\respaldos\\labcore.db"
            data-testid="restore-path-input"
            className="flex-1"
          />
          <Button
            variant="danger"
            onClick={() => setConfirmRestorePath(restorePath)}
            disabled={!restorePath.trim()}
            data-testid="restore-button"
          >
            Restaurar
          </Button>
        </div>
      </section>

      {/* Importar */}
      <section className="space-y-3">
        <h4 className="font-medium text-ink-800 flex items-center gap-2">
          <Upload size={16} /> Importar / fusionar
        </h4>
        <div className="flex gap-2 items-end">
          <Input
            label="Archivo de importación (JSON)"
            value={importPath}
            onChange={(e) => setImportPath(e.target.value)}
            placeholder="C:\\respaldos\\importar.json"
            data-testid="import-path-input"
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => void handlePreview()}
            disabled={!importPath.trim() || previewing}
            data-testid="import-preview-button"
          >
            {previewing ? 'Analizando…' : 'Vista previa'}
          </Button>
        </div>
        {importError && <p className="text-sm text-danger-600" role="alert">{importError}</p>}
        {conflicts.length > 0 && (
          <div className="space-y-3 rounded-lg border border-paper-200 p-4" data-testid="conflict-list">
            <p className="text-sm font-medium text-ink-700">
              {conflicts.length} conflicto(s) detectado(s). Elija cómo resolver cada uno:
            </p>
            <ul className="space-y-2">
              {conflicts.map((conflict) => (
                <li key={conflict.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-700">{conflictLabel(conflict)}</span>
                  <select
                    value={resolutions[conflict.id] ?? 'skip'}
                    onChange={(e) =>
                      setResolutions((prev) => ({ ...prev, [conflict.id]: e.target.value as ConflictResolution }))
                    }
                    className="rounded-md border border-paper-300 px-2 py-1.5 text-sm"
                    data-testid={`resolution-${conflict.id}`}
                  >
                    <option value="skip">Omitir</option>
                    <option value="overwrite">Sobrescribir</option>
                    <option value="keepBoth">Mantener ambos</option>
                  </select>
                </li>
              ))}
            </ul>
            <Button onClick={() => void handleApply()} data-testid="import-apply-button">
              <Save size={16} className="mr-2" />
              Aplicar importación
            </Button>
          </div>
        )}
        {conflicts.length === 0 && !previewing && (
          <p className="text-xs text-ink-500">La previsualización muestra solo los registros duplicados.</p>
        )}
      </section>

      {/* Exportar */}
      <section className="space-y-3">
        <h4 className="font-medium text-ink-800 flex items-center gap-2">
          <Download size={16} /> Exportar datos
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} data-testid="export-desde" />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} data-testid="export-hasta" />
        </div>
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-ink-700" htmlFor="export-formato">
              Formato
            </label>
            <select
              id="export-formato"
              value={formato}
              onChange={(e) => setFormato(e.target.value as 'csv' | 'json')}
              className="rounded-md border border-paper-300 px-2 py-2 text-sm"
              data-testid="export-format"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <Input
            label="Contraseña (opcional, cifra el archivo)"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Solo para medios externos"
            className="flex-1"
          />
          <Button onClick={() => void handleExport()} disabled={exporting} data-testid="export-button">
            {exporting ? 'Exportando…' : 'Exportar'}
          </Button>
        </div>
        {exportError && <p className="text-sm text-danger-600" role="alert">{exportError}</p>}
        {result !== null && (
          <div className="space-y-2">
            <textarea
              readOnly
              value={result}
              rows={6}
              className="w-full rounded-md border border-paper-300 px-3 py-2 text-xs font-mono"
              data-testid="export-result"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadText(`exportacion-${desde}.${formato}`, result)}
            >
              <Download size={14} className="mr-1" />
              Descargar archivo
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmRestorePath !== null}
        title="Confirmar restauración de respaldo"
        message={`¿Está seguro de restaurar el respaldo desde "${confirmRestorePath}"? Esta acción reemplazará la base de datos actual y reiniciará la aplicación.`}
        confirmLabel="Restaurar y reiniciar"
        onConfirm={async () => {
          if (confirmRestorePath) {
            const p = confirmRestorePath
            setConfirmRestorePath(null)
            await handleRestore(p)
          }
        }}
        onCancel={() => setConfirmRestorePath(null)}
      />
    </div>
  )
}
