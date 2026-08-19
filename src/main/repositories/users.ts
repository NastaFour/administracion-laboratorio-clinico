import type Database from 'better-sqlite3'
import type { CreateUserRequest, UpdateUserRequest, User } from '@/shared/contracts'
import { toBoolean } from './helpers'

interface UserRecord {
  id: number
  username: string
  nombre_completo: string
  rol: User['rol']
  activo: number
  debe_cambiar_clave: number
  ultimo_acceso_en: string | null
  password_hash: string
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    usuario: row.username as string,
    nombre: row.nombre_completo as string,
    rol: row.rol as User['rol'],
    activo: toBoolean(row.activo as number | null | undefined),
    debe_cambiar_clave: toBoolean(row.debe_cambiar_clave as number | null | undefined),
    ultimo_acceso_en: row.ultimo_acceso_en ? new Date(row.ultimo_acceso_en as string).toISOString() : null,
  }
}

export function getUserByUsername(db: Database.Database, username: string): User | null {
  const row = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username) as
    | Record<string, unknown>
    | undefined
  return row ? rowToUser(row) : null
}

export function getUserCredentialsByUsername(
  db: Database.Database,
  username: string,
): Omit<UserRecord, 'ultimo_acceso_en'> | null {
  const row = db
    .prepare(
      `SELECT id, username, password_hash, nombre_completo, rol, activo, debe_cambiar_clave
       FROM usuarios WHERE username = ?`,
    )
    .get(username) as Record<string, unknown> | undefined
  if (!row) {
    return null
  }
  return {
    id: row.id as number,
    username: row.username as string,
    password_hash: row.password_hash as string,
    nombre_completo: row.nombre_completo as string,
    rol: row.rol as User['rol'],
    activo: row.activo as number,
    debe_cambiar_clave: row.debe_cambiar_clave as number,
  }
}

export function getUserById(db: Database.Database, id: number): User | null {
  const row = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToUser(row) : null
}

export function listUsers(db: Database.Database): User[] {
  const rows = db
    .prepare('SELECT * FROM usuarios ORDER BY username')
    .all() as Array<Record<string, unknown>>
  return rows.map(rowToUser)
}

export function createUser(
  db: Database.Database,
  input: CreateUserRequest & { passwordHash: string },
): User {
  const result = db
    .prepare(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo, debe_cambiar_clave)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.usuario,
      input.passwordHash,
      input.nombre,
      input.rol,
      1,
      0,
    )
  const id = Number(result.lastInsertRowid)
  const user = getUserById(db, id)
  if (!user) {
    throw new Error('User was not created')
  }
  return user
}

export function updateUser(db: Database.Database, id: number, changes: UpdateUserRequest): User {
  const sets: string[] = []
  const values: unknown[] = []
  if (changes.nombre !== undefined) {
    sets.push('nombre_completo = ?')
    values.push(changes.nombre)
  }
  if (changes.rol !== undefined) {
    sets.push('rol = ?')
    values.push(changes.rol)
  }
  if (changes.activo !== undefined) {
    sets.push('activo = ?')
    values.push(changes.activo ? 1 : 0)
  }
  if (sets.length === 0) {
    const existing = getUserById(db, id)
    if (!existing) {
      throw new Error('User not found')
    }
    return existing
  }
  values.push(id)
  db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  const user = getUserById(db, id)
  if (!user) {
    throw new Error('User not found after update')
  }
  return user
}

export function disableUser(db: Database.Database, id: number): User {
  db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(id)
  const user = getUserById(db, id)
  if (!user) {
    throw new Error('User not found after disabling')
  }
  return user
}

export function setUserPassword(
  db: Database.Database,
  id: number,
  passwordHash: string,
  debeCambiarClave: boolean,
): void {
  db
    .prepare('UPDATE usuarios SET password_hash = ?, debe_cambiar_clave = ? WHERE id = ?')
    .run(passwordHash, debeCambiarClave ? 1 : 0, id)
}

export function bootstrapAdminUser(db: Database.Database, passwordHash: string): User | null {
  const existing = db.prepare('SELECT id FROM usuarios LIMIT 1').get() as { id: number } | undefined
  if (existing) {
    return null
  }
  const result = db
    .prepare(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo, debe_cambiar_clave)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run('admin', passwordHash, 'Administrador', 'admin', 1, 1)
  const id = Number(result.lastInsertRowid)
  const user = getUserById(db, id)
  if (!user) {
    throw new Error('Bootstrap admin user was not created')
  }
  return user
}
