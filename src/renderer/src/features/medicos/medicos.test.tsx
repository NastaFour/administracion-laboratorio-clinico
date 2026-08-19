import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MedicoForm } from './MedicoForm'

const mockSubmit = vi.fn()

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
})

describe('MedicoForm validation', () => {
  it('rejects missing required fields', async () => {
    render(<MedicoForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.click(screen.getByTestId('medico-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/El nombre es requerido/i)).toBeInTheDocument()
      expect(screen.getByText(/La especialidad es requerida/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('rejects invalid cedula format', async () => {
    render(<MedicoForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Dr. Pérez' } })
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'Cardiología' } })
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'ABC' } })
    fireEvent.click(screen.getByTestId('medico-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Cédula inválida/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('submits with valid data', async () => {
    render(<MedicoForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Dr. Pérez' } })
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'Cardiología' } })
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'V-12345678' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0412-1234567' } })
    fireEvent.click(screen.getByTestId('medico-form-submit'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Dr. Pérez',
          especialidad: 'Cardiología',
          cedula: 'V-12345678',
          telefono: '0412-1234567',
        }),
      )
    })
  })
})
