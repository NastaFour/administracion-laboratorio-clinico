import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import {
  advanceOrderStatusService,
  authorizeOrderCreditService,
  createOrderService,
  deliverOrderService,
  updateOrderService,
  voidOrderService,
} from './orders'
import { setOrderCerrada } from '../repositories/orders'
import { recordPayment } from '../repositories/payments'
import type { Session } from '@/shared/contracts'
import { ERROR_CODES, ORDER_STATUS, PAYMENT_METHOD } from '@/shared/contracts'

const fakeSession = (role: Session['rol'] = 'admin', userId = 1): Session => ({
  userId,
  usuario: `user${userId}`,
  nombre: `Usuario ${userId}`,
  rol: role,
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
})

function lastAudit(db: Awaited<ReturnType<typeof createTestDb>>['db']) {
  return db.prepare('SELECT * FROM auditoria ORDER BY id DESC LIMIT 1').get() as
    | Record<string, unknown>
    | undefined
}

describe('orders service', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates an order, computes total from catalog, and audits', async () => {
    const patient = createPatient(testDb.db, 'V-20000001')
    const exam1 = createExam(testDb.db, 'EXM10', 400)
    const exam2 = createExam(testDb.db, 'EXM11', 600)

    const order = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [
          { examen_id: exam1, precio: 400, tercerizado: false, proveedor: null, comentario: null },
          { examen_id: exam2, precio: 600, tercerizado: false, proveedor: null, comentario: null },
        ],
        observaciones: 'Ayunas 12h',
      },
      fakeSession(),
    )

    expect(order.total_bs).toBe(1000)
    expect(order.examenes).toHaveLength(2)
    expect(order.estatus).toBe(ORDER_STATUS.PENDIENTE)

    const audit = lastAudit(testDb.db)
    expect(audit?.accion).toBe('orden.creada')
    expect(audit?.entidad_id).toBe(order.id)
  })

  it('rejects edits on closed orders', async () => {
    const patient = createPatient(testDb.db, 'V-20000002')
    const exam = createExam(testDb.db, 'EXM12', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )
    setOrderCerrada(testDb.db, created.id, true)

    await expect(
      updateOrderService(
        testDb.db,
        {
          id: created.id,
          paciente_id: patient,
          medico_id: null,
          empresa_id: null,
          examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
          observaciones: null,
        },
        fakeSession(),
      ),
    ).rejects.toThrow('Cannot edit a closed order')
  })

  it('advances status and locks on Completada', async () => {
    const patient = createPatient(testDb.db, 'V-20000003')
    const exam = createExam(testDb.db, 'EXM13', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )

    const processing = await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    expect(processing.estatus).toBe(ORDER_STATUS.PROCESANDO)

    const completed = await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    expect(completed.estatus).toBe(ORDER_STATUS.COMPLETADA)
    expect(completed.cerrada).toBe(true)

    const audit = lastAudit(testDb.db)
    expect(audit?.accion).toBe('orden.estatus.avanzado')
  })

  it('delivers only from Completada', async () => {
    const patient = createPatient(testDb.db, 'V-20000004')
    const exam = createExam(testDb.db, 'EXM14', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )

    await expect(deliverOrderService(testDb.db, created.id, fakeSession())).rejects.toThrow(ERROR_CODES.CONFLICT)

    await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    // Settle the balance so the delivery-block gate (M9.7) permits delivery.
    recordPayment(testDb.db, {
      orden_id: created.id,
      cuenta_id: null,
      metodo: PAYMENT_METHOD.EFECTIVO,
      monto_bs: 100,
      monto_usd: 0,
      referencia: null,
      fecha: '2026-08-18',
      usuario_id: 1,
    })
    const delivered = await deliverOrderService(testDb.db, created.id, fakeSession())
    expect(delivered.estatus).toBe(ORDER_STATUS.ENTREGADA)
  })

  it('RED: blocks delivery while a balance is pending (not on credit)', async () => {
    const patient = createPatient(testDb.db, 'V-20000007')
    const exam = createExam(testDb.db, 'EXM17', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )
    await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    await advanceOrderStatusService(testDb.db, created.id, fakeSession())

    await expect(deliverOrderService(testDb.db, created.id, fakeSession())).rejects.toThrow(
      ERROR_CODES.PENDING_BALANCE,
    )
  })

  it('RED: an authorized credit account delivers despite an open balance', async () => {
    const patient = createPatient(testDb.db, 'V-20000008')
    const exam = createExam(testDb.db, 'EXM18', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )
    await authorizeOrderCreditService(testDb.db, created.id, 100, 'Paciente habitual', fakeSession('bioanalista'))
    await advanceOrderStatusService(testDb.db, created.id, fakeSession())
    await advanceOrderStatusService(testDb.db, created.id, fakeSession())

    const delivered = await deliverOrderService(testDb.db, created.id, fakeSession())
    expect(delivered.estatus).toBe(ORDER_STATUS.ENTREGADA)
  })

  it('voids an order with reason and audits', async () => {
    const patient = createPatient(testDb.db, 'V-20000005')
    const exam = createExam(testDb.db, 'EXM15', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession(),
    )

    const voided = await voidOrderService(testDb.db, created.id, 'Muestra rechazada', fakeSession())
    expect(voided.anulada).toBe(true)
    expect(voided.motivo_anulacion).toBe('Muestra rechazada')

    const audit = lastAudit(testDb.db)
    expect(audit?.accion).toBe('orden.anulada')
  })

  it('authorizes credit, sets credito flag, and audits', async () => {
    const patient = createPatient(testDb.db, 'V-20000006')
    const exam = createExam(testDb.db, 'EXM16', 100)
    const created = await createOrderService(
      testDb.db,
      {
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      },
      fakeSession('bioanalista'),
    )

    const authorized = await authorizeOrderCreditService(testDb.db, created.id, 150, 'Paciente habitual', fakeSession('bioanalista'))
    expect(authorized.credito).toBe(true)

    const audit = lastAudit(testDb.db)
    expect(audit?.accion).toBe('orden.credito.autorizado')
    expect(JSON.parse((audit?.despues as string) ?? '{}')).toMatchObject({
      credito: true,
      monto: 150,
      motivo: 'Paciente habitual',
    })
  })
})
