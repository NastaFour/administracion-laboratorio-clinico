import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'
import type { Session } from '@/shared/contracts'
import { getUserCredentialsByUsername } from '../repositories/users'

const BCRYPT_COST = 12

/**
 * Idle timeout for the MAIN-process session watchdog (design A4). After this
 * long without authenticated activity the session singleton is invalidated, so
 * every guarded IPC call fails with PERMISSION_DENIED regardless of renderer
 * state — the renderer lock screen is UX only and not the security boundary.
 */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000

let currentSession: Session | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
let idleExpiryHandler: (() => void) | null = null

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function armIdleTimer(): void {
  clearIdleTimer()
  if (!currentSession) {
    return
  }
  idleTimer = setTimeout(() => {
    idleTimer = null
    expireSession()
  }, IDLE_TIMEOUT_MS)
}

/** Register the callback invoked when the idle watchdog invalidates the session. */
export function setIdleExpiryHandler(handler: (() => void) | null): void {
  idleExpiryHandler = handler
}

/** Record authenticated activity — re-arms the idle timer when a session exists. */
export function touchSession(): void {
  if (currentSession) {
    armIdleTimer()
  }
}

/** Invalidate the session immediately (idle expiry path) and notify once. */
export function expireSession(): void {
  clearIdleTimer()
  if (currentSession) {
    currentSession = null
    idleExpiryHandler?.()
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, await bcrypt.genSalt(BCRYPT_COST))
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getSession(): Session | null {
  return currentSession
}

export function setSession(session: Session | null): void {
  currentSession = session
  armIdleTimer()
}

export function requireSession(): Session {
  if (!currentSession) {
    throw new Error('No hay sesión activa')
  }
  return currentSession
}

export async function login(db: Database.Database, usuario: string, clave: string): Promise<Session> {
  const record = getUserCredentialsByUsername(db, usuario)
  if (!record) {
    throw new Error('Usuario o clave inválidos')
  }
  if (!record.activo) {
    throw new Error('Usuario o clave inválidos')
  }

  const valid = await comparePassword(clave, record.password_hash)
  if (!valid) {
    throw new Error('Usuario o clave inválidos')
  }

  db
    .prepare('UPDATE usuarios SET ultimo_acceso_en = CURRENT_TIMESTAMP, intentos_fallidos = 0 WHERE id = ?')
    .run(record.id)

  const session: Session = {
    userId: record.id,
    usuario: record.username,
    nombre: record.nombre_completo,
    rol: record.rol,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: record.debe_cambiar_clave === 1,
  }
  currentSession = session
  armIdleTimer()
  return session
}

export function logout(): void {
  clearIdleTimer()
  currentSession = null
}
