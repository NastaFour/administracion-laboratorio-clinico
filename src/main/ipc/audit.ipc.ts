import type Database from 'better-sqlite3'
import { ROLES, auditChannels, type AuditEntry, type AuditFilters } from '@/shared/contracts'
import { handle } from './register'
import { listAuditEntries } from '../repositories/audit'

// Role matrix (design): the audit viewer is admin-only (M12.3).
const ADMIN_ONLY = [ROLES.ADMIN]

/**
 * List audit entries filtered by actor/action/entity/date range (M12.3).
 * Read-only over the append-only `auditoria` store: the repository exposes no
 * UPDATE/DELETE paths, so the trail is immutable by construction (M12.4).
 */
export function handleListAudit(db: Database.Database, req: AuditFilters): AuditEntry[] {
  return listAuditEntries(db, req)
}

export function registerAuditHandlers(db: Database.Database): void {
  handle(db, 'audit:list', ADMIN_ONLY, auditChannels['audit:list'].request, handleListAudit)
}
