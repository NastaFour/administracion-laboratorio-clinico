import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'
import type { Session } from '@/shared/contracts'
import { getUserCredentialsByUsername } from '../repositories/users'

const BCRYPT_COST = 12

let currentSession: Session | null = null

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
  return session
}

export function logout(): void {
  currentSession = null
}
