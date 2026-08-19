import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from './test-helpers'
import { createResult, getResult, listResultsByOrder, setResultValidation, updateResultValue } from './results'

describe('results repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let ordenId: number
  let parametroId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'bio1', 'bioanalista')
    const patient = createPatient(testDb.db, 'V-30000001')
    const exam = createExam(testDb.db, 'RX01', 100)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
    const paramRow = testDb.db
      .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado) VALUES (?, ?, 1, ?, ?)')
      .run(exam, 'Parametro', 'mg/dL', 'numerico')
    parametroId = Number(paramRow.lastInsertRowid)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates a numeric result', () => {
    const result = createResult(testDb.db, {
      orden_id: ordenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 10.5 },
      usuario_id: 1,
    })
    expect(result.valor_numerico).toBe(10.5)
    expect(result.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)

    const found = getResult(testDb.db, result.id)
    expect(found?.valor_numerico).toBe(10.5)
  })

  it('creates a qualitative result', () => {
    const result = createResult(testDb.db, {
      orden_id: ordenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.CUALITATIVO, valor: 'Reactivo' },
    })
    expect(result.valor_cualitativo).toBe('Reactivo')
    expect(result.valor_numerico).toBeNull()
  })

  it('lists results by order', () => {
    createResult(testDb.db, {
      orden_id: ordenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
    })
    const results = listResultsByOrder(testDb.db, ordenId)
    expect(results).toHaveLength(1)
  })

  it('updates result value and flag', () => {
    const result = createResult(testDb.db, {
      orden_id: ordenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
    })
    const updated = updateResultValue(testDb.db, result.id, {
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 8 },
      flag: 'alto',
    })
    expect(updated.valor_numerico).toBe(8)
    expect(updated.flag).toBe('alto')
  })

  it('sets validation status', () => {
    const result = createResult(testDb.db, {
      orden_id: ordenId,
      parametro_id: parametroId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 5 },
    })
    const validated = setResultValidation(testDb.db, result.id, 'Validado', 1)
    expect(validated.estatus_validacion).toBe('Validado')
    expect(validated.validado_por).toBe(1)
    expect(validated.validado_en).not.toBeNull()
  })
})
