import type Database from 'better-sqlite3'
import { authChannels, ROLES } from '@/shared/contracts'
import { handle } from './register'
import { hashPassword } from '../services/auth'
import { createUser, disableUser, listUsers, setUserPassword, updateUser } from '../repositories/users'
import { writeAudit } from '../services/audit'

const ADMIN_ONLY = [ROLES.ADMIN]

export function registerUsersHandlers(db: Database.Database): void {
  handle(db, 'users:list', ADMIN_ONLY, authChannels['users:list'].request, async () => {
    return listUsers(db)
  })

  handle(db, 'users:create', ADMIN_ONLY, authChannels['users:create'].request, async (_, req, session) => {
    const hash = await hashPassword(req.clave)
    const user = createUser(db, { ...req, passwordHash: hash })
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'usuario.creado',
      entidad: 'usuario',
      entidad_id: user.id,
      despues: user,
    })
    return user
  })

  handle(db, 'users:update', ADMIN_ONLY, authChannels['users:update'].request, async (_, req, session) => {
    const before = getUserSnapshot(db, req.id)
    const user = updateUser(db, req.id, req)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'usuario.editado',
      entidad: 'usuario',
      entidad_id: user.id,
      antes: before,
      despues: user,
    })
    return user
  })

  handle(db, 'users:disable', ADMIN_ONLY, authChannels['users:disable'].request, async (_, req, session) => {
    const before = getUserSnapshot(db, req.id)
    const user = disableUser(db, req.id)
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'usuario.deshabilitado',
      entidad: 'usuario',
      entidad_id: user.id,
      antes: before,
      despues: user,
    })
    return user
  })

  handle(
    db,
    'users:resetPassword',
    ADMIN_ONLY,
    authChannels['users:resetPassword'].request,
    async (_, req, session) => {
      const hash = await hashPassword(req.nueva)
      setUserPassword(db, req.id, hash, req.debe_cambiar_clave)
      writeAudit(db, {
        usuario_id: session.userId,
        accion: 'clave.cambiada',
        entidad: 'usuario',
        entidad_id: req.id,
        despues: { debe_cambiar_clave: req.debe_cambiar_clave },
      })
    },
  )
}

function getUserSnapshot(db: Database.Database, id: number): unknown {
  const user = db
    .prepare('SELECT id, username, nombre_completo, rol, activo, debe_cambiar_clave FROM usuarios WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined
  return user ?? null
}
