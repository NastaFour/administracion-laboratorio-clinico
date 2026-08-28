import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CapturePage } from './Capture'

const paramFixture = {
  parametro_id: 1,
  nombre: 'Hemoglobina',
  unidad: 'g/dL',
  tipo_resultado: 'numerico',
  opciones_cualitativas: null,
  banda: {
    id: 1,
    parametro_id: 1,
    sexo: 'M',
    edad_unidad: 'anios',
    edad_min: 18,
    edad_max: 99,
    valor_min: 13.5,
    valor_max: 17.5,
    valor_min_critico: null,
    valor_max_critico: null,
    activo: true,
  },
  resultado: null,
}

const mockResults = {
  paramsForCapture: vi.fn().mockResolvedValue({ ok: true, data: [paramFixture] }),
  capture: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      id: 1,
      orden_examen_id: 5,
      parametro_id: 1,
      valor_numerico: 15,
      valor_cualitativo: null,
      estatus_validacion: 'Validado',
      validado_por: 2,
      validado_en: '2026-08-19T00:00:00.000Z',
      flag: null,
      comentario: null,
      motivo_rechazo: null,
    },
  }),
  validate: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  reject: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  reopen: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}

const mockOrders = {
  list: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      {
        id: 10,
        paciente_id: 1,
        medico_id: null,
        empresa_id: null,
        estatus: 'Procesando',
        observaciones: null,
        total_bs: 500,
        credito: false,
        anulada: false,
        motivo_anulacion: null,
        cerrada: false,
        fecha: '2026-08-19',
        creado_en: '2026-08-19T00:00:00.000Z',
        examenes: [
          {
            id: 5,
            examen_id: 1,
            precio: 500,
            tercerizado: false,
            proveedor: null,
            comentario: null,
          },
        ],
      },
    ],
  }),
}

const mockCatalog = {
  listExams: vi.fn().mockResolvedValue({
    ok: true,
    data: [{ id: 1, codigo: 'HEM', nombre: 'Hematología', categoria: null, precio: 500, activo: true }],
  }),
}

const mockReports = {
  preview: vi.fn().mockResolvedValue({ ok: true, data: 'ok' }),
  print: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  savePdf: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}

beforeEach(() => {
  Object.values(mockResults).forEach((m) => m.mockClear())
  Object.values(mockOrders).forEach((m) => m.mockClear())
  Object.values(mockCatalog).forEach((m) => m.mockClear())
  Object.values(mockReports).forEach((m) => m.mockClear())
  mockOrders.list.mockResolvedValue({
    ok: true,
    data: [
      {
        id: 10,
        paciente_id: 1,
        medico_id: null,
        empresa_id: null,
        estatus: 'Procesando',
        observaciones: null,
        total_bs: 500,
        credito: false,
        anulada: false,
        motivo_anulacion: null,
        cerrada: false,
        fecha: '2026-08-19',
        creado_en: '2026-08-19T00:00:00.000Z',
        examenes: [
          {
            id: 5,
            examen_id: 1,
            precio: 500,
            tercerizado: false,
            proveedor: null,
            comentario: null,
          },
        ],
      },
    ],
  })
  window.api = {
    orders: mockOrders,
    catalog: mockCatalog,
    results: mockResults,
    reports: mockReports,
  } as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('CapturePage', () => {
  it('renders the results heading and an order list', async () => {
    render(<CapturePage />)

    await waitFor(() => {
      expect(screen.getByTestId('results-heading')).toHaveTextContent('Resultados')
    })

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })
  })

  it('shows the sex/age-correct reference band next to the captured parameter', async () => {
    render(<CapturePage />)

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Orden #10'))

    await waitFor(() => {
      expect(screen.getByText('Hematología')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Hemoglobina')).toBeInTheDocument()
      // M7.1: the male-adult band is the one displayed, not an unfiltered row.
      expect(screen.getByText(/Masculino · 18–99 anios · ref 13.5–17.5/)).toBeInTheDocument()
    })
  })

  it('captures a numeric value through the results channel', async () => {
    render(<CapturePage />)

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Orden #10'))

    await waitFor(() => {
      expect(screen.getByTestId('value-1')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('value-1'), { target: { value: '15' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(mockResults.capture).toHaveBeenCalledWith(
        expect.objectContaining({
          orden_examen_id: 5,
          parametro_id: 1,
          valor: { tipo: 'numerico', valor: 15 },
        }),
      )
    })
  })

  it('filters available orders by the selected period via PeriodSelector (M4)', async () => {
    const { getPeriodRange } = await import('../../lib/dates')

    render(<CapturePage />)

    await waitFor(() => {
      expect(mockOrders.list).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mes' }))

    await waitFor(() => {
      const monthRange = getPeriodRange('mes')
      expect(mockOrders.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ desde: monthRange.desde, hasta: monthRange.hasta }),
      )
    })
  })

  it('shows report actions for a Completada order and downloads the PDF', async () => {
    mockOrders.list.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          id: 10,
          paciente_id: 1,
          medico_id: null,
          empresa_id: null,
          estatus: 'Completada',
          observaciones: null,
          total_bs: 500,
          credito: false,
          anulada: false,
          motivo_anulacion: null,
          cerrada: false,
          fecha: '2026-08-19',
          creado_en: '2026-08-19T00:00:00.000Z',
          examenes: [
            { id: 5, examen_id: 1, precio: 500, tercerizado: false, proveedor: null, comentario: null },
          ],
        },
      ],
    })

    render(<CapturePage />)

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Orden #10'))

    await waitFor(() => {
      expect(screen.getByTestId('results-save-pdf')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('results-save-pdf'))

    await waitFor(() => {
      expect(mockReports.savePdf).toHaveBeenCalledWith({ ordenId: 10, copia: false })
    })
  })

  it('hides report actions for orders that are not Completada/Entregada', async () => {
    render(<CapturePage />)

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Orden #10'))

    await waitFor(() => {
      expect(screen.getByTestId('value-1')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('results-save-pdf')).not.toBeInTheDocument()
  })
})
