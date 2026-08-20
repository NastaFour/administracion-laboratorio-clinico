import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PaymentRecordForm } from './Record'

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
