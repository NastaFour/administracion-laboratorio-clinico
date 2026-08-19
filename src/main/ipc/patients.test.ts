import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from '../repositories/test-helpers'
import {
  handleCreatePatient,
  handleDeactivatePatient,
  handleSearchPatients,
  handleUpdatePatient,
  handlePatientHistory,
} from './patients.ipc'
import { ERROR_CODES } from '@/shared/contracts'
import type { Session } from '@/shared/contracts'

const ADMIN_SESSION: Session = {
  userId: 1,
  usuario: 'admin',
  nombre: 'Administrador',
  rol: 'admin',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

describe('patients ipc', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates a patient and rejects duplicate cedula', async () => {
    const input = {
      cedula: 'V-12345678',
      nombre: 'Juan',
      apellido: 'Pérez',
      fecha_nacimiento: '1985-03-15',
      sexo: 'M' as const,
      telefono: '0412-1234567',
      email: null,
      direccion: null,
    }

    const created = await handleCreatePatient(testDb.db, input, ADMIN_SESSION)
    expect(created.cedula).toBe('V-12345678')

    await expect(handleCreatePatient(testDb.db, input, ADMIN_SESSION)).rejects.toThrow(ERROR_CODES.DUPLICATE)
  })

  it('searches patients by cedula, name and phone', async () => {
    await handleCreatePatient(
      testDb.db,
      {
        cedula: 'V-11111111',
        nombre: 'Ana',
        apellido: 'García',
        fecha_nacimiento: '1990-01-01',
        sexo: 'F' as const,
        telefono: '0414-1111111',
        email: null,
        direccion: null,
      },
      ADMIN_SESSION,
    )

    const byName = await handleSearchPatients(testDb.db, { query: 'Ana', limit: 10 })
    expect(byName).toHaveLength(1)

    const byCedula = await handleSearchPatients(testDb.db, { query: 'V-11111111', limit: 10 })
    expect(byCedula).toHaveLength(1)

    const byPhone = await handleSearchPatients(testDb.db, { query: '0414-1111111', limit: 10 })
    expect(byPhone).toHaveLength(1)
  })

  it('updates a patient and rejects cedula collision', async () => {
    const first = await handleCreatePatient(
      testDb.db,
      {
        cedula: 'V-22222222',
        nombre: 'Luis',
        apellido: 'López',
        fecha_nacimiento: '1980-02-02',
        sexo: 'M' as const,
        telefono: null,
        email: null,
        direccion: null,
      },
      ADMIN_SESSION,
    )

    await handleCreatePatient(
      testDb.db,
      {
        cedula: 'V-33333333',
        nombre: 'Pedro',
        apellido: 'Ruiz',
        fecha_nacimiento: '1975-05-05',
        sexo: 'M' as const,
        telefono: null,
        email: null,
        direccion: null,
      },
      ADMIN_SESSION,
    )

    const updated = await handleUpdatePatient(
      testDb.db,
      { id: first.id, nombre: 'Luis Antonio' },
      ADMIN_SESSION,
    )
    expect(updated.nombre).toBe('Luis Antonio')

    await expect(
      handleUpdatePatient(testDb.db, { id: first.id, cedula: 'V-33333333' }, ADMIN_SESSION),
    ).rejects.toThrow(ERROR_CODES.DUPLICATE)
  })

  it('deactivates a patient', async () => {
    const created = await handleCreatePatient(
      testDb.db,
      {
        cedula: 'V-44444444',
        nombre: 'María',
        apellido: 'Torres',
        fecha_nacimiento: '1995-08-08',
        sexo: 'F' as const,
        telefono: null,
        email: null,
        direccion: null,
      },
      ADMIN_SESSION,
    )

    const deactivated = await handleDeactivatePatient(testDb.db, { id: created.id }, ADMIN_SESSION)
    expect(deactivated.activo).toBe(false)
  })

  it('returns empty history for a patient without orders', async () => {
    const created = await handleCreatePatient(
      testDb.db,
      {
        cedula: 'V-55555555',
        nombre: 'Carlos',
        apellido: 'Mendez',
        fecha_nacimiento: '1988-12-12',
        sexo: 'M' as const,
        telefono: null,
        email: null,
        direccion: null,
      },
      ADMIN_SESSION,
    )

    const history = await handlePatientHistory(testDb.db, { id: created.id })
    expect(history).toEqual([])
  })
})
