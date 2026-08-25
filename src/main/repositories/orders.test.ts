import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { ERROR_CODES } from '@/shared/contracts'
import { createExam, createPatient, createTestDb, createUser } from './test-helpers'
import { createOrder, getOrder, listOrders, setOrderAnulada, setOrderCerrada, updateOrder, updateOrderStatus } from './orders'

function seedSampledExamRow(db: Awaited<ReturnType<typeof createTestDb>>['db'], ordenId: number): number {
  const junction = db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
  db.prepare(
    "INSERT INTO muestras (orden_examen_id, tipo_muestra, codigo, estatus) VALUES (?, 'Sangre', 'M-REG-0001', 'Recolectada')",
  ).run(junction.id)
  return junction.id
}

describe('orders repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates an order with exam list and computes total', () => {
    const patient = createPatient(testDb.db, 'V-10000001')
    const exam1 = createExam(testDb.db, 'EXM01', 500)
    const exam2 = createExam(testDb.db, 'EXM02', 300)

    const order = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [
        { examen_id: exam1, precio: 500, tercerizado: false, proveedor: null, comentario: null },
        { examen_id: exam2, precio: 300, tercerizado: false, proveedor: null, comentario: null },
      ],
      observaciones: 'Ayunas 12h',
    })

    expect(order.id).toBeGreaterThan(0)
    expect(order.total_bs).toBe(800)
    expect(order.examenes).toHaveLength(2)
    expect(order.estatus).toBe('Pendiente')
  })

  it('retrieves an order by id', () => {
    const patient = createPatient(testDb.db, 'V-10000002')
    const exam = createExam(testDb.db, 'EXM03', 100)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })

    const found = getOrder(testDb.db, created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.examenes[0].examen_id).toBe(exam)
  })

  it('lists orders with filters', () => {
    const patient = createPatient(testDb.db, 'V-10000003')
    const exam = createExam(testDb.db, 'EXM04', 100)
    createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })

    const byPatient = listOrders(testDb.db, { pacienteId: patient })
    expect(byPatient).toHaveLength(1)

    const byStatus = listOrders(testDb.db, { estatus: 'Pendiente' })
    expect(byStatus).toHaveLength(1)

    const empty = listOrders(testDb.db, { estatus: 'Entregada' })
    expect(empty).toHaveLength(0)
  })

  it('updates an order before it is closed', () => {
    const patient = createPatient(testDb.db, 'V-10000004')
    const exam1 = createExam(testDb.db, 'EXM05', 100)
    const exam2 = createExam(testDb.db, 'EXM06', 200)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam1, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })

    const updated = updateOrder(testDb.db, {
      id: created.id,
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam2, precio: 200, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: 'Updated',
    })

    expect(updated.total_bs).toBe(200)
    expect(updated.examenes[0].examen_id).toBe(exam2)
  })

  it('updates an order whose exam already has a sample, keeping the row identity (S-JD2 regression)', () => {
    const patient = createPatient(testDb.db, 'V-10000008')
    const exam1 = createExam(testDb.db, 'EXM10', 100)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam1, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })
    const junctionId = seedSampledExamRow(testDb.db, created.id)

    const updated = updateOrder(testDb.db, {
      id: created.id,
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam1, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: 'Edited after sampling',
    })

    expect(updated.observaciones).toBe('Edited after sampling')
    expect(updated.examenes).toHaveLength(1)
    // The SAME orden_examenes row survived (no delete+reinsert), so the
    // sample's FK still resolves to it.
    expect(updated.examenes[0].id).toBe(junctionId)
    const sample = testDb.db.prepare('SELECT orden_examen_id FROM muestras WHERE codigo = ?').get('M-REG-0001') as {
      orden_examen_id: number
    }
    expect(sample.orden_examen_id).toBe(junctionId)
  })

  it('rejects removing an exam that has samples/results with a typed CONFLICT (S-JD2 regression)', () => {
    const patient = createPatient(testDb.db, 'V-10000009')
    const exam1 = createExam(testDb.db, 'EXM11', 100)
    const exam2 = createExam(testDb.db, 'EXM12', 200)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam1, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })
    seedSampledExamRow(testDb.db, created.id)

    expect(() =>
      updateOrder(testDb.db, {
        id: created.id,
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam2, precio: 200, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      }),
    ).toThrow(ERROR_CODES.CONFLICT)

    // Nothing was written: the order keeps its original exam line and total.
    const untouched = getOrder(testDb.db, created.id)
    expect(untouched?.examenes).toHaveLength(1)
    expect(untouched?.examenes[0].examen_id).toBe(exam1)
    expect(untouched?.total_bs).toBe(100)
  })

  it('rejects edits on closed orders', () => {
    const patient = createPatient(testDb.db, 'V-10000005')
    const exam = createExam(testDb.db, 'EXM07', 100)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })
    setOrderCerrada(testDb.db, created.id, true)

    expect(() =>
      updateOrder(testDb.db, {
        id: created.id,
        paciente_id: patient,
        medico_id: null,
        empresa_id: null,
        examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
        observaciones: null,
      }),
    ).toThrow('Cannot edit a closed order')
  })

  it('advances order status', () => {
    const patient = createPatient(testDb.db, 'V-10000006')
    const exam = createExam(testDb.db, 'EXM08', 100)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })

    const processing = updateOrderStatus(testDb.db, created.id, 'Procesando')
    expect(processing.estatus).toBe('Procesando')
  })

  it('voids an order with a reason', () => {
    const patient = createPatient(testDb.db, 'V-10000007')
    const exam = createExam(testDb.db, 'EXM09', 100)
    const created = createOrder(testDb.db, {
      paciente_id: patient,
      medico_id: null,
      empresa_id: null,
      examenes: [{ examen_id: exam, precio: 100, tercerizado: false, proveedor: null, comentario: null }],
      observaciones: null,
    })

    const voided = setOrderAnulada(testDb.db, created.id, 'Muestra rechazada')
    expect(voided.anulada).toBe(true)
    expect(voided.motivo_anulacion).toBe('Muestra rechazada')
  })
})
