import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createTestDb, createUser, createPatient } from '../repositories/test-helpers'
import { createBackup } from '../repositories/backup'
import { backupChannels, ERROR_CODES, type Session } from '@/shared/contracts'
import { configureGuardDependencies } from './register'
import {
  handleApplyImport,
  handleCreateBackup,
  handleExportFiltered,
  handleListBackups,
  handlePreviewImport,
  handleRestoreBackup,
  registerBackupHandlers,
} from './backup.ipc'
import { decryptExport } from '../services/backup'
import { closeDatabase, getDefaultDbPath } from '../services/db'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: {
    isPackaged: false,
    getPath: vi.fn(() => 'C:\\tmp\\userData'),
    relaunch: vi.fn(),
    quit: vi.fn(),
  },
}))

vi.mock('../services/db', () => ({
  getDefaultDbPath: vi.fn(),
  closeDatabase: vi.fn(),
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

type Handler = (
  event: unknown,
  raw: unknown,
) => Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }>

const PATIENT = {
  cedula: 'V-91000001',
  nombre: 'Importado',
  apellido: 'Paciente',
  fecha_nacimiento: '1992-02-02',
  sexo: 'M' as const,
  telefono: null,
  email: null,
  direccion: null,
}

describe('backup IPC (WU14)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let adminId: number
  let session: Session
  let handlers: Map<string, Handler>

  beforeEach(async () => {
    testDb = await createTestDb()
    adminId = createUser(testDb.db, 'adm1', 'admin')
    session = makeSession('admin', adminId)
    configureGuardDependencies({ getSession: () => session, writeAudit: vi.fn() })

    const { ipcMain } = await import('electron')
    const handleSpy = vi.mocked(ipcMain.handle)
    handleSpy.mockClear()
    registerBackupHandlers(testDb.db)
    handlers = new Map(handleSpy.mock.calls.map(([channel, fn]) => [channel as string, fn as unknown as Handler]))
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('backup:create + backup:list', () => {
    it('creates a backup at the chosen path through the guarded handler', async () => {
      const backupPath = path.join(testDb.tmpDir, 'ipc-backup.db')
      const result = await handlers.get('backup:create')!({}, { filePath: backupPath })
      expect(result.ok).toBe(true)
      expect(fs.existsSync(backupPath)).toBe(true)
      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'backup.creado'").get() as {
        n: number
      }
      expect(audit.n).toBe(1)
    })

    it('lists the backups directory (empty when none exist)', async () => {
      const result = await handlers.get('backup:list')!({}, undefined)
      expect(result.ok).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('import:preview + import:apply', () => {
    it('previews conflicts and applies an overwrite resolution end-to-end', async () => {
      createPatient(testDb.db, PATIENT.cedula, 'Local', 'Paciente')
      const filePath = path.join(testDb.tmpDir, 'import.json')
      fs.writeFileSync(filePath, JSON.stringify({ pacientes: [PATIENT], examenes: [] }), 'utf8')

      const preview = await handlers.get('import:preview')!({}, { filePath })
      expect(preview.ok).toBe(true)
      const conflicts = preview.data as Array<{ id: string; tipo: string }>
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].id).toBe(PATIENT.cedula)

      const applied = await handlers.get('import:apply')!({}, { filePath, resolutions: { [PATIENT.cedula]: 'overwrite' } })
      expect(applied.ok).toBe(true)

      const row = testDb.db.prepare('SELECT nombres FROM pacientes WHERE cedula = ?').get(PATIENT.cedula) as {
        nombres: string
      }
      expect(row.nombres).toBe('Importado')
      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'import.aplicado'").get() as {
        n: number
      }
      expect(audit.n).toBe(1)
    })
  })

  describe('export:filtered', () => {
    it('exports encrypted CSV/JSON through the handler and round-trips', async () => {
      const result = await handlers.get('export:filtered')!({}, {
        desde: '2026-08-01',
        hasta: '2026-08-31',
        formato: 'json',
        passphrase: 'secreto',
      })
      expect(result.ok).toBe(true)
      const encrypted = result.data as string
      expect(encrypted.startsWith('labcore-aes256gcm:v1:')).toBe(true)
      expect(decryptExport('secreto', encrypted)).toContain('[')
    })

    it('plaintext export when passphrase is null', async () => {
      const result = await handlers.get('export:filtered')!({}, {
        desde: '2026-08-01',
        hasta: '2026-08-31',
        formato: 'csv',
        passphrase: null,
      })
      expect(result.ok).toBe(true)
      expect((result.data as string).startsWith('\uFEFF')).toBe(true)
    })
  })

  describe('backup:restore', () => {
    it('RED: rejects an incompatible schema_version through the handler', async () => {
      const backupPath = path.join(testDb.tmpDir, 'future.db')
      await createBackup(testDb.db, backupPath)
      const backupDb = new Database(backupPath)
      try {
        backupDb.prepare("INSERT INTO schema_version (version, nombre) VALUES (999, 'futura')").run()
      } finally {
        backupDb.close()
      }

      const relaunch = vi.fn()
      const swapDatabase = vi.fn()
      await expect(
        handleRestoreBackup(testDb.db, { filePath: backupPath }, session, {
          getDbPath: () => path.join(testDb.tmpDir, 'live.db'),
          resolveBackupsDir: () => path.join(testDb.tmpDir, 'rb'),
          swapDatabase,
          relaunch,
        }),
      ).rejects.toThrow(ERROR_CODES.INCOMPATIBLE_SCHEMA_VERSION)

      expect(swapDatabase).not.toHaveBeenCalled()
      expect(relaunch).not.toHaveBeenCalled()
    })

    it('exercises the production default swap/relaunch when deps are not injected', async () => {
      const backupPath = path.join(testDb.tmpDir, 'valid-default.db')
      await createBackup(testDb.db, backupPath)
      const target = path.join(testDb.tmpDir, 'live-target.db')
      vi.mocked(getDefaultDbPath).mockReturnValue(target)
      vi.mocked(closeDatabase).mockImplementation(() => {})

      await handleRestoreBackup(testDb.db, { filePath: backupPath }, session, {
        resolveBackupsDir: () => path.join(testDb.tmpDir, 'defaults'),
      })

      expect(closeDatabase).toHaveBeenCalled()
      expect(fs.existsSync(target)).toBe(true)
      const { app } = await import('electron')
      expect(app.relaunch).toHaveBeenCalled()
      expect(app.quit).toHaveBeenCalled()
    })
  })

  describe('role guards + registration', () => {
    it('blocks a non-admin from every backup/import/export channel', async () => {
      const tecnico = createUser(testDb.db, 'tec1', 'tecnico')
      session = makeSession('tecnico', tecnico)

      for (const channel of ['backup:create', 'backup:restore', 'import:preview', 'import:apply', 'export:filtered']) {
        const result = await handlers.get(channel)!({}, undefined)
        expect(result.ok, `${channel} should be denied`).toBe(false)
        if (!result.ok) expect(result.error?.code).toBe(ERROR_CODES.PERMISSION_DENIED)
      }
    })

    it('registers every WU14 channel declared in the contracts (prune deferred)', async () => {
      const expected = ['backup:create', 'backup:list', 'backup:restore', 'import:preview', 'import:apply', 'export:filtered']
      for (const channel of expected) {
        expect(handlers.has(channel), `expected ${channel} to be registered`).toBe(true)
      }
      expect(handlers.has('backup:prune')).toBe(false)
    })

    it('registers all channels declared in backupChannels minus the deferred prune', () => {
      const declared = Object.keys(backupChannels).filter((c) => c !== 'backup:prune')
      for (const channel of declared) {
        expect(handlers.has(channel), `expected ${channel}`).toBe(true)
      }
    })
  })

  // Direct-handler coverage for the exported handle* functions (coverage).
  describe('direct handler exports', () => {
    it('handleCreateBackup / handleListBackups / handlePreviewImport / handleApplyImport / handleExportFiltered execute', async () => {
      const backupPath = path.join(testDb.tmpDir, 'direct.db')
      await handleCreateBackup(testDb.db, { filePath: backupPath }, session)
      expect(fs.existsSync(backupPath)).toBe(true)

      expect(Array.isArray(handleListBackups())).toBe(true)

      const filePath = path.join(testDb.tmpDir, 'direct-import.json')
      fs.writeFileSync(filePath, JSON.stringify({ pacientes: [PATIENT], examenes: [] }), 'utf8')
      expect(handlePreviewImport(testDb.db, { filePath })).toEqual([])

      handleApplyImport(testDb.db, { filePath, resolutions: {} }, session)
      expect(
        (testDb.db.prepare('SELECT COUNT(*) AS n FROM pacientes WHERE cedula = ?').get(PATIENT.cedula) as { n: number }).n,
      ).toBe(1)

      const out = handleExportFiltered(
        testDb.db,
        { desde: '2026-08-01', hasta: '2026-08-31', formato: 'csv', passphrase: null },
        session,
      )
      expect(out.startsWith('\uFEFF')).toBe(true)
    })
  })
})
