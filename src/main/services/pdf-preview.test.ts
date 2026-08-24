import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createTestDb, createUser, createPatient, createExam, createOrder as helperCreateOrder } from '../repositories/test-helpers'
import { RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { createResult } from '../repositories/results'
import { listAuditEntries } from '../repositories/audit'
import { createPreviewBrowserWindow, previewReport, type PdfDeps, type PreviewWindowLike } from './pdf'

// Capture every BrowserWindow constructed so the preview security contract can
// be asserted directly (N2.5: sandbox/contextIsolation/webSecurity all true;
// webSecurity must NEVER be false).
const windows = vi.hoisted(() => [] as Array<{
  options: Record<string, unknown>
  loadFile: ReturnType<typeof vi.fn>
  show: ReturnType<typeof vi.fn>
}>)

vi.mock('electron', () => ({
  BrowserWindow: class {
    options: Record<string, unknown>
    loadFile: ReturnType<typeof vi.fn>
    show: ReturnType<typeof vi.fn>
    constructor(options: Record<string, unknown>) {
      this.options = options
      this.loadFile = vi.fn(async () => undefined)
      this.show = vi.fn()
      windows.push({ options, loadFile: this.loadFile, show: this.show })
    }
  },
}))

describe('pdf — preview window (C1 / M8.6)', () => {
  describe('createPreviewBrowserWindow', () => {
    beforeEach(() => {
      windows.length = 0
    })

    it('RED: creates a VISIBLE A4 window with sandbox/contextIsolation/webSecurity true and NEVER webSecurity:false', async () => {
      await createPreviewBrowserWindow('/fake/report.html', 'cGF5bG9hZA==')

      expect(windows).toHaveLength(1)
      const { options, loadFile } = windows[0]
      const wp = options.webPreferences as Record<string, unknown>

      // Security contract (N2.5) — the exact same settings as the print pipeline.
      expect(wp.sandbox).toBe(true)
      expect(wp.contextIsolation).toBe(true)
      expect(wp.webSecurity).toBe(true)
      expect(wp.nodeIntegration).toBe(false)
      expect(wp.offscreen).toBeUndefined()
      expect(wp.webSecurity).not.toBe(false)

      // Visible window (not offscreen), hidden until load completes, sized for A4.
      expect(options.show).toBe(false)
      expect(options.offscreen).toBeUndefined()
      expect(options.width).toBeGreaterThanOrEqual(790)
      expect(options.height).toBeGreaterThanOrEqual(1100)

      // Loads the SAME shared template with the base64url payload query.
      expect(loadFile).toHaveBeenCalledWith('/fake/report.html', { query: { payload: 'cGF5bG9hZA==' } })
    })
  })

  describe('previewReport', () => {
    let testDb: Awaited<ReturnType<typeof createTestDb>>
    let userId: number
    let ordenId: number

    beforeEach(async () => {
      testDb = await createTestDb()
      userId = createUser(testDb.db, 'bio1', 'bioanalista')
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

    it('RED: builds report data, loads the SAME template with a decodable payload, and shows the window', async () => {
      const show = vi.fn()
      const captured: Array<{ path: string; payload: string }> = []
      const deps: PdfDeps = {
        createPreviewWindow: vi.fn(async (path: string, payload: string) => {
          captured.push({ path, payload })
          return { show } satisfies PreviewWindowLike
        }),
      }

      await previewReport(testDb.db, ordenId, deps)

      expect(captured).toHaveLength(1)
      expect(captured[0].path.endsWith('report.html')).toBe(true)
      const decoded = JSON.parse(Buffer.from(captured[0].payload, 'base64url').toString('utf8'))
      expect(decoded.paciente.cedula).toBe('V-60000001')
      expect(decoded.examenes).toHaveLength(1)
      expect(decoded.examenes[0].resultados[0].analisis).toBe('Glucosa')
      expect(show).toHaveBeenCalledTimes(1)
    })

    it('RED: preview is NEVER audited — no reporte.impreso row is written (M8.6 audit-on-print-only)', async () => {
      const deps: PdfDeps = {
        createPreviewWindow: vi.fn(async () => ({ show: vi.fn() }) satisfies PreviewWindowLike),
      }

      await previewReport(testDb.db, ordenId, deps)

      expect(listAuditEntries(testDb.db, { accion: 'reporte.impreso' })).toHaveLength(0)
      expect(listAuditEntries(testDb.db, {})).toHaveLength(0)
    })

    it('throws NOT_FOUND for an unknown order', async () => {
      const deps: PdfDeps = {
        createPreviewWindow: vi.fn(async () => ({ show: vi.fn() }) satisfies PreviewWindowLike),
      }
      await expect(previewReport(testDb.db, 99999, deps)).rejects.toThrow('NOT_FOUND')
    })

    it('uses the real preview factory by default (no injected deps) and shows the window', async () => {
      windows.length = 0

      await previewReport(testDb.db, ordenId)

      expect(windows).toHaveLength(1)
      expect(windows[0].show).toHaveBeenCalledTimes(1)
      expect(windows[0].loadFile).toHaveBeenCalledTimes(1)
      const opts = windows[0].loadFile.mock.calls[0][1] as { query: { payload: string } }
      const decoded = JSON.parse(Buffer.from(opts.query.payload, 'base64url').toString('utf8'))
      expect(decoded.paciente.cedula).toBe('V-60000001')
    })
  })
})
