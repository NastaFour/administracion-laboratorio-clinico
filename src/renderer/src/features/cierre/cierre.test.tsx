import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CierrePage } from './CierrePage'

const mockRun = vi.fn()
const mockPrint = vi.fn()

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

  mockRun.mockResolvedValue({ ok: true, data: cierreData })
  mockPrint.mockResolvedValue({ ok: true, data: '<html>Cierre de Caja</html>' })

  window.api = {
    cierre: { run: mockRun, print: mockPrint },
  } as unknown as Window['api']

  // The sandboxed renderer must never reach window.open — keep it stubbed so
  // any accidental call is observable.
  vi.stubGlobal('open', vi.fn())
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

  it('prints the cierre receipt through the hidden iframe, never window.open (S-JD3 regression)', async () => {
    render(<CierrePage />)

    fireEvent.click(screen.getByTestId('cierre-run'))
    await waitFor(() => {
      expect(screen.getByTestId('cierre-summary')).toBeInTheDocument()
    })

    // Stub the print frame's content window BEFORE clicking Imprimir: the
    // component must push the HTML into the srcdoc iframe and invoke
    // contentWindow.print() on it — window.open is denied in production.
    const iframe = document.querySelector('iframe[title="Cierre de caja"]') as HTMLIFrameElement
    expect(iframe).not.toBeNull()
    const focusSpy = vi.fn()
    const printSpy = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: { focus: focusSpy, print: printSpy } })

    fireEvent.click(screen.getByTestId('cierre-print'))

    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalledWith({ fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
      expect(printSpy).toHaveBeenCalledTimes(1)
      expect(focusSpy).toHaveBeenCalled()
      expect(iframe.getAttribute('srcdoc')).toBe('<html>Cierre de Caja</html>')
    })
    expect(window.open).not.toHaveBeenCalled()
  })
})
