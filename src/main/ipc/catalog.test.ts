import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from '../repositories/test-helpers'
import {
  handleDeactivateExam,
  handleDeactivateParam,
  handleListExams,
  handleListParams,
  handleSaveExam,
  handleSaveParam,
} from './catalog.ipc'
import { ERROR_CODES, RESULT_TYPE } from '@/shared/contracts'
import type { Session } from '@/shared/contracts'

const ADMIN_SESSION: Session = {
  userId: 1,
  usuario: 'admin',
  nombre: 'Administrador',
  rol: 'admin',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

describe('catalog ipc', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin', 'admin')
    createUser(testDb.db, 'recepcion', 'recepcion')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('lists exams including created ones', async () => {
    await handleSaveExam(
      testDb.db,
      {
        codigo: 'TST01',
        nombre: 'Examen de Prueba',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 99.99,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    const exams = await handleListExams(testDb.db, { activos: true })
    expect(exams.some((e) => e.codigo === 'TST01')).toBe(true)
  })

  it('rejects duplicate exam code on create', async () => {
    const input = {
      codigo: 'DUP01',
      nombre: 'Examen Duplicado',
      categoria: 'Test',
      tipo_muestra: 'Sangre',
      precio: 10,
      tercerizado: false,
      proveedor: null,
    }

    await handleSaveExam(testDb.db, input, ADMIN_SESSION)
    await expect(handleSaveExam(testDb.db, input, ADMIN_SESSION)).rejects.toThrow(ERROR_CODES.DUPLICATE)
  })

  it('updates exam price and muestra', async () => {
    const created = await handleSaveExam(
      testDb.db,
      {
        codigo: 'UPD01',
        nombre: 'Examen Actualizable',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 50,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    const updated = await handleSaveExam(
      testDb.db,
      {
        id: created.id,
        codigo: 'UPD01',
        nombre: 'Examen Actualizable',
        categoria: 'Test',
        tipo_muestra: 'Orina',
        precio: 75,
        tercerizado: true,
        proveedor: 'Lab Externo',
      },
      ADMIN_SESSION,
    )

    expect(updated.precio).toBe(75)
    expect(updated.tipo_muestra).toBe('Orina')
    expect(updated.tercerizado).toBe(true)
    expect(updated.proveedor).toBe('Lab Externo')
  })

  it('deactivates an exam without removing it', async () => {
    const created = await handleSaveExam(
      testDb.db,
      {
        codigo: 'DEL01',
        nombre: 'Examen a Desactivar',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 10,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    const deactivated = await handleDeactivateExam(testDb.db, { id: created.id }, ADMIN_SESSION)
    expect(deactivated.activo).toBe(false)

    const active = await handleListExams(testDb.db, { activos: true })
    expect(active.some((e) => e.id === created.id)).toBe(false)
  })

  it('creates and lists parameters for an exam', async () => {
    const exam = await handleSaveExam(
      testDb.db,
      {
        codigo: 'PAR01',
        nombre: 'Examen con Parámetros',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 10,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    await handleSaveParam(
      testDb.db,
      {
        examen_id: exam.id,
        nombre: 'Hemoglobina',
        orden: 1,
        unidad: 'g/dL',
        tipo_resultado: RESULT_TYPE.NUMERICO,
        opciones_cualitativas: null,
      },
      ADMIN_SESSION,
    )

    const params = await handleListParams(testDb.db, { examenId: exam.id })
    expect(params).toHaveLength(1)
    expect(params[0].nombre).toBe('Hemoglobina')
  })

  it('deactivates a parameter', async () => {
    const exam = await handleSaveExam(
      testDb.db,
      {
        codigo: 'PAR02',
        nombre: 'Examen con Parámetro',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 10,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    const param = await handleSaveParam(
      testDb.db,
      {
        examen_id: exam.id,
        nombre: 'Glucosa',
        orden: 1,
        unidad: 'mg/dL',
        tipo_resultado: RESULT_TYPE.NUMERICO,
        opciones_cualitativas: null,
      },
      ADMIN_SESSION,
    )

    const deactivated = await handleDeactivateParam(testDb.db, { id: param.id }, ADMIN_SESSION)
    expect(deactivated.activo).toBe(false)
  })

  it('rejects updating exam to a duplicate code', async () => {
    const first = await handleSaveExam(
      testDb.db,
      {
        codigo: 'DUP-A',
        nombre: 'Primero',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 10,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    const second = await handleSaveExam(
      testDb.db,
      {
        codigo: 'DUP-B',
        nombre: 'Segundo',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 10,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )

    await expect(
      handleSaveExam(
        testDb.db,
        {
          id: second.id,
          codigo: 'DUP-A',
          nombre: 'Segundo',
          categoria: 'Test',
          tipo_muestra: 'Sangre',
          precio: 10,
          tercerizado: false,
          proveedor: null,
        },
        ADMIN_SESSION,
      ),
    ).rejects.toThrow(ERROR_CODES.DUPLICATE)

    const unchanged = await handleSaveExam(
      testDb.db,
      {
        id: first.id,
        codigo: 'DUP-A',
        nombre: 'Primero editado',
        categoria: 'Test',
        tipo_muestra: 'Sangre',
        precio: 15,
        tercerizado: false,
        proveedor: null,
      },
      ADMIN_SESSION,
    )
    expect(unchanged.nombre).toBe('Primero editado')
  })
})
