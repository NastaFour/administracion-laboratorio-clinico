import type Database from 'better-sqlite3'
import { authChannels, ROLES } from '@/shared/contracts'
import { handle, handlePublic } from './register'
import { comparePassword, getSession, hashPassword, login, logout } from '../services/auth'
import { getUserById, setUserPassword } from '../repositories/users'
import { writeAudit } from '../services/audit'

const ALL_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export function registerAuthHandlers(db: Database.Database): void {
  handlePublic(db, 'auth:login', authChannels['auth:login'].request, async (_, req) => {
    const session = await login(db, req.usuario, req.clave)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'login',
      entidad: 'usuario',
      entidad_id: session.userId,
    })
    return session
  })

  handle(db, 'auth:logout', ALL_ROLES, authChannels['auth:logout'].request, async (_, _req, session) => {
    logout()
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'logout',
      entidad: 'usuario',
      entidad_id: session.userId,
    })
  })

  handle(db, 'auth:me', ALL_ROLES, authChannels['auth:me'].request, async () => {
    return getSession()
  })

  handle(
    db,
    'auth:changePassword',
    ALL_ROLES,
    authChannels['auth:changePassword'].request,
    async (_, req, session) => {
      const user = getUserById(db, session.userId)
      if (!user) {
        throw new Error('Usuario no encontrado')
      }
      // Password hash is not exposed on the public User type, so fetch it directly.
      const row = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(session.userId) as
        | { password_hash: string }
        | undefined
      if (!row) {
        throw new Error('Usuario no encontrado')
      }
      const valid = await comparePassword(req.actual, row.password_hash)
      if (!valid) {
        throw new Error('Clave actual incorrecta')
      }
      const hash = await hashPassword(req.nueva)
      setUserPassword(db, session.userId, hash, false)
      writeAudit(db, {
        usuario_id: session.userId,
        accion: 'clave.cambiada',
        entidad: 'usuario',
        entidad_id: session.userId,
      })
    },
  )
}
