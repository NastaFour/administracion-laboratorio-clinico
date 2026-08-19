import { ipcMain } from 'electron'
import type { z } from 'zod'
import type Database from 'better-sqlite3'
import type { ChannelName, Envelope, ErrorCode, Role, Session } from '@/shared/contracts'
import { ERROR_CODES, err, ok } from '@/shared/contracts'
import type { AuditInput } from '../services/audit'

export type HandlerFn<TReq, TRes> = (
  db: Database.Database,
  req: TReq,
  session: Session,
) => TRes | Promise<TRes>

export type PublicHandlerFn<TReq, TRes> = (db: Database.Database, req: TReq) => TRes | Promise<TRes>

export interface GuardDependencies {
  getSession: () => Session | null
  writeAudit: (db: Database.Database, input: AuditInput) => void
}

function isKnownErrorCode(message: string): message is ErrorCode {
  return Object.values(ERROR_CODES).includes(message as ErrorCode)
}

function errorToEnvelope(error: unknown): Envelope<never> {
  const message = error instanceof Error ? error.message : String(error)
  const code: ErrorCode = isKnownErrorCode(message) ? message : ERROR_CODES.DB_ERROR
  return err(code, message)
}

export function buildGuardedHandler<TReq, TRes>(
  db: Database.Database,
  channel: string,
  roles: Role[],
  schema: z.ZodType<TReq>,
  fn: HandlerFn<TReq, TRes>,
  deps: GuardDependencies,
): (event: unknown, raw: unknown) => Promise<Envelope<TRes>> {
  return async (_event, raw) => {
    const session = deps.getSession()
    if (!session) {
      return err(ERROR_CODES.PERMISSION_DENIED, 'Sesión no iniciada')
    }

    if (roles.length > 0 && !roles.includes(session.rol)) {
      deps.writeAudit(db, {
        usuario_id: session.userId,
        accion: 'permiso.denegado',
        entidad: 'usuario',
        entidad_id: session.userId,
        despues: { channel },
      })
      return err(ERROR_CODES.PERMISSION_DENIED, 'No tiene permiso para esta acción')
    }

    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return err(ERROR_CODES.VALIDATION_ERROR, parsed.error.message)
    }

    try {
      const result = await fn(db, parsed.data, session)
      return ok(result)
    } catch (error) {
      return errorToEnvelope(error)
    }
  }
}

export function buildPublicHandler<TReq, TRes>(
  db: Database.Database,
  _channel: string,
  schema: z.ZodType<TReq>,
  fn: PublicHandlerFn<TReq, TRes>,
): (event: unknown, raw: unknown) => Promise<Envelope<TRes>> {
  return async (_event, raw) => {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return err(ERROR_CODES.VALIDATION_ERROR, parsed.error.message)
    }

    try {
      const result = await fn(db, parsed.data)
      return ok(result)
    } catch (error) {
      return errorToEnvelope(error)
    }
  }
}

const defaultDeps: GuardDependencies = {
  getSession: (): Session | null => {
    throw new Error('Guard dependencies not configured')
  },
  writeAudit: (): void => {
    throw new Error('Guard dependencies not configured')
  },
}

let sharedDeps: GuardDependencies = defaultDeps

export function configureGuardDependencies(deps: GuardDependencies): void {
  sharedDeps = deps
}

export function handle<TReq, TRes>(
  db: Database.Database,
  channel: ChannelName,
  roles: Role[],
  schema: z.ZodType<TReq>,
  fn: HandlerFn<TReq, TRes>,
): void {
  const handler = buildGuardedHandler(db, channel, roles, schema, fn, sharedDeps)
  ipcMain.handle(channel, handler)
}

export function handlePublic<TReq, TRes>(
  db: Database.Database,
  channel: ChannelName,
  schema: z.ZodType<TReq>,
  fn: PublicHandlerFn<TReq, TRes>,
): void {
  const handler = buildPublicHandler(db, channel, schema, fn)
  ipcMain.handle(channel, handler)
}
