import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from './test-helpers'
import { getSample, listSamplesByOrder, registerSamplesForOrder, rejectSample, updateSampleStatus } from './samples'

describe('samples repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function createOrderWithExams(): number {
    const patient = createPatient(testDb.db, 'V-20000001')
    const exam1 = createExam(testDb.db, 'SX01', 100)
    const exam2 = createExam(testDb.db, 'SX02', 100)
    return helperCreateOrder(testDb.db, patient, [exam1, exam2])
  }

  it('registers one sample per order exam', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    expect(samples).toHaveLength(2)
    expect(samples[0].codigo).toMatch(/^SM-/)
    expect(samples[0].estatus).toBe('Recolectada')

    const listed = listSamplesByOrder(testDb.db, ordenId)
    expect(listed).toHaveLength(2)
  })

  it('updates sample status', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const updated = updateSampleStatus(testDb.db, samples[0].id, 'En proceso')
    expect(updated.estatus).toBe('En proceso')

    const found = getSample(testDb.db, samples[0].id)
    expect(found?.estatus).toBe('En proceso')
  })

  it('rejects a sample with a reason', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const rejected = rejectSample(testDb.db, samples[0].id, 'Hemólisis')
    expect(rejected.estatus).toBe('Rechazada')
    expect(rejected.motivo_rechazo).toBe('Hemólisis')
  })
})
