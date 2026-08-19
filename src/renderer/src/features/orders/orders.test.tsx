import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { OrderForm } from './OrderForm'

const mockSubmit = vi.fn()

const mockApi = {
  patients: {
    list: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 1, cedula: 'V-11111111', nombre: 'Juan', apellido: 'Pérez', sexo: 'M', fecha_nacimiento: '1985-03-15', telefono: null, email: null, direccion: null, activo: true },
      ],
    }),
    search: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  },
  catalog: {
    listExams: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 10, codigo: 'EXM01', nombre: 'Hemograma', categoria: 'Hematología', tipo_muestra: 'Sangre', precio: 500, tercerizado: false, proveedor: null, activo: true },
        { id: 11, codigo: 'EXM02', nombre: 'Perfil lipídico', categoria: 'Química', tipo_muestra: 'Sangre', precio: 300, tercerizado: false, proveedor: null, activo: true },
      ],
    }),
  },
  medicos: {
    list: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 5, nombre: 'Dr. Pérez', cedula: 'V-12345678', especialidad: 'Cardiología', telefono: null, activo: true },
      ],
    }),
  },
}

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ ok: true })
  Object.values(mockApi.patients).forEach((m) => m.mockClear())
  Object.values(mockApi.catalog).forEach((m) => m.mockClear())
  Object.values(mockApi.medicos).forEach((m) => m.mockClear())
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('OrderForm validation', () => {
  it('rejects missing patient and exams', async () => {
    render(<OrderForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por cédula, nombre o teléfono')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('order-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Seleccione un paciente/i)).toBeInTheDocument()
      expect(screen.getByText(/Seleccione al menos un examen/i)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid order with patient, exam and medico', async () => {
    render(<OrderForm onSaved={() => {}} onCancel={() => {}} onSubmit={mockSubmit} />)

    await waitFor(() => {
      expect(screen.getByText('Hemograma')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Buscar por cédula, nombre o teléfono'), { target: { value: 'Juan' } })
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Juan Pérez'))

    fireEvent.click(screen.getByText('Hemograma'))
    fireEvent.change(screen.getByLabelText('Médico referente'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Observaciones'), { target: { value: 'Ayunas 12h' } })

    fireEvent.click(screen.getByTestId('order-form-submit'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          paciente_id: 1,
          medico_id: 5,
          observaciones: 'Ayunas 12h',
          examenes: expect.arrayContaining([
            expect.objectContaining({ examen_id: 10, precio: 500 }),
          ]),
        }),
      )
    })
  })
})
