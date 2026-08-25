import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createPatient, createTestDb, createUser } from './test-helpers'
import {
  createPatient as repoCreatePatient,
  deactivatePatient,
  getPatient,
  getPatientByCedula,
  listPatients,
  mergePatientsOverwrite,
  searchPatients,
  updatePatient,
} from './patients'

describe('patients repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates and retrieves a patient', () => {
    const created = repoCreatePatient(testDb.db, {
      cedula: 'V-12345678',
      nombre: 'Juan',
      apellido: 'Pérez',
      fecha_nacimiento: '1985-03-15',
      sexo: 'M',
      telefono: '0412-1234567',
      email: 'juan@example.com',
      direccion: 'Calle 1',
    })
    expect(created.id).toBeGreaterThan(0)
    expect(created.activo).toBe(true)

    const found = getPatient(testDb.db, created.id)
    expect(found).not.toBeNull()
    expect(found?.cedula).toBe('V-12345678')
    expect(found?.nombre).toBe('Juan')
  })

  it('rejects duplicate cedula', () => {
    repoCreatePatient(testDb.db, {
      cedula: 'V-12345678',
      nombre: 'Juan',
      apellido: 'Pérez',
      fecha_nacimiento: '1985-03-15',
      sexo: 'M',
      telefono: null,
      email: null,
      direccion: null,
    })
    expect(() =>
      repoCreatePatient(testDb.db, {
        cedula: 'V-12345678',
        nombre: 'Otro',
        apellido: 'Otro',
        fecha_nacimiento: '1990-01-01',
        sexo: 'F',
        telefono: null,
        email: null,
        direccion: null,
      }),
    ).toThrow()
  })

  it('searches by cedula, name and phone', () => {
    repoCreatePatient(testDb.db, {
      cedula: 'V-11111111',
      nombre: 'Ana',
      apellido: 'García',
      fecha_nacimiento: '1990-01-01',
      sexo: 'F',
      telefono: '0414-1111111',
      email: null,
      direccion: null,
    })
    repoCreatePatient(testDb.db, {
      cedula: 'V-22222222',
      nombre: 'Luis',
      apellido: 'García',
      fecha_nacimiento: '1980-02-02',
      sexo: 'M',
      telefono: '0414-2222222',
      email: null,
      direccion: null,
    })

    expect(searchPatients(testDb.db, 'Ana', 10)).toHaveLength(1)
    expect(searchPatients(testDb.db, 'García', 10)).toHaveLength(2)
    expect(searchPatients(testDb.db, 'V-11111111', 10)).toHaveLength(1)
    expect(searchPatients(testDb.db, '0414-2222222', 10)).toHaveLength(1)
  })

  it('updates patient data', () => {
    const created = createPatient(testDb.db, 'V-33333333')
    const updated = updatePatient(testDb.db, created, { nombre: 'Pedro', telefono: '0412-9999999' })
    expect(updated.nombre).toBe('Pedro')
    expect(updated.telefono).toBe('0412-9999999')
    expect(updated.apellido).toBe('Pérez')
  })

  it('deactivates a patient', () => {
    const created = createPatient(testDb.db, 'V-44444444')
    const deactivated = deactivatePatient(testDb.db, created)
    expect(deactivated.activo).toBe(false)

    const activeOnly = listPatients(testDb.db, true)
    expect(activeOnly.some((p) => p.id === created)).toBe(false)

    const all = listPatients(testDb.db, false)
    expect(all.some((p) => p.id === created)).toBe(true)
  })

  it('search excludes soft-deleted patients (regression)', () => {
    const created = createPatient(testDb.db, 'V-55555555', 'Buscable', 'Activo')
    deactivatePatient(testDb.db, created)

    expect(listPatients(testDb.db, false).some((p) => p.cedula === 'V-55555555')).toBe(true)
    expect(searchPatients(testDb.db, 'V-55555555', 10)).toHaveLength(0)
    expect(searchPatients(testDb.db, 'Buscable', 10)).toHaveLength(0)
  })

  it('finds patient by cedula', () => {
    repoCreatePatient(testDb.db, {
      cedula: 'E-87654321',
      nombre: 'Maria',
      apellido: 'Lopez',
      fecha_nacimiento: '1995-05-05',
      sexo: 'F',
      telefono: null,
      email: null,
      direccion: null,
    })
    const found = getPatientByCedula(testDb.db, 'E-87654321')
    expect(found?.nombre).toBe('Maria')
  })
})

describe('Sobrescribir merge overwrite (M13.5)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  const baseInput = {
    fecha_nacimiento: '1985-03-15',
    sexo: 'M' as const,
    telefono: null,
    email: null,
    direccion: null,
  }

  it('RED: overwrites a conflicting cedula without a UNIQUE constraint error', () => {
    const localId = createPatient(testDb.db, 'V-60000001', 'Juan', 'Pérez')

    expect(() =>
      mergePatientsOverwrite(testDb.db, [
        { cedula: 'V-60000001', nombre: 'Juan Carlos', apellido: 'Pérez Sanoja', ...baseInput },
      ]),
    ).not.toThrow()

    const overwritten = getPatientByCedula(testDb.db, 'V-60000001')
    expect(overwritten?.id).toBe(localId)
    expect(overwritten?.nombre).toBe('Juan Carlos')
    expect(overwritten?.apellido).toBe('Pérez Sanoja')
  })

  it('inserts incoming patients that do not exist locally and keeps the rest', () => {
    createPatient(testDb.db, 'V-60000002')

    mergePatientsOverwrite(testDb.db, [
      { cedula: 'V-60000003', nombre: 'Nuevo', apellido: 'Importado', ...baseInput },
      { cedula: 'V-60000004', nombre: 'Otro', apellido: 'Importado', ...baseInput },
    ])

    expect(getPatientByCedula(testDb.db, 'V-60000002')).not.toBeNull()
    expect(getPatientByCedula(testDb.db, 'V-60000003')?.nombre).toBe('Nuevo')
    const total = testDb.db.prepare('SELECT COUNT(*) as count FROM pacientes').get() as { count: number }
    expect(total.count).toBe(3)
  })

  it('preserves clinical history linked to the overwritten patient', () => {
    const localId = createPatient(testDb.db, 'V-60000005')
    mergePatientsOverwrite(testDb.db, [
      { cedula: 'V-60000005', nombre: 'Actualizada', apellido: 'Pérez', ...baseInput },
    ])
    // The row identity survives so ordenes.paciente_id references stay intact.
    expect(getPatient(testDb.db, localId)?.nombre).toBe('Actualizada')
  })

  it('is atomic: a failing batch rolls back every change (single transaction)', () => {
    createPatient(testDb.db, 'V-60000006', 'Original', 'Original')

    expect(() =>
      mergePatientsOverwrite(testDb.db, [
        { cedula: 'V-60000007', nombre: 'Insertada', apellido: 'Ok', ...baseInput },
        // NOT NULL violation mid-batch forces the whole transaction to roll back.
        { cedula: 'V-60000008', nombre: null as unknown as string, apellido: 'Boom', ...baseInput },
      ]),
    ).toThrow()

    expect(getPatientByCedula(testDb.db, 'V-60000007')).toBeNull()
    expect(getPatientByCedula(testDb.db, 'V-60000006')?.nombre).toBe('Original')
  })
})
