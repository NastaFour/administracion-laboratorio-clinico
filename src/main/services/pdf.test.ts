import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import type { Session } from '@/shared/contracts'
import { ERROR_CODES, RESULT_STATUS, RESULT_TYPE, ROLES } from '@/shared/contracts'
import {
  createExam,
  createOrder as helperCreateOrder,
  createTestDb,
  createUser,
} from '../repositories/test-helpers'
import { listAuditEntries } from '../repositories/audit'
import { setConfigValue } from '../repositories/config'
import { computeExactAge } from './referenceRanges'
import {
  buildReportData,
  encodeReportPayload,
  formatBand,
  formatExactAge,
  formatIsoDate,
  isBKExam,
  isMicrobiologyExam,
  printReportToPdf,
  printReportToPrinter,
  REPORT_FONT_HANDSHAKE,
  resolveLogo,
  type PdfDeps,
  type ReportWindowLike,
} from './pdf'

interface MockWindow {
  win: ReportWindowLike
  executeJavaScript: ReturnType<typeof vi.fn>
  printToPDF: ReturnType<typeof vi.fn>
  print: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  calls: { js: string[]; pdfOptions: Array<Record<string, unknown>>; printOptions: Array<Record<string, unknown>> }
}

function makeMockWindow(): MockWindow {
  const calls = { js: [] as string[], pdfOptions: [] as Array<Record<string, unknown>>, printOptions: [] as Array<Record<string, unknown>> }
  const executeJavaScript = vi.fn(async (code: string) => {
    calls.js.push(code)
    return true
  })
  const printToPDF = vi.fn(async (options: Record<string, unknown>) => {
    calls.pdfOptions.push(options)
    return Buffer.from('%PDF-1.4 mock')
  })
  const print = vi.fn((options: Record<string, unknown>, callback?: (success: boolean, reason: string) => void) => {
    calls.printOptions.push(options)
    callback?.(true, '')
  })
  const destroy = vi.fn()
  const win: ReportWindowLike = {
    webContents: { executeJavaScript, printToPDF, print },
    destroy,
  }
  return { win, executeJavaScript, printToPDF, print, destroy, calls }
}

function makeDeps(mock: MockWindow): PdfDeps {
  return { createOffscreenWindow: vi.fn(async () => mock.win) }
}

function makeSession(role: 'admin' | 'bioanalista' | 'tecnico', userId: number): Session {
  return {
    userId,
    usuario: `user${userId}`,
    nombre: 'Usuario',
    rol: role,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

/**
 * Insert a patient with an explicit sex and birthdate (the shared
 * createPatient helper hardcodes 1985-03-15 / male).
 */
function insertPatient(
  db: Database.Database,
  cedula: string,
  nombre: string,
  apellido: string,
  fechaNacimiento: string,
  sexo: string,
): number {
  const result = db
    .prepare('INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, activo) VALUES (?, ?, ?, ?, ?, 1)')
    .run(cedula, nombre, apellido, fechaNacimiento, sexo)
  return Number(result.lastInsertRowid)
}

function insertParam(
  db: Database.Database,
  examenId: number,
  nombre: string,
  unidad: string | null,
  tipoResultado: string,
  orden = 1,
): number {
  const result = db
    .prepare('INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, ?, ?, ?, ?, 1)')
    .run(examenId, nombre, orden, unidad, tipoResultado)
  return Number(result.lastInsertRowid)
}

function insertRange(
  db: Database.Database,
  parametroId: number,
  sexo: string,
  edadUnidad: string,
  edadMin: number,
  edadMax: number,
  valorMin: number | null,
  valorMax: number | null,
): void {
  db.prepare(
    `INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(parametroId, sexo, edadUnidad, edadMin, edadMax, valorMin, valorMax)
}

function insertResult(
  db: Database.Database,
  ordenExamenId: number,
  parametroId: number,
  valor: number | string,
  estatus: string,
  validadoPor: number | null,
  flag: string | null = null,
): number {
  const tipo = typeof valor === 'number' ? RESULT_TYPE.NUMERICO : RESULT_TYPE.CUALITATIVO
  const numeric = tipo === RESULT_TYPE.NUMERICO ? valor : null
  const qualitative = tipo === RESULT_TYPE.CUALITATIVO ? valor : null
  const result = db
    .prepare(
      `INSERT INTO resultados (orden_examen_id, parametro_id, valor_numerico, valor_cualitativo, estatus_validacion, validado_por, validado_en, flag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ordenExamenId,
      parametroId,
      numeric,
      qualitative,
      estatus,
      validadoPor,
      estatus === RESULT_STATUS.VALIDADO ? '2026-08-19T10:00:00.000Z' : null,
      flag,
    )
  return Number(result.lastInsertRowid)
}

describe('pdf module — buildReportData (WU10a)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let bioId: number
  let pacienteId: number
  let examId: number
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    // Female patient born 2026-06-19 → exactly 2 months old on 2026-08-19 (M8.4).
    pacienteId = insertPatient(testDb.db, 'V-28000001', 'María', 'López', '2026-06-19', 'F')
    examId = createExam(testDb.db, 'HEMO', 100)
    ordenId = helperCreateOrder(testDb.db, pacienteId, [examId])
    const oeRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    ordenExamenId = oeRow.id
    parametroId = insertParam(testDb.db, examId, 'Hemoglobina', 'g/dL', 'numerico')
    insertRange(testDb.db, parametroId, 'F', 'anios', 18, 99, 12.0, 16.0)
    insertRange(testDb.db, parametroId, 'Ambos', 'meses', 0, 11, 9.5, 14.0)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('RED: validated-only filter — a Capturado result is excluded from the report (D8)', () => {
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)
    const capturadoParam = insertParam(testDb.db, examId, 'Leucocitos', 'x10^3/uL', 'numerico', 2)
    insertRange(testDb.db, capturadoParam, 'Ambos', 'anios', 0, 99, 4.0, 11.0)
    insertResult(testDb.db, ordenExamenId, capturadoParam, 9, RESULT_STATUS.CAPTURADO, null)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes).toHaveLength(1)
    const rows = report.examenes[0].resultados
    expect(rows).toHaveLength(1)
    expect(rows[0].analisis).toBe('Hemoglobina')
    expect(rows.every((row) => row.analisis !== 'Leucocitos')).toBe(true)
  })

  it('groups multiple validated exams into ONE report (M8.1)', () => {
    const otherExam = createExam(testDb.db, 'ORINA', 50)
    const otherParam = insertParam(testDb.db, otherExam, 'Proteínas', 'mg/dL', 'numerico')
    insertRange(testDb.db, otherParam, 'Ambos', 'anios', 0, 99, 0, 15)
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)
    const otherOe = testDb.db
      .prepare('INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, ?, 0)')
      .run(ordenId, otherExam, 50)
    insertResult(testDb.db, Number(otherOe.lastInsertRowid), otherParam, 5, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes).toHaveLength(2)
    expect(report.examenes.map((exam) => exam.nombre)).toEqual(['Examen HEMO', 'Examen ORINA'])
  })

  it('drops exams with zero validated results from the report', () => {
    const otherExam = createExam(testDb.db, 'ORINA', 50)
    const otherParam = insertParam(testDb.db, otherExam, 'Proteínas', 'mg/dL', 'numerico')
    insertRange(testDb.db, otherParam, 'Ambos', 'anios', 0, 99, 0, 15)
    const otherOe = testDb.db
      .prepare('INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, ?, 0)')
      .run(ordenId, otherExam, 50)
    insertResult(testDb.db, Number(otherOe.lastInsertRowid), otherParam, 5, RESULT_STATUS.CAPTURADO, null)
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes).toHaveLength(1)
    expect(report.examenes[0].nombre).toBe('Examen HEMO')
  })

  it('config-driven header: lab name, RIF, address and phone come from configuration, never hardcoded', () => {
    setConfigValue(testDb.db, 'lab_nombre', 'Lab Central')
    setConfigValue(testDb.db, 'lab_rif', 'J-30012345-6')
    setConfigValue(testDb.db, 'lab_direccion', 'Av. Principal, Maracaibo')
    setConfigValue(testDb.db, 'lab_telefono', '0261-1234567')
    setConfigValue(testDb.db, 'lab_logo', 'data:image/png;base64,QUJD')
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.header.nombre).toBe('Lab Central')
    expect(report.header.rif).toBe('J-30012345-6')
    expect(report.header.direccion).toBe('Av. Principal, Maracaibo')
    expect(report.header.telefono).toBe('0261-1234567')
  })

  it('logo: a base64 data URL passes through; a machine filesystem path is rejected (N11.3)', () => {
    setConfigValue(testDb.db, 'lab_logo', 'data:image/png;base64,QUJD')
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)
    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })
    expect(report.header.logo).toBe('data:image/png;base64,QUJD')

    setConfigValue(testDb.db, 'lab_logo', 'C:/Users/alguna/ruta/logo.png')
    const reportWithPath = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })
    expect(reportWithPath.header.logo).toBeNull()
  })

  it('bioanalist signature block comes from configuration (M8.3)', () => {
    setConfigValue(testDb.db, 'prof_nombre', 'MSc. Judith Lugo')
    setConfigValue(testDb.db, 'prof_titulo', 'Lic. en Bioanálisis')
    setConfigValue(testDb.db, 'prof_msds', 'MSDS: 11330')
    setConfigValue(testDb.db, 'prof_cbz', 'CBZ: 2122')
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.bioanalista.nombre).toBe('MSc. Judith Lugo')
    expect(report.bioanalista.titulo).toBe('Lic. en Bioanálisis')
    expect(report.bioanalista.registro_msds).toBe('MSDS: 11330')
    expect(report.bioanalista.registro_cbz).toBe('CBZ: 2122')
  })

  it('medico referente from the order appears in the report data', () => {
    const medicoRow = testDb.db
      .prepare("INSERT INTO medicos_referentes (nombre, cedula, especialidad, telefono, activo) VALUES ('Dr. Rojas', 'V-5123456', 'Medicina Interna', '0414-5551234', 1)")
      .run()
    const medicoId = Number(medicoRow.lastInsertRowid)
    testDb.db.prepare('UPDATE ordenes SET medico_id = ? WHERE id = ?').run(medicoId, ordenId)
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.medicoReferente).not.toBeNull()
    expect(report.medicoReferente?.nombre).toBe('Dr. Rojas')
    expect(report.medicoReferente?.especialidad).toBe('Medicina Interna')
  })

  it('RED: patient header shows the exact age unit — 2 months for an infant (M8.4)', () => {
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.paciente.edad).toBe('2 meses')
    expect(report.paciente.sexo).toBe('Femenino')
    expect(report.paciente.nombreCompleto).toBe('López, María')
    expect(report.paciente.cedula).toBe('V-28000001')
  })

  it('exact age in years for an adult patient', () => {
    const adult = insertPatient(testDb.db, 'V-31000002', 'Carlos', 'Pérez', '1985-03-15', 'M')
    const adultOrder = helperCreateOrder(testDb.db, adult, [examId])
    const oe = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(adultOrder) as { id: number }
    insertResult(testDb.db, oe.id, parametroId, 15, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, adultOrder, { refDate: '2026-08-19' })

    expect(report.paciente.edad).toBe('41 años')
  })

  it('exact age in days for a neonate', () => {
    const neonato = insertPatient(testDb.db, 'V-32000003', 'Ana', 'Ríos', '2026-08-04', 'F')
    const order = helperCreateOrder(testDb.db, neonato, [examId])
    const oe = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(order) as { id: number }
    insertResult(testDb.db, oe.id, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, order, { refDate: '2026-08-19' })

    expect(report.paciente.edad).toBe('15 días')
  })

  it('recomputes the reference band at report time from the patient sex + exact age (A10)', () => {
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })
    const row = report.examenes[0].resultados[0]

    // The 2-month-old female matches the infant months band, not the adult one.
    expect(row.referencia).toBe('9.5 - 14')
    expect(row.unidad).toBe('g/dL')
  })

  it('keeps the stored flag on the row (M8.5)', () => {
    insertResult(testDb.db, ordenExamenId, parametroId, 18, RESULT_STATUS.VALIDADO, bioId, 'alto')

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes[0].resultados[0].flag).toBe('alto')
  })

  it('renders qualitative results', () => {
    const cualParam = insertParam(testDb.db, examId, 'Reacción', null, 'cualitativo', 2)
    insertResult(testDb.db, ordenExamenId, cualParam, 'Reactivo', RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes[0].resultados).toHaveLength(1)
    expect(report.examenes[0].resultados[0].resultado).toBe('Reactivo')
    expect(report.examenes[0].resultados[0].referencia).toBeNull()
  })

  it('carries order observaciones and copia flag into the data', () => {
    testDb.db.prepare('UPDATE ordenes SET observaciones = ? WHERE id = ?').run('Paciente en ayunas', ordenId)
    insertResult(testDb.db, ordenExamenId, parametroId, 11, RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19', copia: true })

    expect(report.orden.observaciones).toBe('Paciente en ayunas')
    expect(report.copia).toBe(true)
  })

  it('throws NOT_FOUND for an unknown order', () => {
    expect(() => buildReportData(testDb.db, 99999, { refDate: '2026-08-19' })).toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe('pdf module — pure formatting helpers', () => {
  it('formatExactAge picks years, months, then days with correct units', () => {
    expect(formatExactAge(computeExactAge('1985-03-15', '2026-08-19'))).toBe('41 años')
    expect(formatExactAge(computeExactAge('2026-06-19', '2026-08-19'))).toBe('2 meses')
    expect(formatExactAge(computeExactAge('2026-08-04', '2026-08-19'))).toBe('15 días')
    expect(formatExactAge({ days: 0, months: 0, years: 0 })).toBe('0 días')
    expect(formatExactAge({ days: 400, months: 13, years: 1 })).toBe('1 año')
    expect(formatExactAge({ days: 60, months: 1, years: 0 })).toBe('1 mes')
  })

  it('formatBand renders ranges, one-sided bounds, and null', () => {
    expect(formatBand({ min: 13.5, max: 17.5 })).toBe('13.5 - 17.5')
    expect(formatBand({ min: null, max: 5 })).toBe('hasta 5')
    expect(formatBand({ min: 2, max: null })).toBe('desde 2')
    expect(formatBand({ min: null, max: null })).toBeNull()
  })

  it('formatIsoDate renders dd/mm/yyyy', () => {
    expect(formatIsoDate('2026-08-19')).toBe('19/08/2026')
  })

  it('resolveLogo only accepts data:image URLs', () => {
    expect(resolveLogo('data:image/png;base64,QUJD')).toBe('data:image/png;base64,QUJD')
    expect(resolveLogo('data:image/svg+xml;base64,PHN2Zz4=')).toBe('data:image/svg+xml;base64,PHN2Zz4=')
    expect(resolveLogo('C:/Users/x/logo.png')).toBeNull()
    expect(resolveLogo('https://lab.example/logo.png')).toBeNull()
    expect(resolveLogo(null)).toBeNull()
  })

  it('encodeReportPayload produces a URL-safe base64 JSON that round-trips', () => {
    const payload = encodeReportPayload({ copia: true, header: { nombre: 'Lab', logo: null } } as never)
    expect(payload).not.toMatch(/[+/=]/)
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    expect(JSON.parse(decoded)).toEqual({ copia: true, header: { nombre: 'Lab', logo: null } })
  })
})

describe('pdf module — print pipeline (WU10b)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let bioId: number
  let ordenId: number
  let ordenExamenId: number
  let parametroId: number
  let session: Session

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    session = makeSession(ROLES.BIOANALISTA, bioId)
    const pacienteId = insertPatient(testDb.db, 'V-33000001', 'Pedro', 'Díaz', '1985-03-15', 'M')
    const examId = createExam(testDb.db, 'HEMO', 100)
    ordenId = helperCreateOrder(testDb.db, pacienteId, [examId])
    const oe = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    ordenExamenId = oe.id
    parametroId = insertParam(testDb.db, examId, 'Hemoglobina', 'g/dL', 'numerico')
    insertRange(testDb.db, parametroId, 'M', 'anios', 18, 99, 13.5, 17.5)
    insertResult(testDb.db, ordenExamenId, parametroId, 15, RESULT_STATUS.VALIDADO, bioId)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('RED: printReportToPrinter writes a reporte.impreso audit row with actor and timestamp', async () => {
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    await printReportToPrinter(testDb.db, ordenId, session, deps)

    const entries = listAuditEntries(testDb.db, { accion: 'reporte.impreso' })
    expect(entries).toHaveLength(1)
    expect(entries[0].usuario_id).toBe(bioId)
    expect(entries[0].entidad).toBe('orden')
    expect(entries[0].entidad_id).toBe(ordenId)
    expect(entries[0].creado_en).toBeTruthy()
  })

  it('printReportToPrinter waits for document.fonts.ready before printing', async () => {
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    await printReportToPrinter(testDb.db, ordenId, session, deps)

    expect(mock.calls.js).toHaveLength(1)
    expect(mock.calls.js[0]).toBe(REPORT_FONT_HANDSHAKE)
    expect(mock.calls.js[0]).toContain('document.fonts.ready')
  })

  it('printReportToPrinter invokes webContents.print with the OS dialog (silent:false)', async () => {
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    await printReportToPrinter(testDb.db, ordenId, session, deps)

    expect(mock.calls.printOptions).toHaveLength(1)
    expect(mock.calls.printOptions[0]).toEqual({ silent: false })
  })

  it('printReportToPrinter does NOT audit when the print dialog is cancelled', async () => {
    const mock = makeMockWindow()
    mock.print.mockImplementation((_options: Record<string, unknown>, callback?: (success: boolean, reason: string) => void) => {
      callback?.(false, 'cancelled')
    })
    const deps = makeDeps(mock)

    await expect(printReportToPrinter(testDb.db, ordenId, session, deps)).rejects.toThrow()

    const entries = listAuditEntries(testDb.db, { accion: 'reporte.impreso' })
    expect(entries).toHaveLength(0)
    expect(mock.destroy).toHaveBeenCalled()
  })

  it('printReportToPdf prints A4 with printBackground and config margins, and audits reporte.impreso', async () => {
    setConfigValue(
      testDb.db,
      'print_margins',
      JSON.stringify({ top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }),
    )
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    const pdf = await printReportToPdf(testDb.db, ordenId, session, deps)

    expect(pdf.toString('utf8')).toContain('%PDF')
    expect(mock.calls.pdfOptions).toHaveLength(1)
    expect(mock.calls.pdfOptions[0].pageSize).toBe('A4')
    expect(mock.calls.pdfOptions[0].printBackground).toBe(true)
    expect(mock.calls.pdfOptions[0].margins).toEqual({ top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' })
    const entries = listAuditEntries(testDb.db, { accion: 'reporte.impreso' })
    expect(entries).toHaveLength(1)
    expect(entries[0].entidad_id).toBe(ordenId)
  })

  it('printReportToPdf performs the fonts handshake BEFORE printing', async () => {
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    await printReportToPdf(testDb.db, ordenId, session, deps)

    expect(mock.calls.js).toHaveLength(1)
    expect(mock.calls.pdfOptions).toHaveLength(1)
  })

  it('destroy closes the offscreen window even when printToPDF fails', async () => {
    const mock = makeMockWindow()
    mock.printToPDF.mockRejectedValue(new Error('renderer crashed'))
    const deps = makeDeps(mock)

    await expect(printReportToPdf(testDb.db, ordenId, session, deps)).rejects.toThrow('renderer crashed')

    expect(mock.destroy).toHaveBeenCalled()
    const entries = listAuditEntries(testDb.db, { accion: 'reporte.impreso' })
    expect(entries).toHaveLength(0)
  })

  it('prints a COPIA report when requested (M8.7)', async () => {
    const mock = makeMockWindow()
    const deps = makeDeps(mock)

    await printReportToPrinter(testDb.db, ordenId, session, deps, { copia: true })

    const entries = listAuditEntries(testDb.db, { accion: 'reporte.impreso' })
    expect(entries).toHaveLength(1)
    expect(mock.calls.printOptions).toHaveLength(1)
  })
})

describe('pdf module — dual-format data (WU2/WU4, SPEC-VISUAL-PDF-TEMPLATES)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let bioId: number
  let pacienteId: number
  let ordenId: number

  /**
   * Microbiology fixtures need explicit categoria/nombre — the shared
   * createExam helper hardcodes categoria='Test'.
   */
  function insertExamWithCategoria(
    db: Database.Database,
    codigo: string,
    nombre: string,
    categoria: string,
    muestra = 'Sangre',
  ): number {
    const result = db
      .prepare(
        "INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES (?, ?, ?, ?, 100, 1)",
      )
      .run(codigo, nombre, categoria, muestra)
    return Number(result.lastInsertRowid)
  }

  beforeEach(async () => {
    testDb = await createTestDb()
    bioId = createUser(testDb.db, 'bio1', 'bioanalista')
    pacienteId = insertPatient(testDb.db, 'V-34000001', 'Eva', 'Montiel', '1985-03-15', 'F')
    const examId = createExam(testDb.db, 'HEMO', 100)
    ordenId = helperCreateOrder(testDb.db, pacienteId, [examId])
    const oe = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    const paramId = insertParam(testDb.db, examId, 'Hemoglobina', 'g/dL', 'numerico')
    insertRange(testDb.db, paramId, 'F', 'anios', 18, 99, 12.0, 16.0)
    insertResult(testDb.db, oe.id, paramId, 14, RESULT_STATUS.VALIDADO, bioId)
  })

  afterEach(() => {
    testDb.cleanup()
  })

  it('defaults formato to generico when no reporte_formato is configured', () => {
    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })
    expect(report.formato).toBe('generico')
    expect(report.isMicrobiology).toBe(false)
    expect(report.isBK).toBe(false)
    expect(report.antibiograma).toBeNull()
  })

  it('honors the configured reporte_formato as the default layout', () => {
    setConfigValue(testDb.db, 'reporte_formato', 'especializado')

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })
    expect(report.formato).toBe('especializado')
  })

  it('an explicit formato option overrides the configured default', () => {
    setConfigValue(testDb.db, 'reporte_formato', 'especializado')

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19', formato: 'generico' })
    expect(report.formato).toBe('generico')
  })

  it('flags isMicrobiology for a Bacteriología-category exam (accent-insensitive)', () => {
    const uroExam = insertExamWithCategoria(testDb.db, 'URO', 'UROCULTIVO', 'Bacteriología', 'Orina')
    const oe = testDb.db
      .prepare('INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, 100, 0)')
      .run(ordenId, uroExam)
    const paramId = insertParam(testDb.db, uroExam, 'Género', null, 'cualitativo')
    insertResult(testDb.db, Number(oe.lastInsertRowid), paramId, 'Escherichia coli', RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.isMicrobiology).toBe(true)
    expect(report.isBK).toBe(false)
  })

  it('flags isMicrobiology by exam NAME even without a microbiology category', () => {
    const gargantaExam = insertExamWithCategoria(testDb.db, 'GAR', 'CULTIVO DE GARGANTA', 'Test', 'Exudado faríngeo')
    const oe = testDb.db
      .prepare('INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, 100, 0)')
      .run(ordenId, gargantaExam)
    const paramId = insertParam(testDb.db, gargantaExam, 'Género', null, 'cualitativo')
    insertResult(testDb.db, Number(oe.lastInsertRowid), paramId, 'Streptococcus', RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.isMicrobiology).toBe(true)
  })

  it('flags isBK for a Baciloscopia exam (Zielh-Neelsen variant)', () => {
    const bkExam = insertExamWithCategoria(testDb.db, 'BKE', 'BK DE ESPUTO', 'Bacteriología', 'Esputo')
    const oe = testDb.db
      .prepare('INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado) VALUES (?, ?, 100, 0)')
      .run(ordenId, bkExam)
    const paramId = insertParam(testDb.db, bkExam, 'Bacilos Acido Resistentes', null, 'cualitativo')
    insertResult(testDb.db, Number(oe.lastInsertRowid), paramId, 'POSITIVO 2+', RESULT_STATUS.VALIDADO, bioId)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.isMicrobiology).toBe(true)
    expect(report.isBK).toBe(true)
  })

  it('carries the validated per-result comentario into the report data', () => {
    const oe = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ?').get(ordenId) as { id: number }
    const resultId = testDb.db
      .prepare('SELECT id FROM resultados WHERE orden_examen_id = ?')
      .get(oe.id) as { id: number }
    testDb.db.prepare('UPDATE resultados SET comentario = ? WHERE id = ?').run('Hemólisis leve', resultId.id)

    const report = buildReportData(testDb.db, ordenId, { refDate: '2026-08-19' })

    expect(report.examenes[0].resultados[0].comentario).toBe('Hemólisis leve')
  })

  it('isMicrobiologyExam: categories match accent-insensitively and names via /UROCULTIVO|CULTIVO|COPROCULTIVO|BK\\b/i', () => {
    expect(isMicrobiologyExam({ categoria: 'Bacteriología', nombre: 'Examen X' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'bacteriologia', nombre: 'Examen X' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Urocultivo', nombre: 'Examen X' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Test', nombre: 'UROCULTIVO DE ORINA' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Test', nombre: 'COPROCULTIVO' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Test', nombre: 'CULTIVO DE GARGANTA' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Test', nombre: 'BK DE ESPUTO' })).toBe(true)
    expect(isMicrobiologyExam({ categoria: 'Hematología', nombre: 'HEMOGRAMA' })).toBe(false)
  })

  it('isBKExam: /BK|BACILO/i on the exam name only', () => {
    expect(isBKExam('BK DE ESPUTO')).toBe(true)
    expect(isBKExam('BACILOSCOPIA DE LCR')).toBe(true)
    expect(isBKExam('UROCULTIVO')).toBe(false)
    expect(isBKExam('HEMOGRAMA')).toBe(false)
  })

  it('the print pipeline encodes the chosen formato into the payload (WU4)', async () => {
    setConfigValue(testDb.db, 'reporte_formato', 'especializado')
    const mock = makeMockWindow()
    const payloads: string[] = []
    const deps: PdfDeps = {
      createOffscreenWindow: vi.fn(async (_templatePath: string, payload: string) => {
        payloads.push(payload)
        return mock.win
      }),
    }

    await printReportToPdf(testDb.db, ordenId, makeSession(ROLES.BIOANALISTA, bioId), deps)
    const defaultPayload = JSON.parse(Buffer.from(payloads[0], 'base64url').toString('utf8'))
    expect(defaultPayload.formato).toBe('especializado')

    await printReportToPdf(testDb.db, ordenId, makeSession(ROLES.BIOANALISTA, bioId), deps, { formato: 'generico' })
    const overridePayload = JSON.parse(Buffer.from(payloads[1], 'base64url').toString('utf8'))
    expect(overridePayload.formato).toBe('generico')
  })
})
