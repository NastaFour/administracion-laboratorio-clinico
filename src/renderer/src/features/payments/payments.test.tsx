import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PaymentRecordForm } from './Record'
import { PaymentsPage } from './PaymentsPage'
import { ToastProvider } from '../../components/ui/Toast'

const mockSubmit = vi.fn()

const mockApi = {
  payments: {
    record: vi.fn().mockResolvedValue({ ok: true, data: { id: 1 } }),
    cancel: vi.fn(),
    listForOrder: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    balance: vi.fn().mockResolvedValue({
      ok: true,
      data: { orden_id: 1, total_bs: 1000, pagado_bs: 0, saldo_bs: 1000, total_usd: 0, pagado_usd: 0, saldo_usd: 0 },
    }),
    listAll: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  },
  config: {
    getBcvRate: vi.fn().mockResolvedValue({ ok: true, data: { tasa: 950, actualizado_en: '2026-08-18T10:00:00.000Z' } }),
    setBcvRate: vi.fn(),
  },
}

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ ok: true })
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('PaymentRecordForm validation', () => {
  it('rejects a payment with no amount', async () => {
    render(<PaymentRecordForm ordenId={1} rate={{ tasa: 950, actualizado_en: '2026-08-18T10:00:00.000Z' }} onSubmit={mockSubmit} onCancel={() => {}} />)

    fireEvent.click(screen.getByTestId('payment-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Ingrese un monto en Bs o en USD/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('blocks a USD payment when no rate is available', async () => {
    render(<PaymentRecordForm ordenId={1} rate={null} onSubmit={mockSubmit} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Monto USD'), { target: { value: '10' } })
    fireEvent.click(screen.getByTestId('payment-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Debe configurar la tasa BCV/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows the Bs equivalent preview for a USD payment', async () => {
    render(<PaymentRecordForm ordenId={1} rate={{ tasa: 950, actualizado_en: '2026-08-18T10:00:00.000Z' }} onSubmit={mockSubmit} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Monto USD'), { target: { value: '10' } })

    await waitFor(() => {
      expect(screen.getByTestId('usd-preview')).toHaveTextContent('9500.00')
    })
  })

  it('submits a valid Bs payment', async () => {
    render(<PaymentRecordForm ordenId={7} rate={{ tasa: 950, actualizado_en: '2026-08-18T10:00:00.000Z' }} onSubmit={mockSubmit} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Monto Bs'), { target: { value: '400' } })
    fireEvent.click(screen.getByTestId('payment-submit'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          orden_id: 7,
          metodo: 'efectivo',
          monto_bs: 400,
          monto_usd: 0,
        }),
      )
    })
  })
})

describe('PaymentsPage workflows and toast feedback (Fix A6, A7)', () => {
  it('validates order input and shows inline error for invalid values', () => {
    render(
      <ToastProvider>
        <PaymentsPage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByLabelText('Orden #'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ingrese un número de orden válido.')
  })

  it('loads valid order and registers payment with success toast', async () => {
    render(
      <ToastProvider>
        <PaymentsPage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByLabelText('Orden #'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))

    await waitFor(() => {
      expect(screen.getByTestId('payment-list')).toBeInTheDocument()
    })

    // Open record payment modal
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Monto Bs')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Monto Bs'), { target: { value: '500' } })
    fireEvent.click(screen.getByTestId('payment-submit'))

    await waitFor(() => {
      expect(mockApi.payments.record).toHaveBeenCalledWith(
        expect.objectContaining({ orden_id: 1, monto_bs: 500 }),
      )
      expect(screen.getByText('Pago registrado exitosamente.')).toBeInTheDocument()
    })
  })

  it('cancels payment and shows toast notification', async () => {
    mockApi.payments.listForOrder.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          id: 42,
          orden_id: 1,
          metodo: 'efectivo',
          monto_bs: 500,
          monto_usd: 0,
          referencia: null,
          creado_en: '2026-08-27T10:00:00Z',
          fecha: '2026-08-27',
          anulado: false,
          motivo_anulacion: null,
        },
      ],
    })
    mockApi.payments.cancel.mockResolvedValueOnce({ ok: true, data: { id: 42, anulado: true } })

    render(
      <ToastProvider>
        <PaymentsPage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByLabelText('Orden #'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
    })

    // Click cancel button on payment row
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }))

    await waitFor(() => {
      expect(screen.getByText('Registre el motivo de la anulación del pago.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Motivo'), {
      target: { value: 'Doble cargo en punto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Anular pago' }))

    await waitFor(() => {
      expect(mockApi.payments.cancel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 42, motivo: 'Doble cargo en punto' }),
      )
      expect(screen.getByText('Pago anulado exitosamente.')).toBeInTheDocument()
    })
  })

  it('renders global payments table with patient details, debt, and opens prefilled payment modal on Abonar click', async () => {
    const mockGlobalPayments = [
      {
        id: 101,
        ordenId: 55,
        pacienteId: 10,
        pacienteNombre: 'María Gómez',
        pacienteCedula: 'V-20123456',
        metodo: 'pago_movil',
        monto_bs: 300,
        monto_usd: 7.5,
        tasa_bcv: 40,
        fecha: '2026-08-27',
        cajero: 'Cajera 1',
        totalOrden: 1000,
        saldoActualOrden: 700,
        anulado: false,
      },
    ]
    mockApi.payments.listAll.mockResolvedValueOnce({ ok: true, data: mockGlobalPayments })

    render(
      <ToastProvider>
        <PaymentsPage />
      </ToastProvider>,
    )

    // Check KPIs
    expect(screen.getByText(/Recaudado Hoy/i)).toBeInTheDocument()
    expect(screen.getByText(/Por Cobrar/i)).toBeInTheDocument()

    // Table rows
    await waitFor(() => {
      expect(screen.getByText('María Gómez')).toBeInTheDocument()
      expect(screen.getByText('V-20123456')).toBeInTheDocument()
      expect(screen.getByText('#55')).toBeInTheDocument()
      expect(screen.getByText(/Pago móvil/i)).toBeInTheDocument()
      expect(screen.getByText('Cajera 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Abonar' })).toBeInTheDocument()
    })

    // Click "Abonar" on order #55
    fireEvent.click(screen.getByRole('button', { name: 'Abonar' }))

    await waitFor(() => {
      expect(screen.getByText(/Registrar Cobro · Orden #55/i)).toBeInTheDocument()
    })
  })
})
