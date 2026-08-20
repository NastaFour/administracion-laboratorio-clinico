import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SamplingPage } from './SamplingPage'

const mockSamples = {
  list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  register: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  updateStatus: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  reject: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  label: vi.fn().mockResolvedValue({ ok: true, data: '<html></html>' }),
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
        estatus: 'Pendiente',
        observaciones: null,
        total_bs: 500,
        credito: false,
        anulada: false,
        motivo_anulacion: null,
        cerrada: false,
        fecha: '2026-08-19',
        creado_en: '2026-08-19T00:00:00.000Z',
        examenes: [{ examen_id: 1, precio: 500, tercerizado: false, proveedor: null, comentario: null }],
      },
    ],
  }),
}

beforeEach(() => {
  Object.values(mockSamples).forEach((m) => m.mockClear())
  Object.values(mockOrders).forEach((m) => m.mockClear())
  window.api = {
    orders: mockOrders,
    samples: mockSamples,
  } as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('SamplingPage', () => {
  it('renders the sampling heading and order list', async () => {
    render(<SamplingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('sampling-heading')).toHaveTextContent('Muestras')
    })

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })
  })

  it('selects an order and opens the register modal', async () => {
    render(<SamplingPage />)

    await waitFor(() => {
      expect(screen.getByText('Orden #10')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Orden #10'))

    await waitFor(() => {
      expect(screen.getByText('Registrar muestras')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Registrar muestras'))

    await waitFor(() => {
      expect(screen.getByText('Registrar muestras - Orden #10')).toBeInTheDocument()
    })
  })
})
