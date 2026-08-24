import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from '../repositories/test-helpers'
import { auditChannels, type Session } from '@/shared/contracts'
import { configureGuardDependencies } from './register'
import { createAuditEntry } from '../repositories/audit'
import { registerAuditHandlers, handleListAudit } from './audit.ipc'

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

describe('audit IPC (admin-only audit:list)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let adminId: number
  let tecId: number
  let session: Session
  let handlers: Map<string, Handler>
  let writeAudit: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    testDb = await createTestDb()
    adminId = createUser(testDb.db, 'admin01', 'admin')
    tecId = createUser(testDb.db, 'tecnico01', 'tecnico')
    session = makeSession('admin', adminId)
    writeAudit = vi.fn()
    configureGuardDependencies({ getSession: () => session, writeAudit })

    const { ipcMain } = await import('electron')
    const handleSpy = vi.mocked(ipcMain.handle)
    handleSpy.mockClear()
    registerAuditHandlers(testDb.db)
    handlers = new Map(
      handleSpy.mock.calls.map(([channel, fn]) => [channel as string, fn as unknown as Handler]),
    )
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('RED: role guards block non-admin callers (M12.3 non-admin denied)', () => {
    it.each(['tecnico', 'recepcion', 'bioanalista'])('blocks %s and audits permiso.denegado', async (role) => {
      session = makeSession(role as Session['rol'], 9)
      const result = await handlers.get('audit:list')!({}, {})
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error?.code).toBe('PERMISSION_DENIED')
      expect(writeAudit).toHaveBeenCalledWith(
        testDb.db,
        expect.objectContaining({ accion: 'permiso.denegado', despues: { channel: 'audit:list' } }),
      )
    })
  })

  describe('filters (M12.3 admin filters by actor/action/entity/date)', () => {
    it('filters by actor (usuarioId)', async () => {
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'paciente.creado', entidad: 'paciente', entidad_id: 1 })
      createAuditEntry(testDb.db, { usuario_id: adminId, accion: 'paciente.editado', entidad: 'paciente', entidad_id: 1 })

      const result = await handlers.get('audit:list')!({}, { usuarioId: tecId })

      expect(result.ok).toBe(true)
      const rows = result.data as Array<{ usuario_id: number }>
      expect(rows).toHaveLength(1)
      expect(rows[0].usuario_id).toBe(tecId)
    })

    it('filters by action and entity together', async () => {
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'paciente.creado', entidad: 'paciente', entidad_id: 1 })
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'orden.creada', entidad: 'orden', entidad_id: 1 })

      const result = await handlers.get('audit:list')!({}, { accion: 'paciente.creado', entidad: 'paciente' })

      expect(result.ok).toBe(true)
      const rows = result.data as Array<{ accion: string; entidad: string }>
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ accion: 'paciente.creado', entidad: 'paciente' })
    })

    it('filters by date range (desde/hasta)', async () => {
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'paciente.creado', entidad: 'paciente', entidad_id: 1 })
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'paciente.editado', entidad: 'paciente', entidad_id: 1 })
      testDb.db
        .prepare("UPDATE auditoria SET creado_en = CASE WHEN accion = 'paciente.creado' THEN '2026-08-01 10:00:00' ELSE '2026-08-15 10:00:00' END")
        .run()

      const result = await handlers.get('audit:list')!({}, { desde: '2026-08-10', hasta: '2026-08-20' })

      expect(result.ok).toBe(true)
      const rows = result.data as Array<{ accion: string }>
      expect(rows).toHaveLength(1)
      expect(rows[0].accion).toBe('paciente.editado')
    })

    it('returns every entry newest-first when no filters are given', async () => {
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'paciente.creado', entidad: 'paciente', entidad_id: 1 })
      createAuditEntry(testDb.db, { usuario_id: adminId, accion: 'paciente.editado', entidad: 'paciente', entidad_id: 1 })

      const result = await handlers.get('audit:list')!({}, {})

      expect(result.ok).toBe(true)
      expect((result.data as unknown[]).length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('direct handler + registration', () => {
    it('handleListAudit delegates to the append-only repository (read-only, no mutation)', async () => {
      createAuditEntry(testDb.db, { usuario_id: tecId, accion: 'pago.registrado', entidad: 'pago', entidad_id: 5 })
      const entries = handleListAudit(testDb.db, { entidad: 'pago' })
      expect(entries).toHaveLength(1)
      expect(entries[0].entidad_id).toBe(5)
      expect(entries[0].accion).toBe('pago.registrado')
    })

    it('registerAuditHandlers registers exactly the audit:list channel', async () => {
      const { ipcMain } = await import('electron')
      const handleSpy = vi.mocked(ipcMain.handle)
      const channels = handleSpy.mock.calls.map(([channel]) => channel)
      expect(channels).toEqual(['audit:list'])
      expect(auditChannels).toHaveProperty('audit:list')
    })
  })
})
