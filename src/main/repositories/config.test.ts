import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser } from './test-helpers'
import { getBioanalistaConfig, getBcvRate, getLabConfig, getPrintConfig, setBioanalistaConfig, setBcvRate, setLabConfig, setPrintConfig } from './config'

describe('config repository', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>

  beforeEach(async () => {
    testDb = await createTestDb()
    createUser(testDb.db, 'admin1', 'admin')
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('sets and gets lab config', () => {
    const saved = setLabConfig(testDb.db, {
      nombre: 'Lab Test',
      rif: 'J-12345678-9',
      direccion: 'Av. Test',
      sede: 'Principal',
      telefono: '0212-1234567',
      email: 'lab@test.com',
      logo: 'data:image/png;base64,abc',
    })
    expect(saved.nombre).toBe('Lab Test')

    const loaded = getLabConfig(testDb.db)
    expect(loaded.email).toBe('lab@test.com')
    expect(loaded.logo).toBe('data:image/png;base64,abc')
  })

  it('sets and gets bioanalista config', () => {
    const saved = setBioanalistaConfig(testDb.db, {
      nombre: 'Dr. Test',
      titulo: 'Bioanalista',
      registro_msds: '12345',
      registro_cbz: '67890',
      firma: null,
    })
    expect(saved.registro_msds).toBe('12345')

    const loaded = getBioanalistaConfig(testDb.db)
    expect(loaded.nombre).toBe('Dr. Test')
  })

  it('sets and gets print config', () => {
    const saved = setPrintConfig(testDb.db, {
      pageSize: 'A4',
      margins: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      copies: 2,
    })
    expect(saved.copies).toBe(2)

    const loaded = getPrintConfig(testDb.db)
    expect(loaded.pageSize).toBe('A4')
  })

  it('records BCV rate history', () => {
    const first = setBcvRate(testDb.db, 950, 1)
    expect(first.tasa).toBe(950)

    const second = setBcvRate(testDb.db, 955, 1)
    expect(second.tasa).toBe(955)

    const current = getBcvRate(testDb.db)
    expect(current?.tasa).toBe(955)

    const history = testDb.db.prepare('SELECT COUNT(*) as count FROM bcv_historial').get() as { count: number }
    expect(history.count).toBe(2)
  })
})
