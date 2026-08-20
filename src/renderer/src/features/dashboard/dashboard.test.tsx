import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'
import { TodayView } from './TodayView'
import { DebtorsView } from './DebtorsView'
import { StatsView } from './StatsView'
import { TrendsView } from './TrendsView'

const emptyToday = {
  ordenes_hoy: 0,
  resultados_pendientes: 0,
  ingreso_bs: 0,
  ingreso_usd: 0,
  examenes_por_categoria: {},
}

const mockApi = {
  dashboard: {
    today: vi.fn(),
    debtors: vi.fn(),
    stats: vi.fn(),
    trends: vi.fn(),
    patientAnalytes: vi.fn(),
  },
  patients: { search: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.dashboard.today.mockResolvedValue({ ok: true, data: emptyToday })
  mockApi.dashboard.debtors.mockResolvedValue({ ok: true, data: [] })
  mockApi.dashboard.stats.mockResolvedValue({
    ok: true,
    data: { top_examenes: [], ingreso_mensual: [{ mes: '2026-08', bs: 0, usd: 0 }], ingreso_mes_anterior_bs: 0, ingreso_mes_anterior_usd: 0 },
  })
  mockApi.dashboard.trends.mockResolvedValue({
    ok: true,
    data: { paciente_id: 1, parametro_id: 2, parametro_nombre: 'Glucosa', puntos: [] },
  })
  mockApi.dashboard.patientAnalytes.mockResolvedValue({ ok: true, data: [] })
  mockApi.patients.search.mockResolvedValue({ ok: true, data: [] })
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('DashboardPage', () => {
  it('renders the four tabs and shows the Today view by default', async () => {
    render(<DashboardPage />)
    expect(screen.getByTestId('dashboard-tab-today')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-tab-debtors')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-tab-stats')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-tab-trends')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('today-view')).toBeInTheDocument())
  })

  it('switches between views', async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByTestId('today-view')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('dashboard-tab-debtors'))
    await waitFor(() => expect(screen.getByTestId('debtors-view')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('dashboard-tab-stats'))
    await waitFor(() => expect(screen.getByTestId('stats-view')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('dashboard-tab-trends'))
    await waitFor(() => expect(screen.getByTestId('trends-view')).toBeInTheDocument())
  })
})

describe('TodayView (empty state, M11.4)', () => {
  it('shows the empty state instead of fabricated zeros when there is no activity', async () => {
    render(<TodayView />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/Hoy aún no hay actividad/i)).toBeInTheDocument()
    expect(screen.queryByTestId('kpi-ordenes-hoy')).not.toBeInTheDocument()
  })

  it('renders real KPIs when the day has activity (M11.1)', async () => {
    mockApi.dashboard.today.mockResolvedValue({
      ok: true,
      data: {
        ordenes_hoy: 3,
        resultados_pendientes: 1,
        ingreso_bs: 11000,
        ingreso_usd: 10,
        examenes_por_categoria: { Hematología: 2, Química: 1 },
      },
    })
    render(<TodayView />)
    await waitFor(() => {
      expect(screen.getByTestId('kpi-ordenes-hoy')).toHaveTextContent('3')
    })
    expect(screen.getByTestId('kpi-resultados-pendientes')).toHaveTextContent('1')
    expect(screen.getByTestId('kpi-ingreso-bs')).toHaveTextContent('11.000,00 Bs')
    expect(screen.getByTestId('kpi-ingreso-usd')).toHaveTextContent('$10,00')
    expect(screen.getByText('Hematología')).toBeInTheDocument()
  })
})

describe('DebtorsView (aging buckets)', () => {
  it('shows an empty state when no balances are pending', async () => {
    render(<DebtorsView />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/No hay saldos pendientes/i)).toBeInTheDocument()
  })

  it('groups debtors into the correct aging buckets (M11.1)', async () => {
    mockApi.dashboard.debtors.mockResolvedValue({
      ok: true,
      data: [
        { rango: '0-30', paciente_id: 1, paciente_nombre: 'López, Ana', saldo_bs: 300, saldo_usd: 0, dias_pendientes: 5 },
        { rango: '31-60', paciente_id: 2, paciente_nombre: 'García, Luis', saldo_bs: 500, saldo_usd: 0, dias_pendientes: 45 },
        { rango: '61-90', paciente_id: 3, paciente_nombre: 'Pérez, María', saldo_bs: 200, saldo_usd: 0, dias_pendientes: 80 },
        { rango: '90+', paciente_id: 4, paciente_nombre: 'Rojas, Carlos', saldo_bs: 800, saldo_usd: 0, dias_pendientes: 141 },
      ],
    })
    render(<DebtorsView />)
    await waitFor(() => {
      expect(screen.getByTestId('bucket-0-30')).toBeInTheDocument()
    })
    expect(screen.getByText('0 – 30 días')).toBeInTheDocument()
    expect(screen.getByText('31 – 60 días')).toBeInTheDocument()
    expect(screen.getByText('61 – 90 días')).toBeInTheDocument()
    expect(screen.getByText('Más de 90 días')).toBeInTheDocument()
    expect(screen.getByText('López, Ana')).toBeInTheDocument()
    expect(screen.getByText('García, Luis')).toBeInTheDocument()
    expect(screen.getByText('Rojas, Carlos')).toBeInTheDocument()
  })
})

describe('StatsView (range + charts wired to real data)', () => {
  it('shows an empty state for an empty range (M11.4)', async () => {
    render(<StatsView />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/Sin estadísticas en este rango/i)).toBeInTheDocument()
  })

  it('renders recharts wired to the real aggregates (M11.2 Should) and the previous-month comparison', async () => {
    mockApi.dashboard.stats.mockResolvedValue({
      ok: true,
      data: {
        top_examenes: [
          { examen_id: 1, examen_nombre: 'Hemoglobina', cantidad: 12, ingreso_bs: 12000 },
          { examen_id: 2, examen_nombre: 'Glucosa', cantidad: 9, ingreso_bs: 9000 },
        ],
        ingreso_mensual: [
          { mes: '2026-07', bs: 8000, usd: 0 },
          { mes: '2026-08', bs: 21000, usd: 10 },
        ],
        ingreso_mes_anterior_bs: 5000,
        ingreso_mes_anterior_usd: 5,
      },
    })
    render(<StatsView />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-top-chart')).toBeInTheDocument()
    })
    expect(screen.getByTestId('stats-revenue-chart')).toBeInTheDocument()
    // the exam appears both as a chart tick and as a table row
    expect(screen.getAllByText('Hemoglobina').length).toBeGreaterThan(0)
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getByText(/Comparado con el mes anterior: 5\.000,00 Bs/i)).toBeInTheDocument()
    // recharts renders its SVG asynchronously after mount effects
    await waitFor(() => {
      expect(screen.getByTestId('stats-top-chart').querySelector('svg')).not.toBeNull()
    })
    expect(screen.getByTestId('stats-revenue-chart').querySelector('svg')).not.toBeNull()
  })

  it('re-fetches when a new date range is applied (M11.3)', async () => {
    render(<StatsView />)
    await waitFor(() => expect(mockApi.dashboard.stats).toHaveBeenCalled())

    const desde = screen.getByLabelText('Desde') as HTMLInputElement
    fireEvent.change(desde, { target: { value: '2026-06-01' } })
    fireEvent.click(screen.getByTestId('stats-apply'))

    await waitFor(() => {
      expect(mockApi.dashboard.stats).toHaveBeenLastCalledWith({ desde: '2026-06-01', hasta: expect.any(String) })
    })
  })
})

describe('TrendsView (per-patient analyte series)', () => {
  it('shows the initial empty state asking for a patient', () => {
    render(<TrendsView />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getAllByText(/Seleccione un paciente/i).length).toBeGreaterThan(0)
  })

  it('wires the patient → analyte → chart flow with real data (M10.4 Should)', async () => {
    mockApi.patients.search.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, cedula: 'V-10000001', nombre: 'Ana', apellido: 'López', fecha_nacimiento: '1980-01-10', sexo: 'F', telefono: null, email: null, direccion: null, activo: true },
      ],
    })
    mockApi.dashboard.patientAnalytes.mockResolvedValue({
      ok: true,
      data: [{ parametro_id: 2, parametro_nombre: 'Glucosa', unidad: 'mg/dL' }],
    })
    mockApi.dashboard.trends.mockResolvedValue({
      ok: true,
      data: {
        paciente_id: 1,
        parametro_id: 2,
        parametro_nombre: 'Glucosa',
        puntos: [
          { fecha: '2026-07-06', valor: 90, unidad: 'mg/dL' },
          { fecha: '2026-08-20', valor: 95, unidad: 'mg/dL' },
        ],
      },
    })

    render(<TrendsView />)
    const search = screen.getByTestId('trends-patient-search')
    fireEvent.change(search, { target: { value: 'López' } })
    await waitFor(() => {
      expect(screen.getByText('López, Ana')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('López, Ana'))

    await waitFor(() => {
      expect(screen.getByTestId('trends-analyte')).toBeInTheDocument()
    })
    const analyte = screen.getByTestId('trends-analyte') as HTMLSelectElement
    expect(analyte).not.toBeDisabled()
    fireEvent.change(analyte, { target: { value: '2' } })

    await waitFor(() => {
      expect(screen.getByTestId('trends-chart')).toBeInTheDocument()
    })
    expect(mockApi.dashboard.trends).toHaveBeenCalledWith({ pacienteId: 1, parametroId: 2 })
    await waitFor(() => {
      expect(screen.getByTestId('trends-chart').querySelector('svg')).not.toBeNull()
    })
    expect(screen.getByText(/Glucosa — López, Ana/i)).toBeInTheDocument()
  })

  it('shows an empty state when the patient has no numeric analytes', async () => {
    mockApi.patients.search.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, cedula: 'V-10000001', nombre: 'Ana', apellido: 'López', fecha_nacimiento: '1980-01-10', sexo: 'F', telefono: null, email: null, direccion: null, activo: true },
      ],
    })
    mockApi.dashboard.patientAnalytes.mockResolvedValue({ ok: true, data: [] })

    render(<TrendsView />)
    fireEvent.change(screen.getByTestId('trends-patient-search'), { target: { value: 'López' } })
    await waitFor(() => expect(screen.getByText('López, Ana')).toBeInTheDocument())
    fireEvent.click(screen.getByText('López, Ana'))

    await waitFor(() => {
      expect(screen.getByText(/no tiene análisis numéricos/i)).toBeInTheDocument()
    })
  })
})