import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  createExam,
  createOrder as helperCreateOrder,
  createPatient,
  createTestDb,
  createUser,
} from '../repositories/test-helpers'
import { registerSamplesForOrder } from '../repositories/samples'
import { buildGuardedHandler } from './register'
import { resultsChannels, RESULT_STATUS, RESULT_TYPE, type Session } from '@/shared/contracts'
import { captureResultService, paramsForCaptureService, validateResultService, reopenResultService } from '../services/results'
import { CAPTURE_ROLES, VALIDATE_ROLES, REOPEN_ROLES } from '../services/validation'
import {
  handleCaptureResult,
  handleCommentResult,
  handleParamsForCapture,
  handleRejectResult,
  handleReopenResult,
  handleValidateResult,
  registerResultsHandlers,
} from './results.ipc'

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

describe('results:capture role guard', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'recepcion1', 'recepcion')
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('blocks recepcion from capturing and audits the denied attempt', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'results:capture',
      CAPTURE_ROLES,
      resultsChannels['results:capture'].request,
      async () => ({ id: 1 }) as never,
      { getSession: () => makeSession('recepcion', 2), writeAudit },
    )

    const result = await handler({}, {
      orden_examen_id: 1,
      parametro_id: 1,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 10 },
      comentario: null,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
    expect(writeAudit).toHaveBeenCalledWith(
      testDb.db,
      expect.objectContaining({
        usuario_id: 2,
        accion: 'permiso.denegado',
        entidad: 'usuario',
        entidad_id: 2,
        despues: { channel: 'results:capture' },
      }),
    )
  })

  it('blocks recepcion from loading capture parameters', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'results:paramsForCapture',
      CAPTURE_ROLES,
      resultsChannels['results:paramsForCapture'].request,
      async () => [] as never,
      { getSession: () => makeSession('recepcion', 2), writeAudit },
    )
    const result = await handler({}, { ordenExamenId: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

describe('results:validate / reopen role guards (WU9b)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()
  let bioId: number
  let adminId: number
  let tecId: number
  let ordenExamenId: number
  let parametroId: number
  let resultId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    adminId = createUser(testDb.db, 'adm1', 'admin')
    tecId = createUser(testDb.db, 'tec1', 'tecnico')
    createUser(testDb.db, 'recepcion1', 'recepcion')
    const patient = createPatient(testDb.db, 'V-80000001')
    const exam = createExam(testDb.db, 'IPC9', 100)
    const ordenId = helperCreateOrder(testDb.db, patient, [exam])
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
    registerSamplesForOrder(testDb.db, ordenId)
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function captureAsTecnico(): void {
    const result = captureResultService(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      makeSession('tecnico', tecId),
    )
    resultId = result.id
  }

  it('RED: tecnico cannot validate — rejected and audited (M7.3)', async () => {
    captureAsTecnico()
    const handler = buildGuardedHandler(
      testDb.db,
      'results:validate',
      VALIDATE_ROLES,
      resultsChannels['results:validate'].request,
      async (db, req, session) => validateResultService(db, req.id, session),
      { getSession: () => makeSession('tecnico', tecId), writeAudit },
    )
    const result = await handler({}, { id: resultId })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
    expect(writeAudit).toHaveBeenCalledWith(
      testDb.db,
      expect.objectContaining({
        usuario_id: tecId,
        accion: 'permiso.denegado',
        despues: { channel: 'results:validate' },
      }),
    )
  })

  it('a bioanalista validates through the guard and the transition is audited', async () => {
    captureAsTecnico()
    const handler = buildGuardedHandler(
      testDb.db,
      'results:validate',
      VALIDATE_ROLES,
      resultsChannels['results:validate'].request,
      async (db, req, session) => validateResultService(db, req.id, session),
      { getSession: () => makeSession('bioanalista', bioId), writeAudit },
    )
    const result = await handler({}, { id: resultId })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
    }
    const auditRows = testDb.db
      .prepare("SELECT accion FROM auditoria WHERE entidad = 'resultado' AND entidad_id = ?")
      .all(resultId) as Array<{ accion: string }>
    expect(auditRows.map((r) => r.accion)).toContain('resultado.validado')
  })

  it('RED: admin reopen is allowed and the override is audited', async () => {
    captureAsTecnico()
    validateResultService(testDb.db, resultId, makeSession('bioanalista', bioId))
    const handler = buildGuardedHandler(
      testDb.db,
      'results:reopen',
      REOPEN_ROLES,
      resultsChannels['results:reopen'].request,
      async (db, req, session) => reopenResultService(db, req.id, req.motivo, session),
      { getSession: () => makeSession('admin', adminId), writeAudit },
    )
    const result = await handler({}, { id: resultId, motivo: 'Corrección de valor' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)
    }
    const auditRows = testDb.db
      .prepare("SELECT accion FROM auditoria WHERE entidad = 'resultado' AND entidad_id = ?")
      .all(resultId) as Array<{ accion: string }>
    expect(auditRows.map((r) => r.accion)).toContain('resultado.reabierto')
  })

  it('a bioanalista cannot reopen through the guard', async () => {
    captureAsTecnico()
    validateResultService(testDb.db, resultId, makeSession('bioanalista', bioId))
    const handler = buildGuardedHandler(
      testDb.db,
      'results:reopen',
      REOPEN_ROLES,
      resultsChannels['results:reopen'].request,
      async (db, req, session) => reopenResultService(db, req.id, req.motivo, session),
      { getSession: () => makeSession('bioanalista', bioId), writeAudit },
    )
    const result = await handler({}, { id: resultId, motivo: 'x' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

describe('results:paramsForCapture through the guard', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  const writeAudit = vi.fn()

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'tec1', 'tecnico')
    const patient = createPatient(testDb.db, 'V-80000002')
    const exam = createExam(testDb.db, 'IPC9A', 100)
    helperCreateOrder(testDb.db, patient, [exam])
    const paramRow = testDb.db
      .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, ?, 1, ?, ?, 1)')
      .run(exam, 'Hemoglobina', 'g/dL', 'numerico')
    const parametroId = Number(paramRow.lastInsertRowid)
    testDb.db
      .prepare(
        `INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, activo)
         VALUES (?, 'M', 'anios', 18, 99, 13.5, 17.5, 1)`,
      )
      .run(parametroId)
    writeAudit.mockReset()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('returns capture parameters with a selected band for a tecnico', async () => {
    const handler = buildGuardedHandler(
      testDb.db,
      'results:paramsForCapture',
      CAPTURE_ROLES,
      resultsChannels['results:paramsForCapture'].request,
      async (db, req) => paramsForCaptureService(db, req.ordenExamenId),
      { getSession: () => makeSession('tecnico', 2), writeAudit },
    )
    const result = await handler({}, { ordenExamenId: 1 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].banda?.sexo).toBe('M')
    }
  })
})

describe('results IPC handler functions (direct coverage)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let bioId: number
  let tecId: number
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    tecId = createUser(testDb.db, 'tec1', 'tecnico')
    const patient = createPatient(testDb.db, 'V-80000003')
    const exam = createExam(testDb.db, 'IPC9H', 100)
    ordenId = helperCreateOrder(testDb.db, patient, [exam])
    const oeRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as {
      id: number
    }
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
    registerSamplesForOrder(testDb.db, ordenId)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('handleParamsForCapture returns capture parameters with a selected band', () => {
    const params = handleParamsForCapture(testDb.db, { ordenExamenId })
    expect(params).toHaveLength(1)
    expect(params[0].banda).not.toBeNull()
  })

  it('handleCaptureResult records a value through the real handler', async () => {
    const result = await handleCaptureResult(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    expect(result.estatus_validacion).toBe(RESULT_STATUS.CAPTURADO)
  })

  it('handleValidateResult validates a captured result through the real handler', async () => {
    const captured = await handleCaptureResult(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    const validated = await handleValidateResult(
      testDb.db,
      { id: captured.id },
      { userId: bioId, usuario: 'bio1', nombre: 'B', rol: 'bioanalista', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    expect(validated.estatus_validacion).toBe(RESULT_STATUS.VALIDADO)
  })

  it('handleRejectResult rejects with a reason through the real handler', async () => {
    const captured = await handleCaptureResult(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    const rejected = await handleRejectResult(
      testDb.db,
      { id: captured.id, motivo: 'Muestra hemolizada' },
      { userId: bioId, usuario: 'bio1', nombre: 'B', rol: 'bioanalista', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    expect(rejected.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)
    expect(rejected.motivo_rechazo).toBe('Muestra hemolizada')
  })

  it('handleReopenResult reopens a validated result through the real handler', async () => {
    const adminId = createUser(testDb.db, 'adm1', 'admin')
    const captured = await handleCaptureResult(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    await handleValidateResult(
      testDb.db,
      { id: captured.id },
      { userId: bioId, usuario: 'bio1', nombre: 'B', rol: 'bioanalista', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    const reopened = await handleReopenResult(
      testDb.db,
      { id: captured.id, motivo: 'Corrección' },
      { userId: adminId, usuario: 'adm1', nombre: 'A', rol: 'admin', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    expect(reopened.estatus_validacion).toBe(RESULT_STATUS.PENDIENTE)
  })

  it('handleCommentResult stores a per-exam comment', async () => {
    const captured = await handleCaptureResult(
      testDb.db,
      { orden_examen_id: ordenExamenId, parametro_id: parametroId, valor: { tipo: RESULT_TYPE.NUMERICO, valor: 85 }, comentario: null },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    const commented = await handleCommentResult(
      testDb.db,
      { id: captured.id, comentario: 'Muestra sin hemólisis' },
      { userId: tecId, usuario: 'tec1', nombre: 'T', rol: 'tecnico', loginAt: new Date().toISOString(), debe_cambiar_clave: false },
    )
    expect(commented.comentario).toBe('Muestra sin hemólisis')
  })

  it('registerResultsHandlers registers every results channel on ipcMain', async () => {
    const { ipcMain } = await import('electron')
    const handleSpy = vi.mocked(ipcMain.handle)
    handleSpy.mockClear()
    registerResultsHandlers(testDb.db)
    expect(handleSpy).toHaveBeenCalledTimes(Object.keys(resultsChannels).length)
    for (const channel of Object.keys(resultsChannels)) {
      expect(handleSpy).toHaveBeenCalledWith(channel, expect.any(Function))
    }
  })
})
