import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export interface BackupRecord {
  path: string
  creado_en: string
  size_bytes: number
}

export async function createBackup(db: DatabaseType, filePath: string): Promise<BackupRecord> {
  await db.backup(filePath)
  const stats = fs.statSync(filePath)
  return {
    path: filePath,
    creado_en: stats.mtime.toISOString(),
    size_bytes: stats.size,
  }
}

export function listBackups(backupsDir: string): BackupRecord[] {
  if (!fs.existsSync(backupsDir)) {
    return []
  }
  const entries = fs.readdirSync(backupsDir)
  const records: BackupRecord[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.db')) continue
    const fullPath = path.join(backupsDir, entry)
    const stats = fs.statSync(fullPath)
    records.push({
      path: fullPath,
      creado_en: stats.mtime.toISOString(),
      size_bytes: stats.size,
    })
  }
  return records.sort((a, b) => b.creado_en.localeCompare(a.creado_en))
}

export function getSchemaVersion(dbPath: string): number {
  const db = new Database(dbPath)
  try {
    const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as {
      version: number | null
    }
    return row.version ?? 0
  } finally {
    db.close()
  }
}

export async function restoreBackup(targetDbPath: string, backupPath: string): Promise<void> {
  await fs.promises.copyFile(backupPath, targetDbPath)
}
