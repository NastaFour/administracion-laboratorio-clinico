/**
 * WU10 — PDF reporting engine.
 *
 * Data assembly (`buildReportData`) is pure main-process code with no Electron
 * imports so it runs under Vitest. The print pipeline creates a sandboxed
 * offscreen BrowserWindow, loads the shared HTML template, waits for the font
 * handshake (`document.fonts.ready`), then prints via `printToPDF` (A4) or the
 * OS print dialog. Every print/save action is audited `reporte.impreso`.
 *
 * Security (N2.5): the offscreen window ALWAYS runs with sandbox:true,
 * contextIsolation:true and webSecurity:true. webSecurity is never disabled.
 */

import { BrowserWindow } from 'electron'
import path from 'node:path'
import type Database from 'better-sqlite3'
import type { BioanalistaConfig, Flag, Session } from '@/shared/contracts'
import { ERROR_CODES, RESULT_STATUS } from '@/shared/contracts'
import { computeExactAge, selectBandForExactAge, type ExactAge } from './referenceRanges'
import { writeAudit } from './audit'
import { getOrder } from '../repositories/orders'
import { getPatient } from '../repositories/patients'
import { getMedico } from '../repositories/medicos'
import { getExam, getParam, listParams, listRanges } from '../repositories/catalog'
import { listResultsByOrderExam } from '../repositories/results'
import { getBioanalistaConfig, getLabConfig, getPrintConfig } from '../repositories/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportHeader {
  logo: string | null
  nombre: string
  rif: string | null
  direccion: string | null
  sede: string | null
  telefono: string | null
}

export interface ReportPatient {
  nombreCompleto: string
  cedula: string
  sexo: 'Masculino' | 'Femenino' | 'Otro'
  edad: string
  fechaNacimiento: string
}

export interface ReportMedico {
  nombre: string
  especialidad: string
  cedula: string | null
  telefono: string | null
}

export interface ReportResultRow {
  analisis: string
  resultado: string
  unidad: string | null
  referencia: string | null
  flag: Flag | null
  comentario: string | null
}

export interface ReportExam {
  nombre: string
  categoria: string
  tipoMuestra: string
  resultados: ReportResultRow[]
}

export interface ReportData {
  header: ReportHeader
  paciente: ReportPatient
  medicoReferente: ReportMedico | null
  orden: {
    id: number
    fecha: string
    observaciones: string | null
  }
  examenes: ReportExam[]
  bioanalista: BioanalistaConfig
  copia: boolean
  generadoEn: string
}

export interface BuildReportOptions {
  refDate?: Date | string
  copia?: boolean
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Format an exact age with the correct unit: years first, then months, then
 * days (M8.4 — a 2-month-old patient MUST show "2 meses").
 */
export function formatExactAge(exactAge: ExactAge): string {
  if (exactAge.years >= 1) {
    return `${exactAge.years} ${exactAge.years === 1 ? 'año' : 'años'}`
  }
  if (exactAge.months >= 1) {
    return `${exactAge.months} ${exactAge.months === 1 ? 'mes' : 'meses'}`
  }
  return `${exactAge.days} ${exactAge.days === 1 ? 'día' : 'días'}`
}

/**
 * Format a reference band for the "referencia" column. One-sided bounds use
 * "desde"/"hasta"; a band with no bounds renders as null (no reference shown).
 */
export function formatBand(band: { min: number | null; max: number | null }): string | null {
  if (band.min !== null && band.max !== null) {
    return `${band.min} - ${band.max}`
  }
  if (band.max !== null) {
    return `hasta ${band.max}`
  }
  if (band.min !== null) {
    return `desde ${band.min}`
  }
  return null
}

/** Render an ISO date-only string as dd/mm/yyyy (N9), timezone-safe. */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  if (!year || !month || !day) {
    return iso
  }
  return `${day}/${month}/${year}`
}

function sexLabel(sexo: string): ReportPatient['sexo'] {
  if (sexo === 'M') return 'Masculino'
  if (sexo === 'F') return 'Femenino'
  return 'Otro'
}

/**
 * The logo MUST be a base64 data URL (N11.3). A machine filesystem path or a
 * remote URL is rejected so reports never depend on lab-specific paths.
 */
export function resolveLogo(logo: string | null): string | null {
  if (logo && logo.startsWith('data:image/')) {
    return logo
  }
  return null
}

/** URL-safe base64 JSON used as the `?payload=` query for the template. */
export function encodeReportPayload(data: ReportData): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
}

// ---------------------------------------------------------------------------
// Report data builder (WU10a)
// ---------------------------------------------------------------------------

/**
 * Assemble the report data for one order. ONLY results in `Validado` state are
 * included (D8); exams without any validated result are dropped entirely. The
 * reference band is recomputed at report time from the patient's sex and exact
 * age (A10), while the flag stored at capture time is preserved.
 */
export function buildReportData(
  db: Database.Database,
  ordenId: number,
  options: BuildReportOptions = {},
): ReportData {
  const order = getOrder(db, ordenId)
  if (!order) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  const patient = getPatient(db, order.paciente_id)
  if (!patient) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }

  const lab = getLabConfig(db)
  const bioanalista = getBioanalistaConfig(db)
  const exactAge = computeExactAge(patient.fecha_nacimiento, options.refDate ?? new Date())
  const medico = order.medico_id ? getMedico(db, order.medico_id) : null

  const examenes: ReportExam[] = []
  for (const orderExam of order.examenes) {
    if (!orderExam.id) {
      continue
    }
    const exam = getExam(db, orderExam.examen_id)
    if (!exam) {
      throw new Error(ERROR_CODES.NOT_FOUND)
    }
    const validated = listResultsByOrderExam(db, orderExam.id).filter(
      (result) => result.estatus_validacion === RESULT_STATUS.VALIDADO,
    )
    if (validated.length === 0) {
      // D8: no non-validated result may reach a deliverable PDF; exams without
      // validated results are omitted from the report entirely.
      continue
    }
    const params = new Map(listParams(db, exam.id).map((param) => [param.id, param]))
    const resultados: ReportResultRow[] = validated.map((result) => {
      const param = params.get(result.parametro_id) ?? getParam(db, result.parametro_id)
      if (!param) {
        throw new Error(ERROR_CODES.NOT_FOUND)
      }
      const bands = listRanges(db, param.id)
      const band = selectBandForExactAge(bands, patient.sexo, exactAge)
      const resultado =
        result.valor_numerico !== null
          ? String(result.valor_numerico)
          : (result.valor_cualitativo ?? '')
      return {
        analisis: param.nombre,
        resultado,
        unidad: param.unidad,
        referencia: band ? formatBand({ min: band.valor_min, max: band.valor_max }) : null,
        flag: result.flag,
        comentario: result.comentario,
      }
    })
    examenes.push({
      nombre: exam.nombre,
      categoria: exam.categoria,
      tipoMuestra: exam.tipo_muestra,
      resultados,
    })
  }

  return {
    header: {
      logo: resolveLogo(lab.logo),
      nombre: lab.nombre,
      rif: lab.rif,
      direccion: lab.direccion,
      sede: lab.sede,
      telefono: lab.telefono,
    },
    paciente: {
      nombreCompleto: `${patient.apellido}, ${patient.nombre}`,
      cedula: patient.cedula,
      sexo: sexLabel(patient.sexo),
      edad: formatExactAge(exactAge),
      fechaNacimiento: formatIsoDate(patient.fecha_nacimiento),
    },
    medicoReferente: medico
      ? {
          nombre: medico.nombre,
          especialidad: medico.especialidad,
          cedula: medico.cedula,
          telefono: medico.telefono,
        }
      : null,
    orden: {
      id: order.id,
      fecha: formatIsoDate(order.fecha),
      observaciones: order.observaciones,
    },
    examenes,
    bioanalista,
    copia: options.copia ?? false,
    generadoEn: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Print pipeline (WU10b)
// ---------------------------------------------------------------------------

/** The deterministic font handshake required before any print (N11.4). */
export const REPORT_FONT_HANDSHAKE = 'document.fonts.ready.then(() => true)'

/** Minimal structural view of the offscreen window used for printing. */
export interface ReportWindowLike {
  webContents: {
    executeJavaScript: (code: string) => Promise<unknown>
    printToPDF: (options: Record<string, unknown>) => Promise<Buffer>
    print: (
      options: Record<string, unknown>,
      callback?: (success: boolean, failureReason: string) => void,
    ) => void
  }
  destroy: () => void
}

export interface PdfDeps {
  createOffscreenWindow?: (templatePath: string, payload: string) => Promise<ReportWindowLike>
}

export interface PrintOptions {
  copia?: boolean
}

/**
 * Locate the shared report template. The template files are copied next to the
 * main bundle (dist-electron/) by the Vite publicDir copy, so the template is
 * available both in development and inside the packaged app.asar.
 */
export function resolveReportTemplatePath(): string {
  return path.join(__dirname, 'report.html')
}

/**
 * Create the sandboxed offscreen window that renders the report.
 *
 * Security contract (N2.5): sandbox:true, contextIsolation:true and
 * webSecurity:true are ALWAYS set. webSecurity:false must never appear in this
 * codebase.
 */
export async function createReportWindow(
  templatePath: string,
  payload: string,
): Promise<ReportWindowLike> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
    },
  })
  await win.loadFile(templatePath, { query: { payload } })
  return win
}

function resolvePrintWindow(deps: PdfDeps, templatePath: string, payload: string): Promise<ReportWindowLike> {
  const factory = deps.createOffscreenWindow ?? createReportWindow
  return factory(templatePath, payload)
}

/**
 * Print a report to PDF (A4, backgrounds on, config margins). Waits for the
 * document.fonts.ready handshake before printing and audits `reporte.impreso`.
 * Returns the PDF buffer.
 */
export async function printReportToPdf(
  db: Database.Database,
  ordenId: number,
  session: Session,
  deps: PdfDeps = {},
  options: PrintOptions = {},
): Promise<Buffer> {
  const data = buildReportData(db, ordenId, { copia: options.copia })
  const win = await resolvePrintWindow(deps, resolveReportTemplatePath(), encodeReportPayload(data))
  try {
    await win.webContents.executeJavaScript(REPORT_FONT_HANDSHAKE)
    const printConfig = getPrintConfig(db)
    const pdf = await win.webContents.printToPDF({
      pageSize: printConfig.pageSize,
      printBackground: true,
      margins: printConfig.margins,
    })
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'reporte.impreso',
      entidad: 'orden',
      entidad_id: ordenId,
      despues: { modo: 'pdf', copia: data.copia },
    })
    return pdf
  } finally {
    win.destroy()
  }
}

/**
 * Print a report to the OS printer via webContents.print (M8.6). The print is
 * audited `reporte.impreso` only when the dialog actually sends the job; a
 * cancelled dialog throws and is NOT audited.
 */
export async function printReportToPrinter(
  db: Database.Database,
  ordenId: number,
  session: Session,
  deps: PdfDeps = {},
  options: PrintOptions = {},
): Promise<void> {
  const data = buildReportData(db, ordenId, { copia: options.copia })
  const win = await resolvePrintWindow(deps, resolveReportTemplatePath(), encodeReportPayload(data))
  try {
    await win.webContents.executeJavaScript(REPORT_FONT_HANDSHAKE)
    await new Promise<void>((resolve, reject) => {
      win.webContents.print({ silent: false }, (success, failureReason) => {
        if (!success) {
          reject(new Error(failureReason || 'Impresión cancelada'))
          return
        }
        writeAudit(db, {
          usuario_id: session.userId,
          accion: 'reporte.impreso',
          entidad: 'orden',
          entidad_id: ordenId,
          despues: { modo: 'impresora', copia: data.copia },
        })
        resolve()
      })
    })
  } finally {
    win.destroy()
  }
}
