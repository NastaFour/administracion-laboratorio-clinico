import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadMigrationsFromDir, runMigrations } from '../migrations/runner'

export interface TestDb {
  db: Database.Database
  dbPath: string
  tmpDir: string
  cleanup: () => void
}

/**
 * Create a temporary database with migrations 001 and 002 applied.
 * The caller MUST call cleanup() after the test.
 */
export async function createTestDb(): Promise<TestDb> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labcore-repos-'))
  const dbPath = path.join(tmpDir, 'test.db')
  const backupsDir = path.join(tmpDir, 'backups')
  const migrationsDir = path.join(__dirname, '../migrations')
  const migrations = loadMigrationsFromDir(migrationsDir)
  await runMigrations(dbPath, migrations, backupsDir)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  return {
    db,
    dbPath,
    tmpDir,
    cleanup: (): void => {
      db.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    },
  }
}

export function createUser(db: Database.Database, username: string, role: string): number {
  const result = db
    .prepare(
      "INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo) VALUES (?, 'hash', ?, ?, 1)",
    )
    .run(username, `Nombre ${username}`, role)
  return Number(result.lastInsertRowid)
}

export function createPatient(db: Database.Database, cedula: string, nombre = 'Juan', apellido = 'Pérez'): number {
  const result = db
    .prepare(
      "INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, activo) VALUES (?, ?, ?, '1985-03-15', 'M', 1)",
    )
    .run(cedula, nombre, apellido)
  return Number(result.lastInsertRowid)
}

export function createExam(db: Database.Database, codigo: string, precio = 100): number {
  const result = db
    .prepare(
      "INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES (?, ?, 'Test', 'Sangre', ?, 1)",
    )
    .run(codigo, `Examen ${codigo}`, precio)
  return Number(result.lastInsertRowid)
}

export function createOrder(db: Database.Database, pacienteId: number, examenIds: number[]): number {
  const priceStmt = db.prepare('SELECT precio FROM examenes_catalogo WHERE id = ?')
  let total = 0
  const examPrices: Array<{ id: number; precio: number }> = []
  for (const examenId of examenIds) {
    const row = priceStmt.get(examenId) as { precio: number } | undefined
    const precio = row?.precio ?? 100
    total += precio
    examPrices.push({ id: examenId, precio })
  }
  const result = db
    .prepare(
      "INSERT INTO ordenes (paciente_id, estatus, observaciones, precio_total, estatus_pago) VALUES (?, 'Pendiente', '', ?, 'Pendiente')",
    )
    .run(pacienteId, total)
  const ordenId = Number(result.lastInsertRowid)
  const stmt = db.prepare(
    'INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, ?, 0)',
  )
  for (const exam of examPrices) {
    stmt.run(ordenId, exam.id, exam.precio)
  }
  return ordenId
}
