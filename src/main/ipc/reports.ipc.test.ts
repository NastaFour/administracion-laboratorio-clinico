import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createExam, createOrder as helperCreateOrder, createPatient, createTestDb, createUser } from '../repositories/test-helpers'
import { buildGuardedHandler } from './register'
import { reportsChannels, ERROR_CODES, RESULT_STATUS, RESULT_TYPE, type Session } from '@/shared/contracts'
import { createResult } from '../repositories/results'
import { handlePrintReport, handleSaveReportPdf, registerReportsHandlers } from './reports.ipc'
import type { PdfDeps, ReportWindowLike } from '../services/pdf'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showSaveDialog: vi.fn() },
  BrowserWindow: { getFocusedWindow: vi.fn(() => null) },
}))

function makeSession(role: Session['rol'], userId: number): Session {
  return {
    userId,
    usuario: `user${userId}`,
    nombre: 'Usuario',
    rol: role,
    loginAt: new Date().toISOString(),
    debe_cambiar_clave: false,
  }
}

function makeMockWindow(): { win: ReportWindowLike; printToPDF: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } {
  const printToPDF = vi.fn(async () => Buffer.from('%PDF-1.4 mock'))
  const destroy = vi.fn()
  const win: ReportWindowLike = {
    webContents: {
      executeJavaScript: vi.fn(async () => true),
      printToPDF,
      print: vi.fn((_options, callback?: (success: boolean, failureReason: string) => void) =>
        callback?.(true, ''),
      ),
    },
    destroy,
  }
  return { win, printToPDF, destroy }
}

function makeDeps(mock: { win: ReportWindowLike }): PdfDeps {
  return { createOffscreenWindow: vi.fn(async () => mock.win) }
}

describe('reports IPC (WU12 re-print / re-export)', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>
  let userId: number
  let ordenId: number

  beforeEach(async () => {
    testDb = await createTestDb()
    userId = createUser(testDb.db, 'tec1', 'tecnico')
    const pacienteId = createPatient(testDb.db, 'V-60000001')
    const examId = createExam(testDb.db, 'REP01', 500)
    const paramId = Number(
      testDb.db
        .prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, activo) VALUES (?, 'Glucosa', 1, 'mg/dL', 'numerico', 1)")
        .run(examId)
        .lastInsertRowid,
    )
    ordenId = helperCreateOrder(testDb.db, pacienteId, [examId])
    const junctionRow = testDb.db.prepare('SELECT id FROM orden_examenes WHERE orden_id = ? LIMIT 1').get(ordenId) as { id: number }
    createResult(testDb.db, {
      orden_examen_id: junctionRow.id,
      parametro_id: paramId,
      valor: { tipo: RESULT_TYPE.NUMERICO, valor: 95 },
      estatus: RESULT_STATUS.VALIDADO,
      validado_por: userId,
    })
  })

  afterEach(() => {
    testDb.cleanup()
  })

  describe('re-print (reports:print)', () => {
    it('regenerates the validated report through the WU10 pipeline and audits reporte.impreso', async () => {
      const mock = makeMockWindow()
      await handlePrintReport(
        testDb.db,
        { ordenId, copia: false },
        makeSession('tecnico', userId),
        makeDeps(mock),
      )
      expect(mock.win.webContents.executeJavaScript).toHaveBeenCalledWith('document.fonts.ready.then(() => true)')
      expect(mock.win.webContents.print).toHaveBeenCalled()
      expect(mock.destroy).toHaveBeenCalled()

      const audit = testDb.db
        .prepare("SELECT despues FROM auditoria WHERE accion = 'reporte.impreso' AND entidad_id = ?")
        .get(ordenId) as { despues: string } | undefined
      expect(audit).toBeDefined()
      expect(JSON.parse(audit?.despues ?? '{}')).toMatchObject({ modo: 'impresora', copia: false })
    })

    it('a cancelled print dialog is NOT audited', async () => {
      const win: ReportWindowLike = {
        webContents: {
          executeJavaScript: vi.fn(async () => true),
          printToPDF: vi.fn(),
          print: vi.fn((_options, callback?: (success: boolean, failureReason: string) => void) =>
            callback?.(false, 'canceled'),
          ),
        },
        destroy: vi.fn(),
      }
      await expect(
        handlePrintReport(testDb.db, { ordenId, copia: true }, makeSession('recepcion', userId), {
          createOffscreenWindow: vi.fn(async () => win),
        }),
      ).rejects.toThrow()
      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'reporte.impreso'").get() as { n: number }
      expect(audit.n).toBe(0)
    })
  })

  describe('re-export (reports:savePdf)', () => {
    it('writes the regenerated PDF to the given path and audits reporte.impreso', async () => {
      const mock = makeMockWindow()
      const outPath = path.join(os.tmpdir(), `labcore-rep-${Date.now()}.pdf`)
      try {
        await handleSaveReportPdf(
          testDb.db,
          { ordenId, copia: false, filePath: outPath },
          makeSession('admin', userId),
          makeDeps(mock),
        )
        expect(mock.printToPDF).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 'A4', printBackground: true }))
        expect(fs.existsSync(outPath)).toBe(true)
        expect(fs.readFileSync(outPath).toString()).toContain('%PDF-1.4 mock')
        const audit = testDb.db
          .prepare("SELECT despues FROM auditoria WHERE accion = 'reporte.impreso' AND entidad_id = ?")
          .get(ordenId) as { despues: string } | undefined
        expect(JSON.parse(audit?.despues ?? '{}')).toMatchObject({ modo: 'pdf', copia: false })
      } finally {
        fs.rmSync(outPath, { force: true })
      }
    })

    it('shows the native save dialog when no filePath is given and writes the chosen path', async () => {
      const { dialog } = await import('electron')
      const chosen = path.join(os.tmpdir(), `labcore-rep-dlg-${Date.now()}.pdf`)
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: chosen })
      const mock = makeMockWindow()
      try {
        await handleSaveReportPdf(testDb.db, { ordenId, copia: false }, makeSession('recepcion', userId), makeDeps(mock))
        expect(dialog.showSaveDialog).toHaveBeenCalled()
        expect(fs.existsSync(chosen)).toBe(true)
      } finally {
        fs.rmSync(chosen, { force: true })
      }
    })

    it('a cancelled save dialog is a no-op (no file, no audit)', async () => {
      const { dialog } = await import('electron')
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true } as Awaited<
        ReturnType<typeof dialog.showSaveDialog>
      >)
      const mock = makeMockWindow()
      await handleSaveReportPdf(testDb.db, { ordenId, copia: false }, makeSession('recepcion', userId), makeDeps(mock))
      expect(mock.printToPDF).not.toHaveBeenCalled()
      const audit = testDb.db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'reporte.impreso'").get() as { n: number }
      expect(audit.n).toBe(0)
    })
  })

  describe('role guards + registration', () => {
    it('allows every role (print/preview/history visible to all) and blocks anonymous', async () => {
      const handler = buildGuardedHandler(
        testDb.db,
        'reports:print',
        ['admin', 'bioanalista', 'tecnico', 'recepcion'],
        reportsChannels['reports:print'].request,
        async () => undefined,
        { getSession: () => makeSession('recepcion', userId), writeAudit: vi.fn() },
      )
      const result = await handler({}, { ordenId, copia: false })
      expect(result.ok).toBe(true)

      const anonymous = buildGuardedHandler(
        testDb.db,
        'reports:print',
        ['admin', 'bioanalista', 'tecnico', 'recepcion'],
        reportsChannels['reports:print'].request,
        async () => undefined,
        { getSession: () => null, writeAudit: vi.fn() },
      )
      const denied = await anonymous({}, { ordenId, copia: false })
      expect(denied.ok).toBe(false)
      if (!denied.ok) expect(denied.error.code).toBe(ERROR_CODES.PERMISSION_DENIED)
    })

    it('registerReportsHandlers registers print + savePdf (preview deferred to WU15)', async () => {
      const { ipcMain } = await import('electron')
      const handleSpy = vi.mocked(ipcMain.handle)
      handleSpy.mockClear()
      registerReportsHandlers(testDb.db)
      expect(handleSpy).toHaveBeenCalledWith('reports:print', expect.any(Function))
      expect(handleSpy).toHaveBeenCalledWith('reports:savePdf', expect.any(Function))
      expect(handleSpy).not.toHaveBeenCalledWith('reports:preview', expect.any(Function))
    })
  })
})