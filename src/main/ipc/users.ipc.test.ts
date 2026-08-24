import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { createTestDb } from '../repositories/test-helpers'
import { authChannels, type Session } from '@/shared/contracts'
import { configureGuardDependencies } from './register'
import { registerUsersHandlers } from './users.ipc'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

function makeSession(role: Session['rol'], userId: number): Session {
  return {
    userId,
    usuario: `user${userId}`,
    nombre: 'Usuario',
    rol: role,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

type Handler = (event: unknown, raw: unknown) => Promise<{ ok: boolean; data?: unknown; error?: { code: string } }>

describe('users IPC (admin-only CRUD)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let adminId: number
  let session: Session
  let handlers: Map<string, Handler>
  let writeAudit: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    testDb = await createTestDb()
    adminId = 1
    session = makeSession('admin', adminId)
    writeAudit = vi.fn()
    configureGuardDependencies({ getSession: () => session, writeAudit })

    const { ipcMain } = await import('electron')
    const handleSpy = vi.mocked(ipcMain.handle)
    handleSpy.mockClear()
    registerUsersHandlers(testDb.db)
    handlers = new Map(
      handleSpy.mock.calls.map(([channel, fn]) => [channel as string, fn as unknown as Handler]),
    )
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('RED: role guards block non-admin callers', () => {
    it.each([
      ['tecnico', 'users:create'],
      ['recepcion', 'users:list'],
      ['bioanalista', 'users:disable'],
      ['tecnico', 'users:resetPassword'],
      ['recepcion', 'users:update'],
    ])('blocks %s from %s and audits permiso.denegado', async (role, channel) => {
      session = makeSession(role as Session['rol'], 9)
      const result = await handlers.get(channel)!({}, { usuario: 'x', nombre: 'X', clave: 'clave12345', rol: 'tecnico', id: 1, nueva: 'clave12345' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error?.code).toBe('PERMISSION_DENIED')
      expect(writeAudit).toHaveBeenCalledWith(
        testDb.db,
        expect.objectContaining({ accion: 'permiso.denegado', despues: { channel } }),
      )
    })
  })

  describe('admin CRUD', () => {
    it('creates a user with a bcrypt hash (not plaintext) and lists it', async () => {
      const created = await handlers.get('users:create')!({}, {
        usuario: 'tecnico01',
        nombre: 'Ana Técnica',
        clave: 'clave12345',
        rol: 'tecnico',
      })

      expect(created.ok).toBe(true)

      const row = testDb.db
        .prepare("SELECT password_hash, debe_cambiar_clave FROM usuarios WHERE username = 'tecnico01'")
        .get() as { password_hash: string; debe_cambiar_clave: number }
      expect(row.password_hash).not.toBe('clave12345')
      expect(bcrypt.compareSync('clave12345', row.password_hash)).toBe(true)
      expect(row.debe_cambiar_clave).toBe(0)

      const list = await handlers.get('users:list')!({}, undefined)
      expect(list.ok).toBe(true)
      expect((list.data as Array<{ usuario: string }>).map((u) => u.usuario)).toContain('tecnico01')

      const audit = testDb.db
        .prepare("SELECT accion FROM auditoria WHERE entidad = 'usuario' AND accion = 'usuario.creado'")
        .get() as { accion: string }
      expect(audit?.accion).toBe('usuario.creado')
    })

    it('resets a password with a fresh hash and flags debe_cambiar_clave', async () => {
      await handlers.get('users:create')!({}, {
        usuario: 'lab02',
        nombre: 'Luis Lab',
        clave: 'oldpassword1',
        rol: 'recepcion',
      })
      const userRow = testDb.db
        .prepare("SELECT id FROM usuarios WHERE username = 'lab02'")
        .get() as { id: number }

      const reset = await handlers.get('users:resetPassword')!({}, {
        id: userRow.id,
        nueva: 'nuevaClave99',
        debe_cambiar_clave: true,
      })
      expect(reset.ok).toBe(true)

      const row = testDb.db
        .prepare('SELECT password_hash, debe_cambiar_clave FROM usuarios WHERE id = ?')
        .get(userRow.id) as { password_hash: string; debe_cambiar_clave: number }
      expect(bcrypt.compareSync('nuevaClave99', row.password_hash)).toBe(true)
      expect(row.debe_cambiar_clave).toBe(1)

      const audit = testDb.db
        .prepare("SELECT COUNT(*) as count FROM auditoria WHERE accion = 'clave.cambiada' AND entidad_id = ?")
        .get(userRow.id) as { count: number }
      expect(audit.count).toBe(1)
    })

    it('disables a user and audits before/after state', async () => {
      await handlers.get('users:create')!({}, {
        usuario: 'temp01',
        nombre: 'Temporal',
        clave: 'tempclave12',
        rol: 'tecnico',
      })
      const { id } = testDb.db.prepare("SELECT id FROM usuarios WHERE username = 'temp01'").get() as { id: number }

      const disabled = await handlers.get('users:disable')!({}, { id })
      expect(disabled.ok).toBe(true)
      expect((disabled.data as { activo: boolean }).activo).toBe(false)

      const audit = testDb.db
        .prepare("SELECT antes, despues FROM auditoria WHERE accion = 'usuario.deshabilitado' AND entidad_id = ?")
        .get(id) as { antes: string; despues: string }
      // `antes` is the raw SQLite row; `despues` is the mapped contract User.
      expect(JSON.parse(audit.antes)).toMatchObject({ activo: 1 })
      expect(JSON.parse(audit.despues)).toMatchObject({ activo: false })
    })

    it('updates name and role with an audit trail', async () => {
      await handlers.get('users:create')!({}, {
        usuario: 'bio03',
        nombre: 'Bio Tres',
        clave: 'bioclave123',
        rol: 'bioanalista',
      })
      const { id } = testDb.db.prepare("SELECT id FROM usuarios WHERE username = 'bio03'").get() as { id: number }

      const updated = await handlers.get('users:update')!({}, { id, nombre: 'Biológica Tres', rol: 'admin' })
      expect(updated.ok).toBe(true)
      expect(updated.data).toMatchObject({ nombre: 'Biológica Tres', rol: 'admin' })

      const audit = testDb.db
        .prepare("SELECT COUNT(*) as count FROM auditoria WHERE accion = 'usuario.editado' AND entidad_id = ?")
        .get(id) as { count: number }
      expect(audit.count).toBe(1)
    })

    it('rejects a duplicate username with DUPLICATE error code', async () => {
      await handlers.get('users:create')!({}, {
        usuario: 'dup01',
        nombre: 'Primero',
        clave: 'clave12345',
        rol: 'tecnico',
      })
      const second = await handlers.get('users:create')!({}, {
        usuario: 'dup01',
        nombre: 'Segundo',
        clave: 'clave67890',
        rol: 'tecnico',
      })
      expect(second.ok).toBe(false)
      if (!second.ok) expect(second.error?.code).toBe('DUPLICATE')
    })
  })

  describe('registration', () => {
    it('registers every users:* channel declared in the contracts', async () => {
      const expected = Object.keys(authChannels).filter((channel) => channel.startsWith('users:'))
      for (const channel of expected) {
        expect(handlers.has(channel), `expected ${channel} to be registered`).toBe(true)
      }
      expect(expected).toHaveLength(5)
    })
  })
})
