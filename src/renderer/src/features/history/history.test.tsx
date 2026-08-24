import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import type { OrderStatus, OrderWithExams } from '@/shared/contracts'
import { HistoryPage } from './HistoryPage'
import { buildHistoryCsv, paymentStateLabel, type HistoryRow } from '../../lib/historyCsv'

const order = (id: number, overrides: Partial<OrderWithExams> = {}): OrderWithExams => ({
  id,
  paciente_id: 1,
  medico_id: null,
  empresa_id: null,
  estatus: 'Completada' as OrderStatus,
  observaciones: null,
  total_bs: 1000,
  credito: false,
  anulada: false,
  motivo_anulacion: null,
  cerrada: false,
  fecha: '2026-08-20',
  creado_en: '2026-08-20T08:00:00.000Z',
  examenes: [{ id: 10, examen_id: 1, precio: 1000, tercerizado: false, proveedor: null, comentario: null }],
  ...overrides,
})

const balance = (overrides: Record<string, unknown> = {}) => ({
  orden_id: 1,
  total_bs: 1000,
  pagado_bs: 400,
  saldo_bs: 600,
  total_usd: 0,
  pagado_usd: 0,
  saldo_usd: 0,
  ...overrides,
})

const mockApi = {
  orders: { list: vi.fn() },
  patients: {
    list: vi.fn(),
    search: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  },
  catalog: { listExams: vi.fn() },
  payments: { balance: vi.fn() },
  reports: { print: vi.fn(), savePdf: vi.fn(), preview: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.orders.list.mockResolvedValue({
    ok: true,
    data: [
      order(1),
      order(2, { id: 2, paciente_id: 2, credito: true, fecha: '2026-07-06', examenes: [order(1).examenes[0], { ...order(1).examenes[0], id: 11, examen_id: 2 }] }),
      order(3, { id: 3, total_bs: 500, examenes: [{ ...order(1).examenes[0], id: 12, examen_id: 3, precio: 500 }] }),
    ],
  })
  mockApi.patients.list.mockResolvedValue({
    ok: true,
    data: [
      { id: 1, cedula: 'V-10000001', nombre: 'Ana', apellido: 'López', fecha_nacimiento: '1980-01-10', sexo: 'F', telefono: null, email: null, direccion: null, activo: true },
      { id: 2, cedula: 'V-10000002', nombre: 'Luis', apellido: 'García', fecha_nacimiento: '1975-06-20', sexo: 'M', telefono: null, email: null, direccion: null, activo: true },
    ],
  })
  mockApi.catalog.listExams.mockResolvedValue({
    ok: true,
    data: [
      { id: 1, codigo: 'HEM', nombre: 'Hemoglobina', categoria: 'Hematología', tipo_muestra: 'Sangre', precio: 1000, tercerizado: false, proveedor: null, activo: true },
      { id: 2, codigo: 'QUI', nombre: 'Glucosa', categoria: 'Química', tipo_muestra: 'Sangre', precio: 800, tercerizado: false, proveedor: null, activo: true },
      { id: 3, codigo: 'URI', nombre: 'Orina', categoria: 'Orina', tipo_muestra: 'Orina', precio: 500, tercerizado: false, proveedor: null, activo: true },
    ],
  })
  mockApi.payments.balance.mockImplementation(async ({ ordenId }: { ordenId: number }) => ({
    ok: true,
    data: balance(ordenId === 1 ? { saldo_bs: 0 } : ordenId === 3 ? { total_bs: 500, pagado_bs: 0, saldo_bs: 500 } : { saldo_bs: 600 }),
  }))
  mockApi.reports.print.mockResolvedValue({ ok: true, data: undefined })
  mockApi.reports.savePdf.mockResolvedValue({ ok: true, data: undefined })
  mockApi.reports.preview.mockResolvedValue({ ok: true, data: 'ok' })
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('HistoryPage', () => {
  it('lists orders with patient, cédula, date, status, exams, total and real payment state (M10.1)', async () => {
    render(<HistoryPage />)

    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())
    const row1 = within(screen.getByTestId('history-row-1'))
    expect(row1.getByText('López, Ana')).toBeInTheDocument()
    expect(row1.getByText('V-10000001')).toBeInTheDocument()
    expect(row1.getByText('20/08/2026')).toBeInTheDocument()
    expect(row1.getByText('Hemoglobina')).toBeInTheDocument()
    expect(row1.getByText('1.000 Bs')).toBeInTheDocument()
    // order 1 fully paid → Pagado; order 2 credit → Crédito; order 3 unpaid → Pendiente
    expect(row1.getByText('Pagado')).toBeInTheDocument()
    expect(within(screen.getByTestId('history-row-2')).getByText('Crédito')).toBeInTheDocument()
    expect(within(screen.getByTestId('history-row-3')).getByText('Pendiente')).toBeInTheDocument()
    expect(within(screen.getByTestId('history-row-2')).getByText('García, Luis')).toBeInTheDocument()
    expect(mockApi.orders.list).toHaveBeenCalledWith({})
  })

  it('filters by payment state and passes pendientePago to the main side (M10.2)', async () => {
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('history-payment'), { target: { value: 'Pendiente' } })
    await waitFor(() => {
      expect(mockApi.orders.list).toHaveBeenLastCalledWith({ pendientePago: true })
    })
  })

  it('filters by status', async () => {
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('history-status'), { target: { value: 'Pendiente' } })
    await waitFor(() => {
      expect(mockApi.orders.list).toHaveBeenLastCalledWith({ estatus: 'Pendiente' })
    })
  })

  it('shows an empty state when no orders match (M11.4-style, no fabricated rows)', async () => {
    mockApi.orders.list.mockResolvedValue({ ok: true, data: [] })
    render(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/No hay órdenes con estos filtros/i)).toBeInTheDocument()
  })

  it('re-prints a past order through reports:print (M10.3)', async () => {
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('history-reprint-1'))
    await waitFor(() => {
      expect(mockApi.reports.print).toHaveBeenCalledWith({ ordenId: 1, copia: false })
    })
  })

  it('re-exports a past order through reports:savePdf (M10.3)', async () => {
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('history-reexport-1'))
    await waitFor(() => {
      expect(mockApi.reports.savePdf).toHaveBeenCalledWith({ ordenId: 1, copia: false })
    })
  })

  it('opens the WYSIWYG preview through reports:preview (M8.6)', async () => {
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('history-preview-1'))
    await waitFor(() => {
      expect(mockApi.reports.preview).toHaveBeenCalledWith({ ordenId: 1, copia: false })
    })
  })

  it('exports the filtered rows as a CSV', async () => {
    const createObjectUrl = vi.fn().mockReturnValue('blob:mock')
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrl, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, writable: true })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<HistoryPage />)
    await waitFor(() => expect(screen.getByTestId('history-row-1')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('history-export-csv'))
    await waitFor(() => expect(clickSpy).toHaveBeenCalled())
  })
})

describe('historyCsv helpers', () => {
  it('paymentStateLabel maps real balances to Pagado/Pendiente/Crédito', () => {
    expect(paymentStateLabel(0, false)).toBe('Pagado')
    expect(paymentStateLabel(600, false)).toBe('Pendiente')
    expect(paymentStateLabel(600, true)).toBe('Crédito')
  })

  it('buildHistoryCsv renders header, rows and escapes commas', () => {
    const row: HistoryRow = {
      orden: order(1, { total_bs: 1000, credito: true }),
      balance: balance(),
      pacienteNombre: 'López, Ana',
      pacienteCedula: 'V-10000001',
    }
    const csv = buildHistoryCsv([row], new Map([[1, 'Hemoglobina']]))
    expect(csv.startsWith('\uFEFFID,Fecha,Paciente,Cédula,Estatus,Exámenes,Total Bs,Pagado Bs,Saldo Bs,Estado de pago')).toBe(true)
    expect(csv).toContain('"López, Ana"')
    expect(csv).toContain('Hemoglobina')
    expect(csv).toContain('Crédito')
  })
})