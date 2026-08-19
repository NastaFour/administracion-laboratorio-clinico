import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { seedCatalog } from '../seed/catalog'
import { createExam as helperCreateExam, createTestDb, createUser } from './test-helpers'
import {
  createExam,
  createParam,
  createRange,
  deactivateExam,
  deactivateParam,
  getExam,
  getParam,
  getRange,
  listExams,
  listParams,
  listRanges,
  updateExam,
  updateParam,
} from './catalog'

describe('catalog repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
    seedCatalog(testDb.db)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('lists active exams including seeded catalog', () => {
    const exams = listExams(testDb.db, true)
    expect(exams.length).toBeGreaterThanOrEqual(8)
    expect(exams.some((e) => e.codigo === 'HEM01')).toBe(true)
  })

  it('creates and retrieves an exam', () => {
    const created = createExam(testDb.db, {
      codigo: 'TST01',
      nombre: 'Examen de Prueba',
      categoria: 'Test',
      tipo_muestra: 'Sangre',
      precio: 99.99,
      tercerizado: true,
      proveedor: 'Lab Externo',
    })
    expect(created.id).toBeGreaterThan(0)
    expect(created.tercerizado).toBe(true)

    const found = getExam(testDb.db, created.id)
    expect(found?.codigo).toBe('TST01')
  })

  it('deactivates an exam without deleting it', () => {
    const created = helperCreateExam(testDb.db, 'TST02')
    const deactivated = deactivateExam(testDb.db, created)
    expect(deactivated.activo).toBe(false)

    const active = listExams(testDb.db, true)
    expect(active.some((e) => e.id === created)).toBe(false)

    const all = listExams(testDb.db, false)
    expect(all.some((e) => e.id === created)).toBe(true)
  })

  it('creates and lists parameters', () => {
    const exam = helperCreateExam(testDb.db, 'TST03')
    const param = createParam(testDb.db, {
      examen_id: exam,
      nombre: 'Parametro A',
      orden: 1,
      unidad: 'mg/dL',
      tipo_resultado: 'numerico',
      opciones_cualitativas: null,
    })
    expect(param.id).toBeGreaterThan(0)

    const params = listParams(testDb.db, exam)
    expect(params).toHaveLength(1)
    expect(params[0].nombre).toBe('Parametro A')
  })

  it('stores qualitative parameters with options', () => {
    const exam = helperCreateExam(testDb.db, 'TST04')
    const param = createParam(testDb.db, {
      examen_id: exam,
      nombre: 'Reactivo',
      orden: 1,
      unidad: 'Cualitativo',
      tipo_resultado: 'cualitativo',
      opciones_cualitativas: ['Positivo', 'Negativo'],
    })
    const found = getParam(testDb.db, param.id)
    expect(found?.tipo_resultado).toBe('cualitativo')
    expect(found?.opciones_cualitativas).toEqual(['Positivo', 'Negativo'])
  })

  it('creates reference ranges with age unit', () => {
    const exam = helperCreateExam(testDb.db, 'TST05')
    const param = createParam(testDb.db, {
      examen_id: exam,
      nombre: 'Rango',
      orden: 1,
      unidad: 'mg/dL',
      tipo_resultado: 'numerico',
      opciones_cualitativas: null,
    })
    const range = createRange(testDb.db, {
      parametro_id: param.id,
      sexo: 'M',
      edad_unidad: 'anios',
      edad_min: 18,
      edad_max: 120,
      valor_min: 10,
      valor_max: 20,
      interpretacion: null,
      valor_min_critico: 5,
      valor_max_critico: 25,
    })
    expect(range.id).toBeGreaterThan(0)
    expect(range.edad_unidad).toBe('anios')

    const ranges = listRanges(testDb.db, param.id)
    expect(ranges).toHaveLength(1)
  })

  it('updates exam fields', () => {
    const created = helperCreateExam(testDb.db, 'TST06', 50)
    const updated = updateExam(testDb.db, created, { precio: 75, nombre: 'Renombrado' })
    expect(updated.precio).toBe(75)
    expect(updated.nombre).toBe('Renombrado')
  })

  it('deactivates a parameter', () => {
    const exam = helperCreateExam(testDb.db, 'TST07')
    const param = createParam(testDb.db, {
      examen_id: exam,
      nombre: 'Parametro B',
      orden: 1,
      unidad: 'mg/dL',
      tipo_resultado: 'numerico',
      opciones_cualitativas: null,
    })
    deactivateParam(testDb.db, param.id)
    const params = listParams(testDb.db, exam, true)
    expect(params).toHaveLength(0)
  })

  it('updates reference range critical values', () => {
    const exam = helperCreateExam(testDb.db, 'TST08')
    const param = createParam(testDb.db, {
      examen_id: exam,
      nombre: 'Rango2',
      orden: 1,
      unidad: 'mg/dL',
      tipo_resultado: 'numerico',
      opciones_cualitativas: null,
    })
    const range = createRange(testDb.db, {
      parametro_id: param.id,
      sexo: 'Ambos',
      edad_unidad: 'dias',
      edad_min: 0,
      edad_max: 30,
      valor_min: 1,
      valor_max: 5,
      interpretacion: null,
      valor_min_critico: null,
      valor_max_critico: null,
    })
    const updated = updateParam(testDb.db, param.id, { nombre: 'Rango2 editado' })
    expect(updated.nombre).toBe('Rango2 editado')
    const found = getRange(testDb.db, range.id)
    expect(found?.edad_unidad).toBe('dias')
  })
})
