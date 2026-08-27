import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { CierrePage } from './CierrePage'

const mockRun = vi.fn()
const mockPrint = vi.fn()
const mockMetrics = vi.fn()
const mockList = vi.fn()

const sampleMetrics = {
  dia: { bs: 12500, usd: 10 },
  semana: { bs: 25000, usd: 30 },
  mes: { bs: 80000, usd: 120 },
  anio: { bs: 300000, usd: 500 },
}

const sampleHistory = [
  {
    id: 1,
    fecha: '2026-08-17',
    total_bs: 10000,
    total_usd: 5,
    tasa_bcv: 950,
    cerrado_por: 'caja1',
    cerrado_en: '2026-08-17T18:00:00.000Z',
    detalle_por_metodo: {
      efectivo: { bs: 10000, usd: 5 },
    },
  },
]

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
  mockMetrics.mockReset()
  mockList.mockReset()

  mockRun.mockResolvedValue({ ok: true, data: cierreData })
  mockPrint.mockResolvedValue({ ok: true, data: '<html>Cierre de Caja</html>' })
  mockMetrics.mockResolvedValue({ ok: true, data: sampleMetrics })
  mockList.mockResolvedValue({ ok: true, data: sampleHistory })

  window.api = {
    cierre: {
      run: mockRun,
      print: mockPrint,
      metrics: mockMetrics,
      list: mockList,
    },
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

  it('prints on every Imprimir click by waiting for the iframe load event, never window.open (S-JD3 regression)', async () => {
    render(<CierrePage />)

    fireEvent.click(screen.getByTestId('cierre-run'))
    await waitFor(() => {
      expect(screen.getByTestId('cierre-summary')).toBeInTheDocument()
    })

    // First click: a fresh srcdoc iframe mounts; printing must wait for its
    // load event (the srcdoc navigation is asynchronous, so there is no
    // synchronous readyState fast path in the component).
    await act(async () => {
      fireEvent.click(screen.getByTestId('cierre-print'))
    })

    expect(mockPrint).toHaveBeenCalledWith({ fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    const frame1 = document.querySelector('iframe[title="Cierre de caja"]') as HTMLIFrameElement
    expect(frame1).not.toBeNull()
    expect(frame1.getAttribute('srcdoc')).toBe('<html>Cierre de Caja</html>')

    const focusSpy1 = vi.fn()
    const printSpy1 = vi.fn()
    Object.defineProperty(frame1, 'contentWindow', { configurable: true, value: { focus: focusSpy1, print: printSpy1 } })

    // No printing before the load event fires (jsdom does not fire it on its own).
    expect(printSpy1).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.load(frame1)
    })

    expect(printSpy1).toHaveBeenCalledTimes(1)
    expect(focusSpy1).toHaveBeenCalledTimes(1)

    // Second click with identical HTML must still print: the key change
    // remounts a brand-new iframe whose load ends in a second print().
    await act(async () => {
      fireEvent.click(screen.getByTestId('cierre-print'))
    })
    expect(mockPrint).toHaveBeenCalledTimes(2)

    const frame2 = document.querySelector('iframe[title="Cierre de caja"]') as HTMLIFrameElement
    expect(frame2).not.toBeNull()
    expect(frame2).not.toBe(frame1)
    const focusSpy2 = vi.fn()
    const printSpy2 = vi.fn()
    Object.defineProperty(frame2, 'contentWindow', { configurable: true, value: { focus: focusSpy2, print: printSpy2 } })

    await act(async () => {
      fireEvent.load(frame2)
    })

    expect(printSpy2).toHaveBeenCalledTimes(1)
    expect(focusSpy2).toHaveBeenCalledTimes(1)
    expect(window.open).not.toHaveBeenCalled()
  })

  it('renders 4 accumulated metric cards and history table with reprint action', async () => {
    render(<CierrePage />)

    // Verify 4 live metric cards are rendered
    await waitFor(() => {
      expect(screen.getByText('Métricas de Recaudación en Vivo')).toBeInTheDocument()
      expect(screen.getByText('Recaudado Hoy')).toBeInTheDocument()
      expect(screen.getByText('Esta Semana (Lun–Dom)')).toBeInTheDocument()
      expect(screen.getByText('Este Mes')).toBeInTheDocument()
      expect(screen.getByText('Este Año')).toBeInTheDocument()
    })

    // Verify history table lists past closures
    await waitFor(() => {
      expect(screen.getByText('Historial de Cierres de Caja')).toBeInTheDocument()
      expect(screen.getByText('2026-08-17')).toBeInTheDocument()
      expect(screen.getByText('caja1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Reimprimir/i })).toBeInTheDocument()
    })

    // Click "Reimprimir" on the history row
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reimprimir/i }))
    })

    expect(mockPrint).toHaveBeenCalledWith({ fecha: '2026-08-17' })
  })
})
