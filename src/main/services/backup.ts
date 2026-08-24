/**
 * WU14 — Backup, restore, import/merge and filtered export (M14.1–M14.5, A9).
 *
 * Pure main-process module (no Electron imports) so every branch runs under
 * Vitest with a temp-file database. Electron-specific side effects (the native
 * save dialog, `app.relaunch()` and the physical DB file swap) are injected
 * through the {@link RestoreDeps} parameter object so the IPC layer owns them
 * and tests can stub them.
 *
 * Security / correctness contract:
 *  - `backup:create` uses better-sqlite3 `.backup()` — a consistent WAL-safe
 *    snapshot, exported to a user-chosen path (USB-friendly).
 *  - `backup:restore` validates `schema_version` compatibility BEFORE any write,
 *    takes a preventive backup, then swaps the file and relaunches. An open DB
 *    is never hot-swapped (carry-over #1).
 *  - Import conflict resolution is skip / overwrite / keep-both; `overwrite`
 *    routes patients through the WU13 `mergePatientsOverwrite` transactional
 *    upsert (carry-over #2).
 *  - Encryption (A9) applies ONLY to external export: a passphrase on
 *    `export:filtered` yields an AES-256-GCM ciphertext; a null passphrase
 *    yields plaintext. Internal backups stay plaintext SQLite (carry-over #3).
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import type {
  Backup,
  ImportConflict,
  ImportFile,
  OrderWithExams,
  Session,
} from '@/shared/contracts'
import { ERROR_CODES, importFileSchema } from '@/shared/contracts'
import { writeAudit } from './audit'
import { createBackup, getSchemaVersion, listBackups } from '../repositories/backup'
import { createPatient, getPatient, getPatientByCedula, mergePatientsOverwrite } from '../repositories/patients'
import { createExam, getExam, getExamByCode, updateExam } from '../repositories/catalog'
import { listOrders } from '../repositories/orders'

// ---------------------------------------------------------------------------
// AES-256-GCM (A9) — external export encryption only
// ---------------------------------------------------------------------------

const AES_PREFIX = 'labcore-aes256gcm:v1:'

/** Derive a 256-bit key from a passphrase using a random salt. */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32)
}

/**
 * Encrypt a plaintext string with AES-256-GCM. The output is a self-describing
 * base64 payload (`salt | iv | authTag | ciphertext`) prefixed with a version
 * marker so {@link decryptExport} can reject foreign/malformed input.
 */
export function encryptExport(passphrase: string, plaintext: string): string {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = deriveKey(passphrase, salt)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return AES_PREFIX + Buffer.concat([salt, iv, authTag, ciphertext]).toString('base64')
}

/**
 * Decrypt an {@link encryptExport} payload. Throws on a wrong passphrase or a
 * malformed payload (GCM authentication failure).
 */
export function decryptExport(passphrase: string, encrypted: string): string {
  if (!encrypted.startsWith(AES_PREFIX)) {
    throw new Error('Formato de exportación cifrada no reconocido')
  }
  const payload = Buffer.from(encrypted.slice(AES_PREFIX.length), 'base64')
  if (payload.length < 44) {
    throw new Error('Exportación cifrada corrupta')
  }
  const salt = payload.subarray(0, 16)
  const iv = payload.subarray(16, 28)
  const authTag = payload.subarray(28, 44)
  const ciphertext = payload.subarray(44)
  const key = deriveKey(passphrase, salt)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// ---------------------------------------------------------------------------
// Backup (create / list)
// ---------------------------------------------------------------------------

/** Manual full backup (M14.1) to a user-chosen path via better-sqlite3 `.backup()`. */
export async function createBackupService(
  db: Database.Database,
  filePath: string,
  session: Session,
): Promise<Backup> {
  const backup = await createBackup(db, filePath)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'backup.creado',
    entidad: 'backup',
    entidad_id: null,
    despues: { path: backup.path, size_bytes: backup.size_bytes },
  })
  return backup
}

/** List the app's backup directory (automatic + preventive backups). */
export function listBackupsService(backupsDir: string): Backup[] {
  return listBackups(backupsDir)
}

// ---------------------------------------------------------------------------
// Restore (validated, preventive backup, relaunch)
// ---------------------------------------------------------------------------

export interface RestoreDeps {
  /** Absolute path of the live production database (target of the swap). */
  getDbPath: () => string
  /** Directory used for the preventive (pre-restore) backup snapshot. */
  resolveBackupsDir: () => string
  /** Physically replaces the live DB file (the connection must be closed first). */
  swapDatabase: (dbPath: string, backupPath: string) => void
  /** Restart the app so the restored file is opened fresh (never hot-swapped). */
  relaunch: () => void
}

/** Read the live DB's current schema version (MAX(version) on `schema_version`). */
export function getCurrentSchemaVersion(db: Database.Database): number {
  const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as {
    version: number | null
  }
  return row.version ?? 0
}

/**
 * Restore (replace) the live DB with a backup (M14.3).
 *
 * Order matters (carry-over #1):
 *  1. Validate the backup's `schema_version` BEFORE any write — a missing
 *     `schema_version` table (version 0) or a version newer than the running
 *     app is rejected with no side effects.
 *  2. Audit `backup.restaurado` into the live DB, then take a preventive backup
 *     so that snapshot carries the restore event for the audit trail.
 *  3. Swap the file and relaunch; the DB is never hot-swapped while open.
 */
export async function restoreBackupService(
  db: Database.Database,
  backupPath: string,
  session: Session,
  deps: RestoreDeps,
): Promise<void> {
  const currentVersion = getCurrentSchemaVersion(db)
  const backupVersion = getSchemaVersion(backupPath)

  if (backupVersion <= 0 || backupVersion > currentVersion) {
    throw new Error(ERROR_CODES.INCOMPATIBLE_SCHEMA_VERSION)
  }

  const backupsDir = deps.resolveBackupsDir()
  fs.mkdirSync(backupsDir, { recursive: true })
  const preventivePath = path.join(backupsDir, `preventive-restore-${Date.now()}.db`)

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'backup.restaurado',
    entidad: 'backup',
    entidad_id: null,
    despues: {
      backupPath,
      preventivePath,
      schemaVersion: backupVersion,
      currentVersion,
    },
  })

  // Preventive backup: snapshot the live DB (including the audit row above) so
  // the pre-restore state is recoverable and self-documenting.
  await db.backup(preventivePath)
  deps.swapDatabase(deps.getDbPath(), backupPath)
  deps.relaunch()
}

// ---------------------------------------------------------------------------
// Import / merge (M14.4)
// ---------------------------------------------------------------------------

function readImportFile(filePath: string): ImportFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  let raw: string
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch {
    throw new Error(ERROR_CODES.DB_ERROR)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(ERROR_CODES.VALIDATION_ERROR)
  }
  const result = importFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(ERROR_CODES.VALIDATION_ERROR)
  }
  return result.data
}

/**
 * Detect conflicts between an import file and the local DB. A conflict exists
 * when an incoming patient cédula or exam código already exists locally.
 * Non-conflicting records are not listed (they apply unconditionally).
 */
export function previewImportService(db: Database.Database, filePath: string): ImportConflict[] {
  const file = readImportFile(filePath)
  const conflicts: ImportConflict[] = []

  for (const incoming of file.pacientes) {
    const local = getPatientByCedula(db, incoming.cedula)
    if (local) {
      conflicts.push({ id: incoming.cedula, tipo: 'paciente', cedula: incoming.cedula, local, incoming })
    }
  }

  for (const incoming of file.examenes) {
    const local = getExamByCode(db, incoming.codigo)
    if (local) {
      conflicts.push({ id: incoming.codigo, tipo: 'examen', codigo: incoming.codigo, local, incoming })
    }
  }

  return conflicts
}

/** Append digits to a cédula until it no longer collides (keep-both). */
function disambiguateCedula(db: Database.Database, cedula: string): string {
  let candidate = cedula
  let i = 1
  while (getPatientByCedula(db, candidate)) {
    candidate = `${cedula}${i}`
    i += 1
  }
  return candidate
}

/** Append digits to an exam código until it no longer collides (keep-both). */
function disambiguateCodigo(db: Database.Database, codigo: string): string {
  let candidate = codigo
  let i = 1
  while (getExamByCode(db, candidate)) {
    candidate = `${codigo}${i}`
    i += 1
  }
  return candidate
}

/**
 * Apply an import/merge (M14.4) under ONE transaction. Each incoming record is
 * re-checked against the live DB so a stale preview can never corrupt data:
 *
 *  - no local conflict → insert
 *  - `overwrite` → patient routes through `mergePatientsOverwrite` (WU13),
 *    exam updates in place by código
 *  - `keepBoth` → insert as a new record with a disambiguated identity
 *  - `skip` (or missing resolution) → ignored
 *
 * The whole batch is audited `import.aplicado`.
 */
export function applyImportService(
  db: Database.Database,
  filePath: string,
  resolutions: Record<string, 'skip' | 'overwrite' | 'keepBoth'>,
  session: Session,
): void {
  const file = readImportFile(filePath)

  const apply = db.transaction(() => {
    for (const incoming of file.pacientes) {
      const local = getPatientByCedula(db, incoming.cedula)
      const resolution = local ? (resolutions[incoming.cedula] ?? 'skip') : 'insert'

      if (resolution === 'skip') continue
      if (resolution === 'overwrite') {
        mergePatientsOverwrite(db, [incoming])
        continue
      }
      if (resolution === 'keepBoth') {
        createPatient(db, { ...incoming, cedula: disambiguateCedula(db, incoming.cedula) })
        continue
      }
      createPatient(db, incoming)
    }

    for (const incoming of file.examenes) {
      const local = getExamByCode(db, incoming.codigo)
      const resolution = local ? (resolutions[incoming.codigo] ?? 'skip') : 'insert'

      if (resolution === 'skip') continue
      if (resolution === 'overwrite' && local) {
        updateExam(db, local.id, incoming)
        continue
      }
      if (resolution === 'keepBoth') {
        createExam(db, { ...incoming, codigo: disambiguateCodigo(db, incoming.codigo) })
        continue
      }
      createExam(db, incoming)
    }
  })

  apply()

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'import.aplicado',
    entidad: 'import',
    entidad_id: null,
    despues: {
      filePath,
      pacientes: file.pacientes.length,
      examenes: file.examenes.length,
      resolutions,
    },
  })
}

// ---------------------------------------------------------------------------
// Export filtered dataset (M14.5, A9)
// ---------------------------------------------------------------------------

export interface ExportRow {
  orden_id: number
  fecha: string
  paciente_cedula: string
  paciente_nombre: string
  examenes: string
  total_bs: number
  estatus: string
  anulada: boolean
}

function toExportRow(db: Database.Database, order: OrderWithExams): ExportRow {
  const patient = getPatient(db, order.paciente_id)
  const examNames = order.examenes
    .map((oe) => getExam(db, oe.examen_id)?.nombre ?? '')
    .filter(Boolean)
  return {
    orden_id: order.id,
    fecha: order.fecha,
    paciente_cedula: patient?.cedula ?? '',
    paciente_nombre: patient ? `${patient.nombre} ${patient.apellido}` : '',
    examenes: examNames.join(' | '),
    total_bs: order.total_bs,
    estatus: order.estatus,
    anulada: order.anulada,
  }
}

/** Build the filtered dataset for orders in [desde, hasta]. */
export function buildExportData(db: Database.Database, desde: string, hasta: string): ExportRow[] {
  const orders = listOrders(db, { desde, hasta })
  return orders.map((order) => toExportRow(db, order))
}

/** Serialize export rows to CSV (UTF-8 BOM + RFC-4180 quoting). */
export function rowsToCsv(rows: ExportRow[]): string {
  const header = [
    'orden_id',
    'fecha',
    'paciente_cedula',
    'paciente_nombre',
    'examenes',
    'total_bs',
    'estatus',
    'anulada',
  ]
  const escape = (value: string | number | boolean): string => {
    const text = String(value)
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.orden_id,
        row.fecha,
        row.paciente_cedula,
        row.paciente_nombre,
        row.examenes,
        row.total_bs,
        row.estatus,
        row.anulada,
      ]
        .map(escape)
        .join(','),
    )
  }
  return `\uFEFF${lines.join('\r\n')}`
}

/**
 * Filtered export (M14.5). CSV or JSON; when a passphrase is provided the
 * payload is AES-256-GCM encrypted (A9 — external media only). Audited
 * `export.generado`.
 */
export function exportFilteredService(
  db: Database.Database,
  req: { desde: string; hasta: string; formato: 'csv' | 'json'; passphrase: string | null },
  session: Session,
): string {
  const rows = buildExportData(db, req.desde, req.hasta)
  const plaintext = req.formato === 'csv' ? rowsToCsv(rows) : JSON.stringify(rows, null, 2)

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'export.generado',
    entidad: 'export',
    entidad_id: null,
    despues: {
      desde: req.desde,
      hasta: req.hasta,
      formato: req.formato,
      cifrado: req.passphrase !== null,
      filas: rows.length,
    },
  })

  if (req.passphrase !== null) {
    return encryptExport(req.passphrase, plaintext)
  }
  return plaintext
}
