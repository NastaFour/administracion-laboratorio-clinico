import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from '../repositories/test-helpers'
import { configChannels, type Session } from '@/shared/contracts'
import { setBcvRate } from '../repositories/config'
import { configureGuardDependencies } from './register'

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

type Handler = (event: unknown, raw: unknown) => Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }>

const LOGO_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('config IPC', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let adminId: number
  let session: Session
  let handlers: Map<string, Handler>
  let writeAudit: ReturnType<typeof vi.fn>

  const labPayload = {
    nombre: 'Laboratorio Clínico Central',
    rif: 'J-12345678',
    direccion: 'Av. Principal, Local 4',
    sede: null,
    telefono: '0212-5551234',
    email: 'lab@example.com',
    logo: null as string | null,
  }

  const bioanalistaPayload = {
    nombre: 'Dra. María Pérez',
    titulo: 'Bioanalista',
    registro_msds: 'MSDS-12345',
    registro_cbz: 'CBZ-67890',
    firma: null as string | null,
  }

  beforeEach(async () => {
    testDb = await createTestDb()
    adminId = createUser(testDb.db, 'adm1', 'admin')
    session = makeSession('admin', adminId)
    writeAudit = vi.fn()
    configureGuardDependencies({ getSession: () => session, writeAudit })

    const { registerConfigHandlers } = await import('./config.ipc')
    const { ipcMain } = await import('electron')
    const handleSpy = vi.mocked(ipcMain.handle)
    handleSpy.mockClear()
    registerConfigHandlers(testDb.db)
    handlers = new Map(
      handleSpy.mock.calls.map(([channel, fn]) => [channel as string, fn as unknown as Handler]),
    )
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('lab + bioanalista + print', () => {
    it('persists lab config and audits the change', async () => {
      const saved = await handlers.get('config:setLab')!({}, labPayload)
      expect(saved.ok).toBe(true)

      const fetched = await handlers.get('config:getLab')!({}, undefined)
      expect(fetched.data).toMatchObject({ nombre: 'Laboratorio Clínico Central', rif: 'J-12345678' })

      const audit = testDb.db
        .prepare("SELECT COUNT(*) as count FROM auditoria WHERE accion = 'config.cambiada' AND entidad = 'config'")
        .get() as { count: number }
      expect(audit.count).toBe(1)
    })

    it('persists bioanalista credentials for the PDF signature block', async () => {
      const saved = await handlers.get('config:setBioanalista')!({}, bioanalistaPayload)
      expect(saved.ok).toBe(true)
      expect(saved.data).toMatchObject({ nombre: 'Dra. María Pérez', registro_msds: 'MSDS-12345' })
    })

    it('stores the print defaults (M13.4 Should)', async () => {
      const saved = await handlers.get('config:setPrint')!({}, {
        pageSize: 'A4',
        margins: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
        copies: 2,
      })
      expect(saved.ok).toBe(true)
      const fetched = await handlers.get('config:getPrint')!({}, undefined)
      expect((fetched.data as { copies: number }).copies).toBe(2)
    })
  })

  describe('report format (dual-format PDF system)', () => {
    it('defaults to generico when no format is persisted', async () => {
      const fetched = await handlers.get('config:getReportFormat')!({}, undefined)
      expect(fetched.ok).toBe(true)
      expect(fetched.data).toBe('generico')
    })

    it('persists the chosen format and reads it back', async () => {
      const saved = await handlers.get('config:setReportFormat')!({}, { formato: 'especializado' })
      expect(saved.ok).toBe(true)
      expect(saved.data).toBe('especializado')

      const fetched = await handlers.get('config:getReportFormat')!({}, undefined)
      expect(fetched.data).toBe('especializado')

      const row = testDb.db
        .prepare("SELECT valor FROM configuracion WHERE clave = 'reporte_formato'")
        .get() as { valor: string }
      expect(row.valor).toBe('especializado')
    })

    it('rejects an unknown format value', async () => {
      const saved = await handlers.get('config:setReportFormat')!({}, { formato: 'medieval' })
      expect(saved.ok).toBe(false)
      if (!saved.ok) expect(saved.error?.code).toBe('VALIDATION_ERROR')
    })

    it('blocks a non-admin from changing the report format', async () => {
      session = makeSession('tecnico', 9)
      const saved = await handlers.get('config:setReportFormat')!({}, { formato: 'especializado' })
      expect(saved.ok).toBe(false)
      if (!saved.ok) expect(saved.error?.code).toBe('PERMISSION_DENIED')
    })

    it('allows a non-admin to read the report format', async () => {
      await handlers.get('config:setReportFormat')!({}, { formato: 'especializado' })
      session = makeSession('recepcion', 9)
      const fetched = await handlers.get('config:getReportFormat')!({}, undefined)
      expect(fetched.ok).toBe(true)
      expect(fetched.data).toBe('especializado')
    })
  })

  describe('logo upload (N11.3 base64 data URI)', () => {
    it('RED: accepts a base64 image data URI and stores it under lab_logo', async () => {
      const saved = await handlers.get('config:setLogo')!({}, { logo: LOGO_DATA_URI })
      expect(saved.ok).toBe(true)

      const row = testDb.db
        .prepare("SELECT valor FROM configuracion WHERE clave = 'lab_logo'")
        .get() as { valor: string }
      expect(row.valor).toBe(LOGO_DATA_URI)

      const fetched = await handlers.get('config:getLab')!({}, undefined)
      expect((fetched.data as { logo: string | null }).logo).toBe(LOGO_DATA_URI)
    })

    it('RED: rejects a filesystem path instead of a data URI', async () => {
      const saved = await handlers.get('config:setLogo')!({}, { logo: String.raw`C:\Users\lab\logo.png` })
      expect(saved.ok).toBe(false)
      if (!saved.ok) expect(saved.error?.code).toBe('VALIDATION_ERROR')

      const row = testDb.db
        .prepare("SELECT COUNT(*) as count FROM configuracion WHERE clave = 'lab_logo'")
        .get() as { count: number }
      expect(row.count).toBe(0)
    })

    it('blocks a non-admin from changing the logo', async () => {
      session = makeSession('tecnico', 9)
      const saved = await handlers.get('config:setLogo')!({}, { logo: LOGO_DATA_URI })
      expect(saved.ok).toBe(false)
      if (!saved.ok) expect(saved.error?.code).toBe('PERMISSION_DENIED')
      expect(writeAudit).toHaveBeenCalledWith(
        testDb.db,
        expect.objectContaining({ accion: 'permiso.denegado' }),
      )
    })
  })

  describe('RED: BCV rate history (M13.2)', () => {
    it('a rate change appends a history row and getBcvHistory lists entries newest-first with last-updated', async () => {
      setBcvRate(testDb.db, 950, adminId)
      setBcvRate(testDb.db, 960, adminId)

      const activeRow = testDb.db
        .prepare('SELECT tasa_bcv FROM bcv_historial ORDER BY id DESC LIMIT 1')
        .get() as { tasa_bcv: number }
      expect(activeRow.tasa_bcv).toBe(960)

      const total = testDb.db
        .prepare('SELECT COUNT(*) as count FROM bcv_historial')
        .get() as { count: number }
      expect(total.count).toBe(2)

      const history = await handlers.get('config:getBcvHistory')!({}, undefined)
      expect(history.ok).toBe(true)
      const entries = history.data as Array<{ tasa: number; actualizado_en: string; usuario_id: number | null }>
      expect(entries).toHaveLength(2)
      expect(entries[0].tasa).toBe(960)
      expect(entries[1].tasa).toBe(950)
      expect(() => new Date(entries[0].actualizado_en).toISOString()).not.toThrow()
      expect(entries[0].usuario_id).toBe(adminId)
    })

    it('returns an empty history before any rate is entered', async () => {
      const history = await handlers.get('config:getBcvHistory')!({}, undefined)
      expect(history.data).toEqual([])
    })
  })

  describe('registration + guards', () => {
    it('registers every config channel declared in the contracts', async () => {
      const expected = Object.keys(configChannels)
      for (const channel of expected) {
        expect(handlers.has(channel), `expected ${channel} to be registered`).toBe(true)
      }
    })

    it.each(['config:setLab', 'config:getBcvHistory'])('blocks tecnico from %s', async (channel) => {
      session = makeSession('tecnico', 9)
      const result = await handlers.get(channel)!({}, undefined)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error?.code).toBe('PERMISSION_DENIED')
    })
  })
})
