import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from './test-helpers'
import {
  generateSampleLabelHtml,
  getSampleByOrderExam,
  listSamplesByOrder,
  markSampleResultadaByOrderExam,
  registerSamplesForOrder,
  rejectSample,
  updateSampleStatus,
} from './samples'
import type { Sample } from '@/shared/contracts'

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

  it('registers samples with a collection timestamp', () => {
    const ordenId = createOrderWithExams()
    const now = new Date().toISOString()
    const samples = registerSamplesForOrder(testDb.db, ordenId, { recoleccion_en: now })
    expect(samples[0].recoleccion_en).toBe(now)
  })

  it('updates sample status', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const updated = updateSampleStatus(testDb.db, samples[0].id, 'En proceso')
    expect(updated.estatus).toBe('En proceso')

    const found = getSampleByOrderExam(testDb.db, samples[0].orden_examen_id)
    expect(found?.estatus).toBe('En proceso')
  })

  it('rejects a sample with a reason', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const rejected = rejectSample(testDb.db, samples[0].id, 'Hemólisis')
    expect(rejected.estatus).toBe('Rechazada')
    expect(rejected.motivo_rechazo).toBe('Hemólisis')
  })

  it('blocks re-registration while active samples exist (M6.1 one row per exam)', () => {
    const ordenId = createOrderWithExams()
    registerSamplesForOrder(testDb.db, ordenId)
    expect(() => registerSamplesForOrder(testDb.db, ordenId)).toThrow('CONFLICT')
  })

  it('allows re-registration after every sample is rejected (re-collection)', () => {
    const ordenId = createOrderWithExams()
    const first = registerSamplesForOrder(testDb.db, ordenId)
    for (const sample of first) {
      rejectSample(testDb.db, sample.id, 'Coágulo')
    }
    const recollected = registerSamplesForOrder(testDb.db, ordenId)
    expect(recollected).toHaveLength(2)
    expect(recollected[0].estatus).toBe('Recolectada')
  })

  it('marks the sample as Resultada by order_exam id (WU9 hook)', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const updated = markSampleResultadaByOrderExam(testDb.db, samples[0].orden_examen_id)
    expect(updated).not.toBeNull()
    expect(updated?.id).toBe(samples[0].id)
    expect(updated?.estatus).toBe('Resultada')
  })

  it('generates a printable label HTML', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const html = generateSampleLabelHtml(samples[0])
    expect(html).toContain(samples[0].codigo)
    expect(html).toContain(samples[0].tipo_muestra)
  })

  it('escapes catalog-provided values in the label HTML', () => {
    const ordenId = createOrderWithExams()
    const samples = registerSamplesForOrder(testDb.db, ordenId)
    const malicious: Sample = { ...samples[0], tipo_muestra: '<script>alert(1)</script>' }
    const html = generateSampleLabelHtml(malicious)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
