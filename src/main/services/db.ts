import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'

/**
 * Resolve the default SQLite database path.
 *
 * In development the DB lives at the repo root (`lab_clinical.db`) so it is
 * easy to inspect. In production it lives inside the Electron userData
 * directory. The Electron app object is evaluated lazily so this module can be
 * imported in `ELECTRON_RUN_AS_NODE=1` test environments without crashing.
 */
export function getDefaultDbPath(): string {
  try {
    const isDev = !app.isPackaged
    if (isDev) {
      return path.resolve('lab_clinical.db')
    }
    return path.join(app.getPath('userData'), 'lab_clinical.db')
  } catch {
    // Fallback for test runners that execute under ELECTRON_RUN_AS_NODE=1
    // without a full Electron app lifecycle.
    return path.resolve('lab_clinical.db')
  }
}

/**
 * Open a better-sqlite3 database with the LabCore pragmas.
 */
export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  return db
}

let database: Database.Database | null = null

/**
 * Main-process database singleton.
 *
 * Repository functions receive a `Database.Database` instance so tests can
 * inject temp-file databases. This singleton is only used by the production
 * main process bootstrap.
 */
export function getDatabase(): Database.Database {
  if (!database) {
    database = openDatabase(getDefaultDbPath())
  }
  return database
}

/**
 * Close the singleton database connection.
 */
export function closeDatabase(): void {
  if (database) {
    database.close()
    database = null
  }
}
