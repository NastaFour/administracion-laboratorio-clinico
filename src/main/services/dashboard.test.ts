import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { createTestDb, type TestDb } from '../repositories/test-helpers'
import { getDebtors, getStats, getTodayKpis, getTrends, listPatientAnalytes } from './dashboard'

/**
 * RED contract (M11.1 / D10): every dashboard KPI MUST come from real SQL over
 * the seeded database — the test seeds the DB with raw SQL (hand-rolled) and
 * compares the service output against the same raw SQL recomputed in the test.
 */
describe('dashboard aggregates over the seeded DB', () => {
  let t: TestDb
  let db: Database.Database

  // Fixture ids (returned by the raw inserts so assertions stay explicit).
  let patientA: number
  let patientB: number
  let examHem: number
  let examQui: number
  let examUri: number
  let paramHem: number
  let paramQui: number
  let paramUri: number
  let o1HemJunction: number
  let o1QuiJunction: number
  let o2UriJunction: number
  let o3HemJunction: number
  let o4QuiJunction: number

  function insertOrder(
    fecha: string,
    pacienteId: number,
    examenes: Array<{ examen_id: number; precio: number }>,
    extra: { estatus?: string; anulada?: boolean } = {},
  ): { ordenId: number; junctions: number[] } {
    const total = examenes.reduce((sum, exam) => sum + exam.precio, 0)
    const result = db
      .prepare(
        `INSERT INTO ordenes (paciente_id, estatus, observaciones, precio_total, estatus_pago, fecha_solicitud, anulada)
         VALUES (?, ?, '', ?, 'Pendiente', ?, ?)`,
      )
      .run(pacienteId, extra.estatus ?? 'Pendiente', total, `${fecha} 08:00:00`, extra.anulada ? 1 : 0)
    const ordenId = Number(result.lastInsertRowid)
    const stmt = db.prepare(
      'INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, ?, 0)',
    )
    const junctions: number[] = []
    for (const exam of examenes) {
      const r = stmt.run(ordenId, exam.examen_id, exam.precio)
      junctions.push(Number(r.lastInsertRowid))
    }
    return { ordenId, junctions }
  }

  function insertPayment(ordenId: number, fecha: string, montoBs: number, montoUsd: number, metodo = 'efectivo'): void {
    db.prepare(
      `INSERT INTO pagos (orden_id, metodo, monto_bs, monto_usd, tasa_bcv, referencia, fecha, usuario_id, anulado)
       VALUES (?, ?, ?, ?, 950, NULL, ?, 1, 0)`,
    ).run(ordenId, metodo, montoBs, montoUsd, fecha)
  }

  function insertResult(
    ordenExamenId: number,
    parametroId: number,
    valor: number | string,
    estatus: string,
    tipo: string,
  ): void {
    const numerico = tipo === RESULT_TYPE.NUMERICO ? (valor as number) : null
    const cualitativo = tipo === RESULT_TYPE.CUALITATIVO ? (valor as string) : null
    db.prepare(
      `INSERT INTO resultados (orden_examen_id, parametro_id, valor_numerico, valor_cualitativo, estatus_validacion, validado_por, validado_en, flag)
       VALUES (?, ?, ?, ?, ?, 2, CASE WHEN ? = 'Validado' THEN '2026-08-19T10:00:00.000Z' ELSE NULL END, NULL)`,
    ).run(ordenExamenId, parametroId, numerico, cualitativo, estatus, estatus)
  }

  beforeEach(async () => {
    t = await createTestDb()
    db = t.db

    // pagos.usuario_id and resultados.validado_por are NOT NULL FKs → seed users first.
    db.prepare("INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo) VALUES ('caja', 'hash', 'Caja', 'recepcion', 1)").run()
    db.prepare("INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo) VALUES ('bio', 'hash', 'Bioanalista', 'bioanalista', 1)").run()

    patientA = Number(db.prepare("INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, activo) VALUES ('V-10000001', 'Ana', 'López', '1980-01-10', 'F', 1)").run().lastInsertRowid)
    patientB = Number(db.prepare("INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, activo) VALUES ('V-10000002', 'Luis', 'García', '1975-06-20', 'M', 1)").run().lastInsertRowid)

    examHem = Number(db.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES ('HEM', 'Hemoglobina', 'Hematología', 'Sangre', 500, 1)").run().lastInsertRowid)
    examQui = Number(db.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES ('QUI', 'Química', 'Química', 'Sangre', 1000, 1)").run().lastInsertRowid)
    examUri = Number(db.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES ('URI', 'Orina', 'Orina', 'Orina', 300, 1)").run().lastInsertRowid)

    paramHem = Number(db.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, 'Hemoglobina', 1, 'g/dL', 'numerico', 1)").run(examHem).lastInsertRowid)
    paramQui = Number(db.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, 'Glucosa', 1, 'mg/dL', 'numerico', 1)").run(examQui).lastInsertRowid)
    paramUri = Number(db.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, 'Proteínas', 1, NULL, 'cualitativo', 1)").run(examUri).lastInsertRowid)

    // o1 + o2 today (2026-08-20); o3 45 days back; o4 141 days back; o5 anulada today; o6 July; o7 80 days back.
    const o1 = insertOrder('2026-08-20', patientA, [
      { examen_id: examHem, precio: 500 },
      { examen_id: examQui, precio: 1000 },
    ])
    o1HemJunction = o1.junctions[0]
    o1QuiJunction = o1.junctions[1]
    const o2 = insertOrder('2026-08-20', patientA, [{ examen_id: examUri, precio: 300 }], { estatus: 'Completada' })
    o2UriJunction = o2.junctions[0]
    const o3 = insertOrder('2026-07-06', patientB, [{ examen_id: examHem, precio: 500 }], { estatus: 'Completada' })
    o3HemJunction = o3.junctions[0]
    const o4 = insertOrder('2026-04-01', patientB, [{ examen_id: examQui, precio: 1000 }], { estatus: 'Completada' })
    o4QuiJunction = o4.junctions[0]
    insertOrder('2026-08-20', patientA, [{ examen_id: examHem, precio: 500 }], { anulada: true })
    const o6 = insertOrder('2026-07-10', patientA, [{ examen_id: examUri, precio: 300 }], { estatus: 'Entregada' })
    insertOrder('2026-06-01', patientB, [{ examen_id: examUri, precio: 300 }], { estatus: 'Completada' })

    // Payments: o1 mixto 1500 Bs + 10 USD today — production stores the folded
    // Bs value (resolveBsAmount: 1500 + 10*950 = 11000); o4 200 Bs April; o6 300 Bs July.
    insertPayment(o1.ordenId, '2026-08-20', 11000, 10, 'mixto')
    insertPayment(o4.ordenId, '2026-04-02', 200, 0)
    insertPayment(o6.ordenId, '2026-07-10', 300, 0)

    // Results: o1 param1 Capturado + param2 Pendiente (pending); o2 qualitative Validado;
    // o3 param1 Validado 13.5; o4 param2 Validado 95.
    insertResult(o1HemJunction, paramHem, 12.1, RESULT_STATUS.CAPTURADO, RESULT_TYPE.NUMERICO)
    insertResult(o1QuiJunction, paramQui, 95.5, RESULT_STATUS.PENDIENTE, RESULT_TYPE.NUMERICO)
    insertResult(o2UriJunction, paramUri, 'Negativo', RESULT_STATUS.VALIDADO, RESULT_TYPE.CUALITATIVO)
    insertResult(o3HemJunction, paramHem, 13.5, RESULT_STATUS.VALIDADO, RESULT_TYPE.NUMERICO)
    insertResult(o4QuiJunction, paramQui, 95, RESULT_STATUS.VALIDADO, RESULT_TYPE.NUMERICO)
  })

  afterEach(() => {
    t.cleanup()
  })

  describe('getTodayKpis (dashboard:today)', () => {
    it('RED: KPIs match a hand-rolled SQL query over the same seeded DB', () => {
      const kpis = getTodayKpis(db, '2026-08-20')

      // Hand-rolled SQL recomputation — the service MUST agree with it.
      const ordersToday = db
        .prepare("SELECT COUNT(*) AS n FROM ordenes WHERE date(fecha_solicitud) = '2026-08-20' AND anulada = 0")
        .get() as { n: number }
      const revenueToday = db
        .prepare(
          "SELECT COALESCE(SUM(monto_bs), 0) AS bs, COALESCE(SUM(monto_usd), 0) AS usd FROM pagos WHERE date(fecha) = '2026-08-20' AND anulado = 0",
        )
        .get() as { bs: number; usd: number }
      const pendingResults = db
        .prepare("SELECT COUNT(*) AS n FROM resultados WHERE estatus_validacion != 'Validado'")
        .get() as { n: number }
      const byCategory = db
        .prepare(
          `SELECT ec.categoria, COUNT(*) AS n
           FROM orden_examenes oe
           JOIN ordenes o ON o.id = oe.orden_id
           JOIN examenes_catalogo ec ON ec.id = oe.examen_id
           WHERE date(o.fecha_solicitud) = '2026-08-20' AND o.anulada = 0
           GROUP BY ec.categoria`,
        )
        .all() as Array<{ categoria: string; n: number }>

      expect(kpis.ordenes_hoy).toBe(ordersToday.n)
      expect(kpis.resultados_pendientes).toBe(pendingResults.n)
      expect(kpis.ingreso_bs).toBe(revenueToday.bs)
      expect(kpis.ingreso_usd).toBe(revenueToday.usd)
      for (const row of byCategory) {
        expect(kpis.examenes_por_categoria[row.categoria]).toBe(row.n)
      }
    })

    it('RED: counts only non-anulada orders created on the given date', () => {
      const kpis = getTodayKpis(db, '2026-08-20')
      expect(kpis.ordenes_hoy).toBe(2)
      expect(kpis.ingreso_bs).toBe(11000)
      expect(kpis.ingreso_usd).toBe(10)
      expect(kpis.resultados_pendientes).toBe(2)
      expect(kpis.examenes_por_categoria).toEqual({ Hematología: 1, Química: 1, Orina: 1 })
    })

    it('RED: an empty day returns zeroed KPIs, never fabricated numbers', () => {
      const kpis = getTodayKpis(db, '2026-01-01')
      expect(kpis.ordenes_hoy).toBe(0)
      expect(kpis.ingreso_bs).toBe(0)
      expect(kpis.ingreso_usd).toBe(0)
      expect(kpis.examenes_por_categoria).toEqual({})
    })
  })

  describe('getDebtors (dashboard:debtors)', () => {
    it('RED: each debtor lands in the correct aging bucket (0-30 / 31-60 / 61-90 / 90+)', () => {
      const debtors = getDebtors(db, '2026-08-20')
      expect(debtors).toHaveLength(4)

      const byName = new Map(debtors.map((debtor) => [debtor.paciente_nombre, debtor]))
      const ana = byName.get('López, Ana')
      const luis = byName.get('García, Luis')
      expect(ana).toBeDefined()
      expect(luis).toBeDefined()

      // o2: 300 Bs owed, 0 days
      expect(ana?.rango).toBe('0-30')
      expect(ana?.saldo_bs).toBe(300)
      expect(ana?.dias_pendientes).toBe(0)
      // o3: 500 Bs owed, 45 days → 31-60
      expect(luis?.rango).toBe('31-60')
      expect(luis?.saldo_bs).toBe(500)
      expect(luis?.dias_pendientes).toBe(45)
      // o7: 300 Bs owed, 80 days → 61-90
      // o4: 800 Bs owed, 141 days → 90+
      const buckets = debtors.map((debtor) => debtor.rango)
      expect(buckets).toContain('61-90')
      expect(buckets).toContain('90+')
      const luis90 = byName.get('García, Luis')!
      expect(luis90.rango).toBe('31-60') // the 90+ debtor is the same patient via a different order
      expect(debtors.filter((debtor) => debtor.paciente_id === patientB && debtor.rango === '90+')[0]?.saldo_bs).toBe(800)
      expect(debtors.filter((debtor) => debtor.paciente_id === patientB && debtor.rango === '90+')[0]?.dias_pendientes).toBe(141)
    })

    it('RED: paid, anulada and fully-settled orders are NOT debtors', () => {
      const debtors = getDebtors(db, '2026-08-20')
      const saldos = debtors.map((debtor) => debtor.saldo_bs)
      expect(saldos).not.toContain(0)
      // o1 fully paid, o5 anulada, o6 fully paid → never listed
      const names = debtors.map((debtor) => debtor.paciente_nombre)
      expect(names.filter((name) => name === 'López, Ana')).toHaveLength(1) // only o2 remains for Ana
    })

    it('RED: a fully-settled DB yields an empty debtor list (empty state)', () => {
      // Settle every remaining balance → no order may appear as a debtor.
      const balances = db
        .prepare(
          `SELECT o.id, o.precio_total, COALESCE((SELECT SUM(monto_bs) FROM pagos pg WHERE pg.orden_id = o.id AND pg.anulado = 0), 0) AS pagado
           FROM ordenes o WHERE o.anulada = 0`,
        )
        .all() as Array<{ id: number; precio_total: number; pagado: number }>
      for (const row of balances) {
        const saldo = row.precio_total - row.pagado
        if (saldo > 0) {
          insertPayment(row.id, '2026-08-21', saldo, 0)
        }
      }
      expect(getDebtors(db, '2026-08-21')).toHaveLength(0)
    })
  })

  describe('getStats (dashboard:stats)', () => {
    it('RED: top exams and monthly revenue reflect only the selected range', () => {
      const stats = getStats(db, '2026-08-01', '2026-08-31')

      // Only o1 + o2 fall inside August → each exam count 1, revenue by payment month.
      expect(stats.top_examenes).toHaveLength(3)
      expect(stats.top_examenes[0]).toMatchObject({ examen_nombre: 'Química', cantidad: 1, ingreso_bs: 1000 })
      expect(stats.top_examenes[1]).toMatchObject({ examen_nombre: 'Hemoglobina', cantidad: 1, ingreso_bs: 500 })
      expect(stats.top_examenes[2]).toMatchObject({ examen_nombre: 'Orina', cantidad: 1, ingreso_bs: 300 })

      expect(stats.ingreso_mensual).toEqual([{ mes: '2026-08', bs: 11000, usd: 10 }])
      // Previous month (July) revenue: the 300 Bs payment on o6.
      expect(stats.ingreso_mes_anterior_bs).toBe(300)
      expect(stats.ingreso_mes_anterior_usd).toBe(0)
    })

    it('RED: fills zero-revenue months inside the range (no gaps for charts)', () => {
      const stats = getStats(db, '2026-06-01', '2026-08-31')
      expect(stats.ingreso_mensual.map((row) => row.mes)).toEqual(['2026-06', '2026-07', '2026-08'])
      expect(stats.ingreso_mensual[0]).toEqual({ mes: '2026-06', bs: 0, usd: 0 })
      expect(stats.ingreso_mensual[1]).toEqual({ mes: '2026-07', bs: 300, usd: 0 })
    })

    it('RED: a range with no data yields empty lists and zero previous-month revenue', () => {
      const stats = getStats(db, '2026-01-01', '2026-01-31')
      expect(stats.top_examenes).toHaveLength(0)
      expect(stats.ingreso_mensual).toEqual([{ mes: '2026-01', bs: 0, usd: 0 }])
      expect(stats.ingreso_mes_anterior_bs).toBe(0)
    })
  })

  describe('getTrends + listPatientAnalytes (dashboard:trends)', () => {
    it('RED: returns the per-patient numeric series for one analyte, oldest first', () => {
      const trend = getTrends(db, patientB, paramHem)
      expect(trend.paciente_id).toBe(patientB)
      expect(trend.parametro_id).toBe(paramHem)
      expect(trend.parametro_nombre).toBe('Hemoglobina')
      expect(trend.puntos).toEqual([{ fecha: '2026-07-06', valor: 13.5, unidad: 'g/dL' }])

      const glucose = getTrends(db, patientB, paramQui)
      expect(glucose.puntos).toEqual([{ fecha: '2026-04-01', valor: 95, unidad: 'mg/dL' }])
    })

    it('RED: series include captured/pending values (result records, WU9) and sort by date', () => {
      const trend = getTrends(db, patientA, paramHem)
      expect(trend.puntos).toEqual([{ fecha: '2026-08-20', valor: 12.1, unidad: 'g/dL' }])
    })

    it('RED: qualitative-only analytes have no points but still resolve metadata', () => {
      const trend = getTrends(db, patientA, paramUri)
      expect(trend.parametro_nombre).toBe('Proteínas')
      expect(trend.puntos).toHaveLength(0)
    })

    it('RED: patientAnalytes lists only parameters with numeric results for that patient', () => {
      const analytes = listPatientAnalytes(db, patientA)
      expect(analytes).toHaveLength(2)
      const names = analytes.map((analyte) => analyte.parametro_nombre).sort()
      expect(names).toEqual(['Glucosa', 'Hemoglobina'])
      expect(analytes.find((analyte) => analyte.parametro_nombre === 'Hemoglobina')?.unidad).toBe('g/dL')

      const luisAnalytes = listPatientAnalytes(db, patientB)
      expect(luisAnalytes.map((analyte) => analyte.parametro_nombre).sort()).toEqual(['Glucosa', 'Hemoglobina'])
    })

    it('RED: a patient with no numeric results yields an empty analyte list', () => {
      const nobody = Number(
        db.prepare("INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, activo) VALUES ('V-10000003', 'Solo', 'Paciente', '1990-01-01', 'M', 1)").run().lastInsertRowid,
      )
      expect(listPatientAnalytes(db, nobody)).toHaveLength(0)
    })
  })
})