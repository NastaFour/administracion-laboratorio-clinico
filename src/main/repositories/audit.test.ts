import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from './test-helpers'
import { createAuditEntry, listAuditEntries } from './audit'

describe('audit repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let userId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    userId = createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('creates an audit entry', () => {
    const entry = createAuditEntry(testDb.db, {
      usuario_id: userId,
      accion: 'paciente.creado',
      entidad: 'paciente',
      entidad_id: 1,
      antes: null,
      despues: { id: 1, nombre: 'Juan' },
    })
    expect(entry.usuario_id).toBe(userId)
    expect(entry.accion).toBe('paciente.creado')
    expect(entry.despues).toEqual({ id: 1, nombre: 'Juan' })
  })

  it('lists audit entries filtered by action and entity', () => {
    createAuditEntry(testDb.db, {
      usuario_id: userId,
      accion: 'paciente.creado',
      entidad: 'paciente',
      entidad_id: 1,
    })
    createAuditEntry(testDb.db, {
      usuario_id: userId,
      accion: 'resultado.validado',
      entidad: 'resultado',
      entidad_id: 5,
    })

    const patientAudits = listAuditEntries(testDb.db, { entidad: 'paciente' })
    expect(patientAudits).toHaveLength(1)
    expect(patientAudits[0].accion).toBe('paciente.creado')

    const validations = listAuditEntries(testDb.db, { accion: 'resultado.validado' })
    expect(validations).toHaveLength(1)
  })
})
