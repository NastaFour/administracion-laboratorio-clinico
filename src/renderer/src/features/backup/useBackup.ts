import { useCallback, useEffect, useState } from 'react'
import type { Backup, ImportConflict } from '@/shared/contracts'

/** Plain-Spanish error mapping for the backup/import/export screens. */
export function mapBackupError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'Solo el administrador puede usar respaldo e importación.',
    NOT_FOUND: 'El archivo indicado no existe.',
    CONFLICT: 'La acción no puede completarse por un conflicto.',
    INCOMPATIBLE_SCHEMA_VERSION: 'El respaldo no es compatible con esta versión del sistema.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

export function useBackups() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const result = await window.api.backup.list()
      if (!result.ok) {
        setError(mapBackupError(result.error.code))
        return
      }
      setBackups(result.data)
    } catch {
      setError(mapBackupError('DB_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const createBackup = useCallback(async (filePath: string) => {
    const result = await window.api.backup.create({ filePath })
    if (!result.ok) {
      return { ok: false as const, error: mapBackupError(result.error.code) }
    }
    setBackups((prev) => [result.data, ...prev])
    return { ok: true as const, backup: result.data }
  }, [])

  const restoreBackup = useCallback(async (filePath: string) => {
    const result = await window.api.backup.restore({ filePath })
    if (!result.ok) {
      return { ok: false as const, error: mapBackupError(result.error.code) }
    }
    return { ok: true as const }
  }, [])

  return { backups, loading, error, reload, createBackup, restoreBackup }
}

export type ConflictResolution = 'skip' | 'overwrite' | 'keepBoth'
export type ResolutionMap = Record<string, ConflictResolution>

export function useImportFlow() {
  const [conflicts, setConflicts] = useState<ImportConflict[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useCallback(async (filePath: string) => {
    setPreviewing(true)
    try {
      const result = await window.api.import.preview({ filePath })
      if (!result.ok) {
        const message = mapBackupError(result.error.code)
        setError(message)
        setConflicts([])
        return { ok: false as const, error: message }
      }
      setConflicts(result.data)
      setError(null)
      return { ok: true as const, conflicts: result.data }
    } catch {
      const message = mapBackupError('DB_ERROR')
      setError(message)
      return { ok: false as const, error: message }
    } finally {
      setPreviewing(false)
    }
  }, [])

  const apply = useCallback(async (filePath: string, resolutions: ResolutionMap) => {
    const result = await window.api.import.apply({ filePath, resolutions })
    if (!result.ok) {
      return { ok: false as const, error: mapBackupError(result.error.code) }
    }
    setConflicts([])
    return { ok: true as const }
  }, [])

  return { conflicts, previewing, error, preview, apply }
}

export interface ExportRequest {
  desde: string
  hasta: string
  formato: 'csv' | 'json'
  passphrase: string | null
}

export function useExportFlow() {
  const [result, setResult] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (req: ExportRequest) => {
    setExporting(true)
    try {
      const res = await window.api.export.filtered(req)
      if (!res.ok) {
        const message = mapBackupError(res.error.code)
        setError(message)
        return { ok: false as const, error: message }
      }
      setResult(res.data)
      setError(null)
      return { ok: true as const, data: res.data }
    } catch {
      const message = mapBackupError('DB_ERROR')
      setError(message)
      return { ok: false as const, error: message }
    } finally {
      setExporting(false)
    }
  }, [])

  return { result, exporting, error, run }
}
