import type Database from 'better-sqlite3'
import type { AuditAction, AuditEntity, AuditEntry, AuditFilters } from '@/shared/contracts'
import { toIsoString } from './helpers'

export function rowToAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    id: row.id as number,
    usuario_id: row.usuario_id as number,
    accion: row.accion as AuditAction,
    entidad: row.entidad as AuditEntity,
    entidad_id: (row.entidad_id as number | null | undefined) ?? null,
    antes: row.antes ? (JSON.parse(row.antes as string) as unknown) : null,
    despues: row.despues ? (JSON.parse(row.despues as string) as unknown) : null,
    creado_en: toIsoString(row.creado_en) ?? (row.creado_en as string),
  }
}

export function listAuditEntries(db: Database.Database, filters: AuditFilters = {}): AuditEntry[] {
  const conditions: string[] = []
  const values: unknown[] = []
  if (filters.usuarioId !== undefined) {
    conditions.push('usuario_id = ?')
    values.push(filters.usuarioId)
  }
  if (filters.accion !== undefined) {
    conditions.push('accion = ?')
    values.push(filters.accion)
  }
  if (filters.entidad !== undefined) {
    conditions.push('entidad = ?')
    values.push(filters.entidad)
  }
  if (filters.desde !== undefined) {
    conditions.push('date(creado_en, \'localtime\') >= ?')
    values.push(filters.desde)
  }
  if (filters.hasta !== undefined) {
    conditions.push('date(creado_en, \'localtime\') <= ?')
    values.push(filters.hasta)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM auditoria ${where} ORDER BY creado_en DESC`)
    .all(...values) as Array<Record<string, unknown>>
  return rows.map(rowToAuditEntry)
}

export function createAuditEntry(
  db: Database.Database,
  input: {
    usuario_id: number
    accion: AuditAction
    entidad: AuditEntity
    entidad_id?: number | null
    antes?: unknown
    despues?: unknown
  },
): AuditEntry {
  const result = db
    .prepare(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, antes, despues)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.usuario_id,
      input.accion,
      input.entidad,
      input.entidad_id ?? null,
      input.antes ? JSON.stringify(input.antes) : null,
      input.despues ? JSON.stringify(input.despues) : null,
    )
  const id = Number(result.lastInsertRowid)
  const entry = db.prepare('SELECT * FROM auditoria WHERE id = ?').get(id) as Record<string, unknown>
  return rowToAuditEntry(entry)
}
