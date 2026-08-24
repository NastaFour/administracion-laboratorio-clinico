import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

/**
 * A single numbered migration.
 */
export interface Migration {
  version: number
  name: string
  sql: string
}

/**
 * Result returned after a successful migration run.
 */
export interface RunMigrationsResult {
  initialVersion: number
  finalVersion: number
  applied: Migration[]
  backupPath: string | null
}

/**
 * Options for {@link runMigrations}.
 */
export interface RunMigrationsOptions {
  /**
   * Invoked ONCE after the first successful migration run on a database
   * (i.e. only when at least one migration was applied). Receives the open
   * connection so callers can seed bootstrap data — e.g. the initial admin
   * user (task 5.2) — without a second connection or app-level code path.
   */
  onFirstMigration?: (db: Database.Database) => Promise<void> | void
}

/**
 * Migration failure codes.
 */
export type MigrationErrorCode = 'BACKUP_FAILED' | 'MIGRATION_FAILED' | 'RESTORE_FAILED'

/**
 * Typed error thrown when the migration runner cannot complete safely.
 * Includes the backup path so the caller can attempt manual recovery.
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly code: MigrationErrorCode,
    public readonly backupPath?: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

const SCHEMA_VERSION_DDL = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`

function ensureSchemaVersionTable(db: Database.Database): void {
  db.exec(SCHEMA_VERSION_DDL)
}

function getCurrentVersion(db: Database.Database): number {
  const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as {
    version: number | null
  }
  return row.version ?? 0
}

function isExistingV1Database(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'")
    .get() as { name: string } | undefined
  return row !== undefined
}

function recordMigration(db: Database.Database, migration: Migration): void {
  db
    .prepare(
      'INSERT INTO schema_version (version, nombre, aplicado_en) VALUES (?, ?, CURRENT_TIMESTAMP)',
    )
    .run(migration.version, migration.name)
}

/**
 * Load migrations from a directory.
 * Files must match `<version>_<name>.sql` and are returned sorted by version.
 */
export function loadMigrationsFromDir(migrationsDir: string): Migration[] {
  const entries = fs.readdirSync(migrationsDir)
  const migrations: Migration[] = []

  for (const entry of entries) {
    const match = entry.match(/^(\d+)_(.+)\.sql$/)
    if (!match) continue

    const version = Number.parseInt(match[1], 10)
    const name = match[2]
    const sql = fs.readFileSync(path.join(migrationsDir, entry), 'utf-8')
    migrations.push({ version, name, sql })
  }

  return migrations.sort((a, b) => a.version - b.version)
}

/**
 * Run pending migrations against a database file.
 *
 * - Creates `schema_version` if missing.
 * - Recognizes an existing v1 database and marks `001_baseline` applied without
 *   re-executing DDL.
 * - Takes a pre-migration backup before applying any pending migration.
 * - Applies each pending migration in its own transaction.
 * - Restores from backup and throws a typed `MigrationError` on failure.
 */
export async function runMigrations(
  dbPath: string,
  migrations: Migration[],
  backupsDir: string,
  options: RunMigrationsOptions = {},
): Promise<RunMigrationsResult> {
  const db = new Database(dbPath)
  let closed = false

  const closeDb = (): void => {
    if (!closed) {
      db.close()
      closed = true
    }
  }

  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')

    ensureSchemaVersionTable(db)
    const initialVersion = getCurrentVersion(db)

    let pending = migrations
      .filter((migration) => migration.version > initialVersion)
      .sort((a, b) => a.version - b.version)

    // Recognize an existing v1 database and skip the baseline DDL.
    if (
      initialVersion === 0 &&
      pending.length > 0 &&
      pending[0].version === 1 &&
      isExistingV1Database(db)
    ) {
      recordMigration(db, pending[0])
      pending = pending.slice(1)
    }

    if (pending.length === 0) {
      return {
        initialVersion,
        finalVersion: getCurrentVersion(db),
        applied: [],
        backupPath: null,
      }
    }

    const backupPath = path.join(backupsDir, `pre-migration-${Date.now()}.db`)

    try {
      fs.mkdirSync(backupsDir, { recursive: true })
      await db.backup(backupPath)
    } catch (error) {
      throw new MigrationError(
        `Failed to create pre-migration backup at ${backupPath}`,
        'BACKUP_FAILED',
        undefined,
        error,
      )
    }

    const applied: Migration[] = []

    try {
      for (const migration of pending) {
        const apply = db.transaction(() => {
          db.exec(migration.sql)
          recordMigration(db, migration)
        })
        apply()
        applied.push(migration)
      }
    } catch (error) {
      closeDb()

      try {
        fs.copyFileSync(backupPath, dbPath)
      } catch (restoreError) {
        throw new MigrationError(
          'Migration failed and the automatic restore from backup also failed. '
            + `Manual restore may be possible from ${backupPath}`,
          'RESTORE_FAILED',
          backupPath,
          restoreError,
        )
      }

      const lastApplied = applied.length > 0 ? applied[applied.length - 1].name : 'none'
      throw new MigrationError(
        `Migration failed after applying ${lastApplied}. `
          + `Original error: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_FAILED',
        backupPath,
        error,
      )
    }

    if (options.onFirstMigration && applied.length > 0) {
      try {
        await options.onFirstMigration(db)
      } catch (error) {
        throw new MigrationError(
          'Migrations applied but bootstrap seeding failed. '
            + `Backup from before the migration is at ${backupPath}`,
          'MIGRATION_FAILED',
          backupPath,
          error,
        )
      }
    }

    const finalVersion = getCurrentVersion(db)
    return { initialVersion, finalVersion, applied, backupPath }
  } finally {
    closeDb()
  }
}
