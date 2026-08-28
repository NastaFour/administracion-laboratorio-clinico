import { app, BrowserWindow, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { reportsChannels, ROLES, type ReportFormat, type Session } from '@/shared/contracts'
import { handle } from './register'
import { previewReport, printReportToPdf, printReportToPrinter, type PdfDeps } from '../services/pdf'
import { getOrder } from '../repositories/orders'
import { getPatient } from '../repositories/patients'
import { getExam } from '../repositories/catalog'

// Role matrix (design): print/preview/history/dashboard are available to every role.
const REPORT_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export interface ReportRequestInput {
  ordenId: number
  copia: boolean
  filePath?: string
  /** Optional per-request layout override; omitted = configured default. */
  formato?: ReportFormat
  /** Hide the observaciones block (default: show). */
  mostrarObservaciones?: boolean
}

/**
 * Build default report file name in the format:
 * [nombre]-[apellido]-reporte-[examen].pdf (e.g. johnny-galue-reporte-hematologia-completa.pdf)
 */
export function buildReportFilename(db: Database.Database, ordenId: number): string {
  try {
    const order = getOrder(db, ordenId)
    if (!order) return `reporte-orden-${ordenId}.pdf`

    const patient = getPatient(db, order.paciente_id)
    const examNames = (order.examenes ?? [])
      .map((e) => getExam(db, e.examen_id)?.nombre)
      .filter((n): n is string => Boolean(n))

    const slug = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const nombre = patient?.nombre ? slug(patient.nombre) : ''
    const apellido = patient?.apellido ? slug(patient.apellido) : ''
    const examen = examNames.length > 0 ? examNames.slice(0, 3).map(slug).filter(Boolean).join('-') : ''

    const parts = [nombre, apellido, 'reporte', examen].filter(Boolean)
    if (parts.length > 1) {
      return `${parts.join('-')}.pdf`
    }
    return `reporte-orden-${ordenId}.pdf`
  } catch {
    return `reporte-orden-${ordenId}.pdf`
  }
}

/**
 * Open the WYSIWYG on-screen preview of a validated report (M8.6). Loads the
 * shared WU10 template into a visible window with the print pipeline's security
 * settings. No print and no audit row on preview (audit is print/save only).
 */
export async function handlePreviewReport(
  db: Database.Database,
  req: ReportRequestInput,
  _session: Session,
  deps?: PdfDeps,
): Promise<string> {
  await previewReport(db, req.ordenId, deps, { copia: req.copia, formato: req.formato, mostrarObservaciones: req.mostrarObservaciones })
  return 'ok'
}

/**
 * Re-print any past order (M10.3): regenerate the validated report through the
 * WU10 pipeline and send it to the OS printer. The WU10 service audits
 * `reporte.impreso` and only prints on a successful dialog.
 */
export async function handlePrintReport(
  db: Database.Database,
  req: ReportRequestInput,
  session: Session,
  deps?: PdfDeps,
): Promise<void> {
  await printReportToPrinter(db, req.ordenId, session, deps, { copia: req.copia, formato: req.formato, mostrarObservaciones: req.mostrarObservaciones })
}

/**
 * Re-export any past order as a PDF (M10.3): regenerate the validated report
 * via the WU10 pipeline and write it to disk. When no path is supplied the
 * native save dialog picks the destination; a cancelled dialog is a no-op.
 */
export async function handleSaveReportPdf(
  db: Database.Database,
  req: ReportRequestInput,
  session: Session,
  deps?: PdfDeps,
): Promise<void> {
  let filePath = req.filePath
  if (!filePath) {
    let parent: BrowserWindow | null = null
    try {
      const focused = BrowserWindow.getFocusedWindow()
      if (focused && !focused.isDestroyed()) {
        parent = focused
      }
    } catch {
      parent = null
    }

    let defaultDir = ''
    try {
      defaultDir = app?.getPath('downloads') || app?.getPath('documents') || ''
    } catch {
      defaultDir = ''
    }

    const defaultFilename = buildReportFilename(db, req.ordenId)
    const defaultPath = defaultDir ? path.join(defaultDir, defaultFilename) : defaultFilename

    const options = {
      title: 'Exportar reporte PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    }
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) {
      return
    }
    filePath = result.filePath
  }
  const pdf = await printReportToPdf(db, req.ordenId, session, deps, { copia: req.copia, formato: req.formato, mostrarObservaciones: req.mostrarObservaciones })
  await fs.promises.writeFile(filePath, pdf)
}

export function registerReportsHandlers(db: Database.Database): void {
  handle(db, 'reports:preview', REPORT_ROLES, reportsChannels['reports:preview'].request, handlePreviewReport)
  handle(db, 'reports:print', REPORT_ROLES, reportsChannels['reports:print'].request, handlePrintReport)
  handle(db, 'reports:savePdf', REPORT_ROLES, reportsChannels['reports:savePdf'].request, handleSaveReportPdf)
}