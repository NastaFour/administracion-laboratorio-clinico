import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CierrePage } from './CierrePage'

const mockRun = vi.fn()
const mockPrint = vi.fn()
const mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
}

const cierreData = {
  fecha: '2026-08-18',
  total_bs: 12500,
  total_usd: 10,
  tasa_bcv: 950,
  tasa_actualizado_en: '2026-08-18T10:00:00.000Z',
  usuario_id: 1,
  creado_en: '2026-08-18T11:00:00.000Z',
  detalle_por_metodo: {
    pago_movil: { bs: 1000, usd: 0 },
    transferencia: { bs: 9500, usd: 10 },
    punto: { bs: 0, usd: 0 },
    efectivo: { bs: 2000, usd: 0 },
    mixto: { bs: 0, usd: 0 },
  },
}

beforeEach(() => {
  mockRun.mockReset()
  mockPrint.mockReset()
  mockWin.document.write.mockClear()
  mockWin.document.close.mockClear()
  mockWin.print.mockClear()

  mockRun.mockResolvedValue({ ok: true, data: cierreData })
  mockPrint.mockResolvedValue({ ok: true, data: '<html>Cierre de Caja</html>' })

  window.api = {
    cierre: { run: mockRun, print: mockPrint },
  } as unknown as Window['api']

  vi.stubGlobal('open', vi.fn().mockReturnValue(mockWin))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CierrePage', () => {
  it('runs the cierre and renders totals plus the rate last-updated date', async () => {
    render(<CierrePage />)

    fireEvent.click(screen.getByTestId('cierre-run'))

    await waitFor(() => {
      expect(screen.getByTestId('cierre-summary')).toBeInTheDocument()
    })
    expect(mockRun).toHaveBeenCalledWith({ fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    expect(screen.getByText('Total Bs')).toBeInTheDocument()
    expect(screen.getByText('Total USD')).toBeInTheDocument()
    expect(screen.getByTestId('cierre-rate-updated')).toHaveTextContent('Última actualización de la tasa')
  })

  it('prints the cierre receipt through cierre:print', async () => {
    render(<CierrePage />)

    fireEvent.click(screen.getByTestId('cierre-run'))
    await waitFor(() => {
      expect(screen.getByTestId('cierre-summary')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cierre-print'))

    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalledWith({ fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
      expect(mockWin.document.write).toHaveBeenCalledWith('<html>Cierre de Caja</html>')
      expect(mockWin.print).toHaveBeenCalled()
    })
  })
})
