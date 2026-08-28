import { BrowserWindow, dialog } from 'electron'
import fs from 'node:fs'
import type Database from 'better-sqlite3'
import { reportsChannels, ROLES, type ReportFormat, type Session } from '@/shared/contracts'
import { handle } from './register'
import { previewReport, printReportToPdf, printReportToPrinter, type PdfDeps } from '../services/pdf'

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
    const parent = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Exportar reporte PDF',
      defaultPath: `reporte-orden-${req.ordenId}.pdf`,
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