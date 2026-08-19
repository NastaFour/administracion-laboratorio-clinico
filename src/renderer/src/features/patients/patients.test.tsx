import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PatientForm } from './PatientForm'

const mockSubmit = vi.fn()

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
})

describe('PatientForm validation', () => {
  it('rejects invalid cedula format', async () => {
    render(<PatientForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'ABC' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1985-03-15' } })
    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Cédula inválida/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('rejects missing required fields', async () => {
    render(<PatientForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/El nombre es requerido/i)).toBeInTheDocument()
      expect(screen.getByText(/El apellido es requerido/i)).toBeInTheDocument()
      expect(screen.getByText(/La fecha de nacimiento es requerida/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('rejects invalid email', async () => {
    render(<PatientForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'V-12345678' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1985-03-15' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'not-an-email' } })

    await waitFor(() => {
      expect((screen.getByLabelText('Correo electrónico') as HTMLInputElement).value).toBe('not-an-email')
    })

    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Correo electrónico inválido/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('submits with valid data', async () => {
    render(<PatientForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'V12345678' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1985-03-15' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '04121234567' } })
    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          cedula: 'V-12345678',
          nombre: 'Juan',
          apellido: 'Pérez',
          fecha_nacimiento: '1985-03-15',
          telefono: '0412-1234567',
        }),
      )
    })
  })

  it('disables cedula field when editing', () => {
    const patient = {
      id: 1,
      cedula: 'V-87654321',
      nombre: 'Ana',
      apellido: 'García',
      fecha_nacimiento: '1990-01-01',
      sexo: 'F' as const,
      telefono: null,
      email: null,
      direccion: null,
      activo: true,
    }
    render(<PatientForm patient={patient} onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    const cedulaInput = screen.getByLabelText('Cédula') as HTMLInputElement
    expect(cedulaInput).toBeDisabled()
    expect(cedulaInput.value).toBe('V-87654321')
  })
})
