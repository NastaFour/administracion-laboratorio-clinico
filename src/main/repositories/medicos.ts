import type Database from 'better-sqlite3'
import type { Medico, MedicoInput } from '@/shared/contracts'
import { toBoolean } from './helpers'

export function rowToMedico(row: Record<string, unknown>): Medico {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    cedula: (row.cedula as string | null | undefined) ?? null,
    especialidad: row.especialidad as string,
    telefono: (row.telefono as string | null | undefined) ?? null,
    activo: toBoolean(row.activo as number | null | undefined),
  }
}

export function listMedicos(db: Database.Database, activos = true): Medico[] {
  const rows = db
    .prepare('SELECT * FROM medicos_referentes WHERE (? = 0 OR activo = 1) ORDER BY nombre')
    .all(activos ? 1 : 0) as Array<Record<string, unknown>>
  return rows.map(rowToMedico)
}

export function getMedico(db: Database.Database, id: number): Medico | null {
  const row = db.prepare('SELECT * FROM medicos_referentes WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToMedico(row) : null
}

export function getMedicoByCedula(db: Database.Database, cedula: string): Medico | null {
  const row = db.prepare('SELECT * FROM medicos_referentes WHERE cedula = ?').get(cedula) as
    | Record<string, unknown>
    | undefined
  return row ? rowToMedico(row) : null
}

export function createMedico(db: Database.Database, input: MedicoInput): Medico {
  const result = db
    .prepare(
      `INSERT INTO medicos_referentes (nombre, cedula, especialidad, telefono, activo)
       VALUES (?, ?, ?, ?, 1)`,
    )
    .run(input.nombre, input.cedula, input.especialidad, input.telefono)
  const id = Number(result.lastInsertRowid)
  const medico = getMedico(db, id)
  if (!medico) {
    throw new Error('Medico was not created')
  }
  return medico
}

export function updateMedico(db: Database.Database, id: number, input: MedicoInput): Medico {
  db.prepare('UPDATE medicos_referentes SET nombre = ?, cedula = ?, especialidad = ?, telefono = ? WHERE id = ?').run(
    input.nombre,
    input.cedula,
    input.especialidad,
    input.telefono,
    id,
  )
  const medico = getMedico(db, id)
  if (!medico) {
    throw new Error('Medico not found after update')
  }
  return medico
}

export function deactivateMedico(db: Database.Database, id: number): Medico {
  db.prepare('UPDATE medicos_referentes SET activo = 0 WHERE id = ?').run(id)
  const medico = getMedico(db, id)
  if (!medico) {
    throw new Error('Medico not found after deactivation')
  }
  return medico
}
