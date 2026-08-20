import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Session } from '@/shared/contracts'
import { ERROR_CODES, RESULT_STATUS, RESULT_TYPE, ROLES } from '@/shared/contracts'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { registerSamplesForOrder } from '../repositories/samples'
import { getSampleByOrderExam } from '../repositories/samples'
import {
  captureResultService,
  paramsForCaptureService,
  rejectResultService,
  reopenResultService,
  validateResultService,
} from './results'

function makeSession(role: 'admin' | 'bioanalista' | 'tecnico', userId: number): Session {
  return {
    userId,
    usuario: `user${userId}`,
    nombre: 'Usuario',
    rol: role,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

describe('result capture — sex/age-correct bands and flagging (WU9a)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number
  let bioId: number
  let tecId: number
  let examId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    tecId = createUser(testDb.db, 'tec1', 'tecnico')
    const patient = createPatient(testDb.db, 'V-90000001', 'Carlos', 'Pérez') // born 1985-03-15, M
    examId = createExam(testDb.db, 'RXWU9', 100)
    ordenId = helperCreateOrder(testDb.db, patient, [examId])
    const oeRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    ordenExamenId = oeRow.id

    const paramRow = testDb.db
      .prepare(
        'INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, ?, 1, ?, ?, 1)',
      )
      .run(examId, 'Hemoglobina', 'g/dL', 'numerico')
    parametroId = Number(paramRow.lastInsertRowid)

    // Sex-specific adult bands + a neonate days band; the patient is a 40+ year
    // old male, so only the male adult band must match.
    const insertRange = testDb.db.prepare(
      `INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, valor_min_critico, valor_max_critico, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    insertRange.run(parametroId, 'M', 'anios', 18, 99, 13.5, 17.5, 7, 22)
    insertRange.run(parametroId, 'F', 'anios', 18, 99, 12.0, 16.0, null, null)
    insertRange.run(parametroId, 'Ambos', 'dias', 0, 28, 14, 22, null, null)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('RED: male patient gets the male-adult band ONLY at capture time (M7.1)', () => {
    const params = paramsForCaptureService(testDb.db, ordenExamenId)
    expect(params).toHaveLength(1)
    const param = params[0]
    expect(param.banda).not.toBeNull()
    expect(param.banda?.sexo).toBe('M')
    expect(param.banda?.edad_min).toBe(18)
    expect(param.banda?.valor_min).toBe(13.5)
    expect(param.banda?.valor_max).toBe(17.5)
    // Never the female band nor the neonate band.
    expect(param.banda?.sexo).not.toBe('F')
    expect(param.banda?.edad_unidad).not.toBe('dias')
  })

  it('bioanalista capture validates immediately and marks the sample Resultada', async () => {
    registerSamplesForOrder(testDb.db, ordenId)
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 15 }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(result.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
    expect(result.validado_por).toBe(bioId)
    expect(result.flag).toBeNull()
    const sample = getSampleByOrderExam(testDb.db, ordenExamenId)
    expect(sample?.estatus).toBe('Resultada')
  })

  it('tecnico capture stays Capturado and does not mark the sample Resultada', () => {
    registerSamplesForOrder(testDb.db, ordenId)
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 15 }, comentario: null },
      makeSession(ROLES.TECNICO, tecId),
    )
    expect(result.estatus_validacion).toBe(RESULT_STATUS.CAPTURADO)
    expect(result.validado_por).toBeNull()
    const sample = getSampleByOrderExam(testDb.db, ordenExamenId)
    expect(sample?.estatus).toBe('Recolectada')
  })

  it('auto-flags an out-of-range value (M7.6)', () => {
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 20 }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(result.flag).toBe('alto')
  })

  it('auto-flags a critical value (M7.6)', () => {
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 23 }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(result.flag).toBe('critico')
  })

  it('does not flag a normal qualitative value', () => {
    const qualParam = testDb.db
      .prepare(
        `INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, opciones_cualitativas, activo)
         VALUES (?, 'Reaccion', 2, NULL, 'cualitativo', ?, 1)`,
      )
      .run(examId, JSON.stringify(['No reactivo', 'Reactivo']))
    const qualId = Number(qualParam.lastInsertRowid)
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: qualId, valor: { tipo: RESULT_TYPE.CUALITATIVO, valor: 'Reactivo' }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(result.valor_cualitativo).toBe('Reactivo')
    expect(result.flag).toBeNull()
  })

  it('rejects capture when the parameter belongs to another exam', () => {
    const otherExam = createExam(testDb.db, 'RXOTHER', 50)
    const otherParam = testDb.db
      .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado) VALUES (?, ?, 1, ?, ?)')
      .run(otherExam, 'Otro', 'U/L', 'numerico')
    expect(() =>
      captureResultService(
        testDb.db,
        { orden_examen_id: ordenExamenId, parametro_id: Number(otherParam.lastInsertRowid), valor: { tipo: RESULT_TYPE.NUMERICO, valor: 1 }, comentario: null },
        makeSession(ROLES.BIOANALISTA, bioId),
      ),
    ).toThrow(ERROR_CODES.CONFLICT)
  })

  it('a Validado result rejects capture without reopening (immutability M7.5)', () => {
    captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 15 }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(() =>
      captureResultService(
        testDb.db,
        { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 16 }, comentario: null },
        makeSession(ROLES.TECNICO, tecId),
      ),
    ).toThrow(ERROR_CODES.CONFLICT)
  })

  it('paramsForCapture attaches the main-computed flag of the existing result', () => {
    captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 23 }, comentario: null },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    const params = paramsForCaptureService(testDb.db, ordenExamenId)
    expect(params[0].resultado?.flag).toBe('critico')
    expect(params[0].resultado?.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
  })
})

describe('result validation workflow (WU9b)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number
  let bioId: number
  let adminId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    adminId = createUser(testDb.db, 'adm1', 'admin')
    createUser(testDb.db, 'tec1', 'tecnico')
    const patient = createPatient(testDb.db, 'V-90000002')
    const exam = createExam(testDb.db, 'RXWU9B', 100)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
    const oeRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    ordenExamenId = oeRow.id
    const paramRow = testDb.db
      .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, ?, 1, ?, ?, 1)')
      .run(exam, 'Glicemia', 'mg/dL', 'numerico')
    parametroId = Number(paramRow.lastInsertRowid)
    testDb.db
      .prepare(
        `INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, activo)
         VALUES (?, 'Ambos', 'anios', 0, 120, 70, 100, 1)`,
      )
      .run(parametroId)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function captureAsTecnico(): number {
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      makeSession(ROLES.TECNICO, 3),
    )
    return result.id
  }

  it('validate advances a Capturado result to Validado and marks the sample Resultada', () => {
    registerSamplesForOrder(testDb.db, ordenId)
    const id = captureAsTecnico()
    const result = validateResultService(testDb.db, id, makeSession(ROLES.BIOANALISTA, bioId))
    expect(result.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
    expect(result.validado_por).toBe(bioId)
    expect(getSampleByOrderExam(testDb.db, ordenExamenId)?.estatus).toBe('Resultada')
  })

  it('a tecnico cannot validate (M7.3)', () => {
    const id = captureAsTecnico()
    expect(() => validateResultService(testDb.db, id, makeSession(ROLES.TECNICO, 3))).toThrow(ERROR_CODES.CONFLICT)
  })

  it('reject returns a Capturado result to Pendiente with the reason stored (M7.4)', () => {
    const id = captureAsTecnico()
    const result = rejectResultService(testDb.db, id, 'Muestra hemolizada', makeSession(ROLES.BIOANALISTA, bioId))
    expect(result.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)
    expect(result.motivo_rechazo).toBe('Muestra hemolizada')
    expect(result.validado_por).toBeNull()
  })

  it('reopen is admin-only and returns a Validado result to Pendiente (M7.5)', () => {
    const id = captureAsTecnico()
    validateResultService(testDb.db, id, makeSession(ROLES.BIOANALISTA, bioId))
    const reopened = reopenResultService(testDb.db, id, 'Corrección de valor', makeSession(ROLES.ADMIN, adminId))
    expect(reopened.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)
    expect(reopened.validado_por).toBeNull()
  })

  it('a bioanalista cannot reopen (admin override only)', () => {
    const id = captureAsTecnico()
    validateResultService(testDb.db, id, makeSession(ROLES.BIOANALISTA, bioId))
    expect(() => reopenResultService(testDb.db, id, 'x', makeSession(ROLES.BIOANALISTA, bioId))).toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it('reject on a Validado result is blocked without reopening', () => {
    const id = captureAsTecnico()
    validateResultService(testDb.db, id, makeSession(ROLES.BIOANALISTA, bioId))
    expect(() => rejectResultService(testDb.db, id, 'x', makeSession(ROLES.BIOANALISTA, bioId))).toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it('capture after reopen re-validates immediately for a bioanalista', () => {
    const id = captureAsTecnico()
    validateResultService(testDb.db, id, makeSession(ROLES.BIOANALISTA, bioId))
    reopenResultService(testDb.db, id, 'Rehacer', makeSession(ROLES.ADMIN, adminId))
    const recaptured = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 92 }, comentario: 'nuevo' },
      makeSession(ROLES.BIOANALISTA, bioId),
    )
    expect(recaptured.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
    expect(recaptured.valor_numerico).toBe(92)
    expect(recaptured.motivo_rechazo).toBeNull()
  })
})
