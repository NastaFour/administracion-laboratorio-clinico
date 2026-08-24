import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { backupChannels, ROLES, type Session } from '@/shared/contracts'
import { handle } from './register'
import { closeDatabase, getDefaultDbPath } from '../services/db'
import {
  applyImportService,
  createBackupService,
  exportFilteredService,
  listBackupsService,
  previewImportService,
  restoreBackupService,
  type RestoreDeps,
} from '../services/backup'

// Design role matrix: backup / merge / import / export are admin-only.
const ADMIN_ONLY = [ROLES.ADMIN]

/** Directory for automatic + preventive backups (mirrors prepareDatabase). */
function resolveBackupsDir(): string {
  return app.isPackaged ? path.join(app.getPath('userData'), 'backups') : path.resolve('backups')
}

export async function handleCreateBackup(
  db: Database.Database,
  req: { filePath: string },
  session: Session,
): Promise<ReturnType<typeof createBackupService>> {
  return createBackupService(db, req.filePath, session)
}

export function handleListBackups(): ReturnType<typeof listBackupsService> {
  return listBackupsService(resolveBackupsDir())
}

export async function handleRestoreBackup(
  db: Database.Database,
  req: { filePath: string },
  session: Session,
  deps?: Partial<RestoreDeps>,
): Promise<void> {
  return restoreBackupService(db, req.filePath, session, {
    getDbPath: deps?.getDbPath ?? (() => getDefaultDbPath()),
    resolveBackupsDir: deps?.resolveBackupsDir ?? (() => resolveBackupsDir()),
    swapDatabase:
      deps?.swapDatabase ??
      ((dbPath, backupPath) => {
        // The live connection must be closed before the file can be replaced
        // on Windows; the app relaunches and reopens it fresh (carry-over #1).
        closeDatabase()
        fs.copyFileSync(backupPath, dbPath)
      }),
    relaunch:
      deps?.relaunch ??
      (() => {
        app.relaunch()
        app.quit()
      }),
  })
}

export function handlePreviewImport(
  db: Database.Database,
  req: { filePath: string },
): ReturnType<typeof previewImportService> {
  return previewImportService(db, req.filePath)
}

export function handleApplyImport(
  db: Database.Database,
  req: { filePath: string; resolutions: Record<string, 'skip' | 'overwrite' | 'keepBoth'> },
  session: Session,
): void {
  applyImportService(db, req.filePath, req.resolutions, session)
}

export function handleExportFiltered(
  db: Database.Database,
  req: { desde: string; hasta: string; formato: 'csv' | 'json'; passphrase: string | null },
  session: Session,
): string {
  return exportFilteredService(db, req, session)
}

export function registerBackupHandlers(db: Database.Database): void {
  handle(db, 'backup:create', ADMIN_ONLY, backupChannels['backup:create'].request, handleCreateBackup)
  handle(db, 'backup:list', ADMIN_ONLY, backupChannels['backup:list'].request, handleListBackups)
  handle(db, 'backup:restore', ADMIN_ONLY, backupChannels['backup:restore'].request, handleRestoreBackup)
  handle(db, 'import:preview', ADMIN_ONLY, backupChannels['import:preview'].request, handlePreviewImport)
  handle(db, 'import:apply', ADMIN_ONLY, backupChannels['import:apply'].request, handleApplyImport)
  handle(db, 'export:filtered', ADMIN_ONLY, backupChannels['export:filtered'].request, handleExportFiltered)
  // backup:prune (Should) is deferred — not registered in WU14 scope.
}
