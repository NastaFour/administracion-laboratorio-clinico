import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import {
  createExam,
  createOrder as helperCreateOrder,
  createPatient,
  createTestDb,
  createUser,
} from './test-helpers'
import { loadMigrationsFromDir, runMigrations } from '../migrations/runner'
import {
  createResult,
  getResult,
  getResultByOrderExamAndParam,
  listResultsByOrder,
  setResultMotivoRechazo,
  setResultValidation,
  updateResultValue,
} from './results'

describe('results repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'bio1', 'bioanalista')
    const patient = createPatient(testDb.db, 'V-30000001')
    const exam = createExam(testDb.db, 'RX01', 100)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
    const oeRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as {
      id: number
    }
    ordenExamenId = oeRow.id
    const paramRow = testDb.db
      .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado) VALUES (?, ?, 1, ?, ?)')
      .run(exam, 'Parametro', 'mg/dL', 'numerico')
    parametroId = Number(paramRow.lastInsertRowid)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates a numeric result linked to the order exam', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 10.5 },
      estatus: RESULT_STATUS.PENDIENTE,
      validado_por: 1,
    })
    expect(result.valor_numerico).toBe(10.5)
    expect(result.orden_examen_id).toBe(ordenExamenId)
    expect(result.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)

    const found = getResult(testDb.db, result.id)
    expect(found?.valor_numerico).toBe(10.5)
  })

  it('creates an immediately-validated result with validado_en stamped', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 15 },
      estatus: RESULT_STATUS.VALIDADO,
      validado_por: 1,
    })
    expect(result.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
    expect(result.validado_por).toBe(1)
    expect(result.validado_en).not.toBeNull()
  })

  it('creates a qualitative result', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.CUALITATIVO, valor: 'Reactivo' },
      estatus: RESULT_STATUS.PENDIENTE,
    })
    expect(result.valor_cualitativo).toBe('Reactivo')
    expect(result.valor_numerico).toBeNull()
  })

  it('finds the result for an order exam + parameter pair', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
      estatus: RESULT_STATUS.PENDIENTE,
    })
    const found = getResultByOrderExamAndParam(testDb.db, ordenExamenId, parametroId)
    expect(found?.id).toBe(result.id)
    expect(getResultByOrderExamAndParam(testDb.db, ordenExamenId, 999)).toBeNull()
  })

  it('lists results by order through the order exam junction', () => {
    createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
      estatus: RESULT_STATUS.PENDIENTE,
    })
    const results = listResultsByOrder(testDb.db, ordenId)
    expect(results).toHaveLength(1)
  })

  it('updates result value and flag, clearing any rejection reason', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
      estatus: RESULT_STATUS.PENDIENTE,
    })
    setResultMotivoRechazo(testDb.db, result.id, 'Muestra hemolizada')
    const updated = updateResultValue(testDb.db, result.id, {
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 8 },
      flag: 'alto',
    })
    expect(updated.valor_numerico).toBe(8)
    expect(updated.flag).toBe('alto')
    expect(updated.motivo_rechazo).toBeNull()
  })

  it('sets validation status', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
      estatus: RESULT_STATUS.CAPTURADO,
    })
    const validated = setResultValidation(testDb.db, result.id, 'Validado', 1)
    expect(validated.estatus_validacion).toBe('Validado')
    expect(validated.validado_por).toBe(1)
    expect(validated.validado_en).not.toBeNull()
  })

  it('stores and clears the rejection reason', () => {
    const result = createResult(testDb.db, {
      orden_examen_id: ordenExamenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
      estatus: RESULT_STATUS.CAPTURADO,
    })
    const rejected = setResultMotivoRechazo(testDb.db, result.id, 'Muestra hemolizada')
    expect(rejected.motivo_rechazo).toBe('Muestra hemolizada')
    const reset = setResultValidation(testDb.db, result.id, 'Pendiente', null)
    expect(reset.motivo_rechazo).toBeNull()
  })
})

describe('migration 004 backfill (schema-contract drift fix)', () => {
  it('backfills orden_examen_id for legacy rows from orden_id + parametro_id', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labcore-mig004-'))
    const dbPath = path.join(tmpDir, 'test.db')
    const backupsDir = path.join(tmpDir, 'backups')
    const migrationsDir = path.join(__dirname, '../migrations')
    const all = loadMigrationsFromDir(migrationsDir)

    try {
      // Apply migrations 001-003 only, then insert legacy v1-style data.
      await runMigrations(dbPath, all.filter((m) => m.version <= 3), backupsDir)
      const db = new Database(dbPath)
      db.pragma('foreign_keys = ON')

      const exam = createExam(db, 'M004', 100)
      const paramRow = db
        .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad) VALUES (?, ?, 1, ?)')
        .run(exam, 'Parametro', 'mg/dL')
      const parametroId = Number(paramRow.lastInsertRowid)
      const patient = createPatient(db, 'V-40000001')
      const ordenId = helperCreateOrder(db, patient, [exam])
      const oeRow = db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }

      // v1 result: orden_id only, no orden_examen_id column yet.
      db.prepare('INSERT INTO resultados (orden_id, parametro_id, valor_texto) VALUES (?, ?, ?)').run(
        ordenId,
        parametroId,
        '12',
      )
      db.close()

      // Apply 004 and verify the legacy row is linked to the right order exam.
      await runMigrations(dbPath, all.filter((m) => m.version === 4), backupsDir)
      const upgraded = new Database(dbPath)
      const row = upgraded.prepare('SELECT orden_examen_id FROM resultados').get() as {
        orden_examen_id: number | null
      }
      expect(row.orden_examen_id).toBe(oeRow.id)
      upgraded.close()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
