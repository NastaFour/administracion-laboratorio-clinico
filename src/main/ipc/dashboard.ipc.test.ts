import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { dashboardChannels, ERROR_CODES, type Session } from '@/shared/contracts'
import { createResult } from '../repositories/results'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import {
  handleDashboardDebtors,
  handleDashboardPatientAnalytes,
  handleDashboardStats,
  handleDashboardToday,
  handleDashboardTrends,
  registerDashboardHandlers,
} from './dashboard.ipc'

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

describe('dashboard IPC', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let pacienteId: number
  let examId: number
  let junctionId: number
  let paramId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'tec1', 'tecnico')
    pacienteId = createPatient(testDb.db, 'V-60000001')
    examId = createExam(testDb.db, 'DASH01', 500)
    paramId = Number(
      testDb.db
        .prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, 'Glucosa', 1, 'mg/dL', 'numerico', 1)")
        .run(examId)
        .lastInsertRowid,
    )
    junctionId = helperCreateOrder(testDb.db, pacienteId, [examId])
    const junctionRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ? LIMIT 1').get(junctionId) as { id: number }
    junctionId = junctionRow.id
    createResult(testDb.db, {
      orden_examen_id: junctionId,
      parametro_id: paramId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 95 },
      estatus: RESULT_STATUS.VALIDADO,
      validado_por: 1,
    })
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('role guards (dashboard visible to every role)', () => {
    it.each(['admin', 'bioanalista', 'tecnico', 'recepcion'] as const)(
      'allows %s to read dashboard:today',
      async (role) => {
        const handler = buildGuardedHandler(
          testDb.db,
          'dashboard:today',
          ['admin', 'bioanalista', 'tecnico', 'recepcion'],
          dashboardChannels['dashboard:today'].request,
          async () => ({ ordenes_hoy: 1 }) as never,
          { getSession: () => makeSession(role, 1), writeAudit: vi.fn() },
        )
        const result = await handler({}, {})
        expect(result.ok).toBe(true)
      },
    )

    it('blocks an anonymous caller with PERMISSION_DENIED', async () => {
      const handler = buildGuardedHandler(
        testDb.db,
        'dashboard:today',
        ['admin', 'bioanalista', 'tecnico', 'recepcion'],
        dashboardChannels['dashboard:today'].request,
        async () => ({ ordenes_hoy: 1 }) as never,
        { getSession: () => null, writeAudit: vi.fn() },
      )
      const result = await handler({}, {})
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('handlers read real aggregates', () => {
    it('dashboard:today returns the seeded order count and revenue', () => {
      const kpis = handleDashboardToday(testDb.db, {})
      expect(kpis.ordenes_hoy).toBe(1)
      expect(kpis.resultados_pendientes).toBe(0)
      expect(kpis.ingreso_bs).toBe(0)
    })

    it('dashboard:debtors lists the unpaid seeded order in the 0-30 bucket', () => {
      const debtors = handleDashboardDebtors(testDb.db, {})
      expect(debtors).toHaveLength(1)
      expect(debtors[0]).toMatchObject({ rango: '0-30', saldo_bs: 500, dias_pendientes: 0 })
    })

    it('dashboard:stats returns top exams + monthly revenue for the range', () => {
      const stats = handleDashboardStats(testDb.db, { desde: '2026-08-01', hasta: '2026-08-31' })
      expect(stats.top_examenes).toHaveLength(1)
      expect(stats.top_examenes[0]).toMatchObject({ examen_nombre: 'Examen DASH01', cantidad: 1, ingreso_bs: 500 })
    })

    it('dashboard:trends returns the seeded numeric series for the patient + analyte', () => {
      const trend = handleDashboardTrends(testDb.db, { pacienteId, parametroId: paramId })
      expect(trend.puntos).toHaveLength(1)
      expect(trend.puntos[0].valor).toBe(95)
    })

    it('dashboard:patientAnalytes lists the analyte the patient has numeric results for', () => {
      const analytes = handleDashboardPatientAnalytes(testDb.db, { pacienteId })
      expect(analytes).toHaveLength(1)
      expect(analytes[0].parametro_nombre).toBe('Glucosa')
    })

    it('rejects a malformed request payload (validation on the main side)', async () => {
      const handler = buildGuardedHandler(
        testDb.db,
        'dashboard:stats',
        ['admin', 'bioanalista', 'tecnico', 'recepcion'],
        dashboardChannels['dashboard:stats'].request,
        async () => ({}) as never,
        { getSession: () => makeSession('admin', 1), writeAudit: vi.fn() },
      )
      const result = await handler({}, { desde: 'not-a-date' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('registration', () => {
    it('registerDashboardHandlers registers every dashboard channel', async () => {
      const { ipcMain } = await import('electron')
      const handleSpy = vi.mocked(ipcMain.handle)
      handleSpy.mockClear()
      registerDashboardHandlers(testDb.db)
      expect(handleSpy).toHaveBeenCalledTimes(Object.keys(dashboardChannels).length)
      for (const channel of Object.keys(dashboardChannels)) {
        expect(handleSpy).toHaveBeenCalledWith(channel, expect.any(Function))
      }
    })
  })
})