import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createTestDb, createUser, createPatient, createExam, createOrder } from '../repositories/test-helpers'
import { createBackup, getSchemaVersion } from '../repositories/backup'
import type { Session } from '@/shared/contracts'
import { ERROR_CODES } from '@/shared/contracts'
import {
  applyImportService,
  buildExportData,
  createBackupService,
  decryptExport,
  encryptExport,
  exportFilteredService,
  listBackupsService,
  previewImportService,
  restoreBackupService,
  rowsToCsv,
} from './backup'

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

function writeImportFile(tmpDir: string, content: unknown): string {
  const filePath = path.join(tmpDir, 'import.json')
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8')
  return filePath
}

const PATIENT = {
  cedula: 'V-90000001',
  nombre: 'Importado',
  apellido: 'Paciente',
  fecha_nacimiento: '1990-01-01',
  sexo: 'F' as const,
  telefono: null,
  email: null,
  direccion: null,
}

const EXAM = {
  codigo: 'IMP01',
  nombre: 'Examen Importado',
  categoria: 'Química',
  tipo_muestra: 'Sangre',
  precio: 250,
  tercerizado: false,
  proveedor: null,
}

describe('backup service (WU14)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let userId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    userId = createUser(testDb.db, 'adm1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  // -------------------------------------------------------------------------
  // AES-256-GCM (A9)
  // -------------------------------------------------------------------------

  describe('AES-256-GCM round-trip', () => {
    it('RED: encrypt then decrypt returns the original plaintext', () => {
      const plaintext = 'orden_id,fecha\n1,2026-08-24\n'
      const encrypted = encryptExport('clave-secreta', plaintext)
      expect(encrypted).not.toContain(plaintext)
      expect(encrypted.startsWith('labcore-aes256gcm:v1:')).toBe(true)
      expect(decryptExport('clave-secreta', encrypted)).toBe(plaintext)
    })

    it('RED: a wrong passphrase fails GCM authentication', () => {
      const encrypted = encryptExport('clave-correcta', 'datos sensibles')
      expect(() => decryptExport('clave-incorrecta', encrypted)).toThrow()
    })

    it('produces distinct ciphertexts for the same plaintext (random IV/salt)', () => {
      const a = encryptExport('k', 'mismo')
      const b = encryptExport('k', 'mismo')
      expect(a).not.toBe(b)
      expect(decryptExport('k', a)).toBe('mismo')
      expect(decryptExport('k', b)).toBe('mismo')
    })

    it('rejects a payload without the version prefix', () => {
      expect(() => decryptExport('k', Buffer.from('datos').toString('base64'))).toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // backup:create / backup:list
  // -------------------------------------------------------------------------

  describe('manual backup', () => {
    it('creates a valid backup at the chosen path and audits backup.creado', async () => {
      const backupPath = path.join(testDb.tmpDir, 'manual.db')
      const backup = await createBackupService(testDb.db, backupPath, makeSession('admin', userId))

      expect(fs.existsSync(backupPath)).toBe(true)
      expect(backup.path).toBe(backupPath)
      expect(getSchemaVersion(backupPath)).toBeGreaterThanOrEqual(2)

      const audit = testDb.db
        .prepare("SELECT despues FROM auditoria WHERE accion = 'backup.creado'")
        .get() as { despues: string } | undefined
      expect(audit).toBeDefined()
      expect(JSON.parse(audit?.despues ?? '{}')).toMatchObject({ path: backupPath })
    })

    it('lists backups in a directory newest-first', async () => {
      const backupsDir = path.join(testDb.tmpDir, 'backups-list')
      fs.mkdirSync(backupsDir, { recursive: true })
      await createBackup(testDb.db, path.join(backupsDir, 'a.db'))
      await createBackup(testDb.db, path.join(backupsDir, 'b.db'))
      const list = listBackupsService(backupsDir)
      expect(list).toHaveLength(2)
      expect(list.every((b) => b.path.endsWith('.db'))).toBe(true)
    })

    it('returns an empty list for a missing directory', () => {
      expect(listBackupsService(path.join(testDb.tmpDir, 'nope'))).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // backup:restore — schema_version validation + preventive backup + relaunch
  // -------------------------------------------------------------------------

  describe('restore', () => {
    async function makeBackupWithVersion(version: number | null): Promise<string> {
      const backupPath = path.join(testDb.tmpDir, `backup-v${version ?? 'none'}.db`)
      await createBackup(testDb.db, backupPath)
      const backupDb = new Database(backupPath)
      try {
        if (version === null) {
          backupDb.exec('DROP TABLE schema_version')
        } else {
          backupDb.prepare("INSERT INTO schema_version (version, nombre) VALUES (?, 'futura')").run(version)
        }
      } finally {
        backupDb.close()
      }
      return backupPath
    }

    it('RED: rejects a backup with a NEWER schema_version before any write', async () => {
      const backupPath = await makeBackupWithVersion(999)
      const swapDatabase = vi.fn()
      const relaunch = vi.fn()
      const backupsDir = path.join(testDb.tmpDir, 'restore-backups')

      await expect(
        restoreBackupService(testDb.db, backupPath, makeSession('admin', userId), {
          getDbPath: () => path.join(testDb.tmpDir, 'live.db'),
          resolveBackupsDir: () => backupsDir,
          swapDatabase,
          relaunch,
        }),
      ).rejects.toThrow(ERROR_CODES.INCOMPATIBLE_SCHEMA_VERSION)

      expect(swapDatabase).not.toHaveBeenCalled()
      expect(relaunch).not.toHaveBeenCalled()
      expect(fs.existsSync(backupsDir)).toBe(false)
      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'backup.restaurado'").get() as {
        n: number
      }
      expect(audit.n).toBe(0)
    })

    it('RED: rejects a backup without a schema_version table (version 0)', async () => {
      const backupPath = await makeBackupWithVersion(null)
      const swapDatabase = vi.fn()
      await expect(
        restoreBackupService(testDb.db, backupPath, makeSession('admin', userId), {
          getDbPath: () => path.join(testDb.tmpDir, 'live.db'),
          resolveBackupsDir: () => path.join(testDb.tmpDir, 'restore-backups'),
          swapDatabase,
          relaunch: vi.fn(),
        }),
      ).rejects.toThrow(ERROR_CODES.INCOMPATIBLE_SCHEMA_VERSION)
      expect(swapDatabase).not.toHaveBeenCalled()
    })

    it('takes a preventive backup, audits backup.restaurado, swaps and relaunches', async () => {
      const backupPath = path.join(testDb.tmpDir, 'valid.db')
      await createBackup(testDb.db, backupPath)

      const swapDatabase = vi.fn()
      const relaunch = vi.fn()
      const backupsDir = path.join(testDb.tmpDir, 'restore-backups')
      const livePath = path.join(testDb.tmpDir, 'live.db')

      await restoreBackupService(testDb.db, backupPath, makeSession('admin', userId), {
        getDbPath: () => livePath,
        resolveBackupsDir: () => backupsDir,
        swapDatabase,
        relaunch,
      })

      expect(swapDatabase).toHaveBeenCalledWith(livePath, backupPath)
      expect(relaunch).toHaveBeenCalled()

      // Preventive backup exists and is a valid SQLite snapshot.
      const preventive = fs.readdirSync(backupsDir).filter((f) => f.startsWith('preventive-restore-'))
      expect(preventive).toHaveLength(1)
      expect(getSchemaVersion(path.join(backupsDir, preventive[0]))).toBeGreaterThanOrEqual(2)

      const audit = testDb.db.prepare("SELECT despues FROM auditoria WHERE accion = 'backup.restaurado'").get() as {
        despues: string
      }
      expect(JSON.parse(audit.despues)).toMatchObject({ backupPath })
    })
  })

  // -------------------------------------------------------------------------
  // import:preview + import:apply — conflict resolution (M14.4)
  // -------------------------------------------------------------------------

  describe('import / merge', () => {
    it('RED: previews patient and exam conflicts keyed by cedula/codigo', () => {
      createPatient(testDb.db, PATIENT.cedula, 'Local', 'Paciente')
      createExam(testDb.db, EXAM.codigo, 100)
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [PATIENT], examenes: [EXAM] })

      const conflicts = previewImportService(testDb.db, filePath)
      expect(conflicts).toHaveLength(2)
      expect(conflicts.map((c) => c.id).sort()).toEqual([PATIENT.cedula, EXAM.codigo].sort())

      const patientConflict = conflicts.find((c) => c.tipo === 'paciente')
      expect(patientConflict?.local).toMatchObject({ cedula: PATIENT.cedula, nombre: 'Local' })
      expect(patientConflict?.incoming).toMatchObject({ cedula: PATIENT.cedula, nombre: 'Importado' })
    })

    it('previews nothing when no records collide', () => {
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [PATIENT], examenes: [EXAM] })
      expect(previewImportService(testDb.db, filePath)).toHaveLength(0)
    })

    it('throws NOT_FOUND for a missing import file', () => {
      expect(() => previewImportService(testDb.db, path.join(testDb.tmpDir, 'missing.json'))).toThrow(
        ERROR_CODES.NOT_FOUND,
      )
    })

    it('throws VALIDATION_ERROR for malformed import JSON', () => {
      const bad = path.join(testDb.tmpDir, 'bad.json')
      fs.writeFileSync(bad, '{ esto no es json', 'utf8')
      expect(() => previewImportService(testDb.db, bad)).toThrow(ERROR_CODES.VALIDATION_ERROR)
    })

    it('RED: overwrite consumes mergePatientsOverwrite — local patient updated without UNIQUE error', () => {
      const localId = createPatient(testDb.db, PATIENT.cedula, 'Local', 'Paciente')
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [PATIENT], examenes: [] })

      applyImportService(testDb.db, filePath, { [PATIENT.cedula]: 'overwrite' }, makeSession('admin', userId))

      const row = testDb.db.prepare('SELECT * FROM pacientes WHERE cedula = ?').get(PATIENT.cedula) as {
        id: number
        nombres: string
      }
      expect(row.id).toBe(localId) // row identity preserved (orders stay linked)
      expect(row.nombres).toBe('Importado')

      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'import.aplicado'").get() as {
        n: number
      }
      expect(audit.n).toBe(1)
    })

    it('skip leaves the local patient untouched', () => {
      createPatient(testDb.db, PATIENT.cedula, 'Local', 'Paciente')
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [PATIENT], examenes: [] })

      applyImportService(testDb.db, filePath, { [PATIENT.cedula]: 'skip' }, makeSession('admin', userId))

      const row = testDb.db.prepare('SELECT nombres FROM pacientes WHERE cedula = ?').get(PATIENT.cedula) as {
        nombres: string
      }
      expect(row.nombres).toBe('Local')
    })

    it('keepBoth inserts a NEW patient with a disambiguated cedula', () => {
      createPatient(testDb.db, PATIENT.cedula, 'Local', 'Paciente')
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [PATIENT], examenes: [] })

      applyImportService(testDb.db, filePath, { [PATIENT.cedula]: 'keepBoth' }, makeSession('admin', userId))

      const count = testDb.db.prepare('SELECT COUNT(*) AS n FROM pacientes WHERE cedula LIKE ?').get(`${PATIENT.cedula}%`) as {
        n: number
      }
      expect(count.n).toBe(2)
      const imported = testDb.db
        .prepare('SELECT cedula, nombres FROM pacientes WHERE nombres = ?')
        .get('Importado') as { cedula: string }
      expect(imported.cedula).not.toBe(PATIENT.cedula)
    })

    it('non-conflicting exam imports directly and overwrite updates in place', () => {
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [], examenes: [EXAM] })
      applyImportService(testDb.db, filePath, {}, makeSession('admin', userId))
      expect(
        (testDb.db.prepare('SELECT COUNT(*) AS n FROM examenes_catalogo WHERE codigo = ?').get(EXAM.codigo) as {
          n: number
        }).n,
      ).toBe(1)

      // Now the exam exists → overwrite updates nombre in place (no duplicate codigo).
      const updated = { ...EXAM, nombre: 'Examen Sobrescrito' }
      const secondFile = writeImportFile(testDb.tmpDir, { pacientes: [], examenes: [updated] })
      applyImportService(testDb.db, secondFile, { [EXAM.codigo]: 'overwrite' }, makeSession('admin', userId))
      const row = testDb.db.prepare('SELECT nombre FROM examenes_catalogo WHERE codigo = ?').get(EXAM.codigo) as {
        nombre: string
      }
      expect(row.nombre).toBe('Examen Sobrescrito')
    })

    it('keepBoth on an exam disambiguates the codigo', () => {
      createExam(testDb.db, EXAM.codigo, 100)
      const filePath = writeImportFile(testDb.tmpDir, { pacientes: [], examenes: [EXAM] })
      applyImportService(testDb.db, filePath, { [EXAM.codigo]: 'keepBoth' }, makeSession('admin', userId))
      const count = testDb.db.prepare('SELECT COUNT(*) AS n FROM examenes_catalogo WHERE codigo LIKE ?').get(`${EXAM.codigo}%`) as {
        n: number
      }
      expect(count.n).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // export:filtered — CSV/JSON + AES on external export only (A9)
  // -------------------------------------------------------------------------

  describe('export filtered', () => {
    function seedOrder(fecha: string): number {
      const pacienteId = createPatient(testDb.db, `V-${fecha.replace(/-/g, '')}`, 'Exp', 'Paciente')
      const examId = createExam(testDb.db, `EXP${fecha.replace(/-/g, '')}`, 300)
      const ordenId = createOrder(testDb.db, pacienteId, [examId])
      // createOrder leaves fecha_solicitud at the current timestamp; pin it to
      // the seeded date (noon, so the UTC→local read stays on the same day in
      // any timezone) so the date-range filter is actually exercised.
      testDb.db.prepare('UPDATE ordenes SET fecha_solicitud = ? WHERE id = ?').run(`${fecha} 12:00:00`, ordenId)
      return ordenId
    }

    it('exports CSV containing only orders in the date range', () => {
      seedOrder('2026-08-01')
      seedOrder('2026-08-20')
      seedOrder('2026-09-05')

      const csv = exportFilteredService(
        testDb.db,
        { desde: '2026-08-01', hasta: '2026-08-31', formato: 'csv', passphrase: null },
        makeSession('admin', userId),
      )

      expect(csv.startsWith('\uFEFF')).toBe(true)
      expect(csv).toContain('orden_id')
      expect(csv).toContain('2026-08-01')
      expect(csv).toContain('2026-08-20')
      expect(csv).not.toContain('2026-09-05')
    })

    it('exports JSON with the filtered rows', () => {
      seedOrder('2026-08-10')
      const json = exportFilteredService(
        testDb.db,
        { desde: '2026-08-01', hasta: '2026-08-31', formato: 'json', passphrase: null },
        makeSession('admin', userId),
      )
      const parsed = JSON.parse(json) as Array<{ fecha: string }>
      expect(parsed.length).toBe(1)
      expect(parsed[0].fecha).toBe('2026-08-10')
    })

    it('RED: a passphrase encrypts the payload (AES round-trip), null passphrase stays plaintext', () => {
      seedOrder('2026-08-11')
      const req = { desde: '2026-08-01', hasta: '2026-08-31', formato: 'json' as const, passphrase: 'clave' }

      const encrypted = exportFilteredService(testDb.db, req, makeSession('admin', userId))
      expect(encrypted.startsWith('labcore-aes256gcm:v1:')).toBe(true)
      expect(decryptExport('clave', encrypted)).toContain('2026-08-11')

      const plain = exportFilteredService(testDb.db, { ...req, passphrase: null }, makeSession('admin', userId))
      expect(plain.startsWith('labcore-aes256gcm:v1:')).toBe(false)
      expect(plain).toContain('2026-08-11')
    })

    it('audits export.generado with encryption flag', () => {
      seedOrder('2026-08-12')
      exportFilteredService(
        testDb.db,
        { desde: '2026-08-01', hasta: '2026-08-31', formato: 'csv', passphrase: 'k' },
        makeSession('admin', userId),
      )
      const audit = testDb.db.prepare("SELECT despues FROM auditoria WHERE accion = 'export.generado'").get() as {
        despues: string
      }
      expect(JSON.parse(audit.despues)).toMatchObject({ formato: 'csv', cifrado: true })
    })

    it('buildExportData + rowsToCsv quote fields containing commas', () => {
      seedOrder('2026-08-13')
      const rows = buildExportData(testDb.db, '2026-08-01', '2026-08-31')
      expect(rows.length).toBe(1)
      const csv = rowsToCsv(rows)
      expect(csv).toContain('paciente_nombre')
    })
  })
})
