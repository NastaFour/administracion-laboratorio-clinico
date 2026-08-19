import type Database from 'better-sqlite3'
import type { AuditAction, AuditEntity } from '@/shared/contracts'
import { createAuditEntry } from '../repositories/audit'

export interface AuditInput {
  usuario_id: number
  accion: AuditAction
  entidad: AuditEntity
  entidad_id?: number | null
  antes?: unknown
  despues?: unknown
}

/**
 * Append-only audit writer.
 * Every clinical, payment, config, user-management, print, and export/import
 * action is recorded through this single entry point.
 */
export function writeAudit(db: Database.Database, input: AuditInput): void {
  createAuditEntry(db, {
    usuario_id: input.usuario_id,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidad_id ?? null,
    antes: input.antes,
    despues: input.despues,
  })
}
