import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PatientForm } from './PatientForm'
import { PatientList } from './PatientList'
import { PatientsPage } from './PatientsPage'
import { ToastProvider } from '../../components/ui/Toast'
import type { Patient } from '@/shared/contracts'

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

describe('PatientsPage workflows and toast feedback (Fix A4, A5)', () => {
  const samplePatient = {
    id: 1,
    cedula: 'V-11111111',
    nombre: 'Juan',
    apellido: 'Pérez',
    sexo: 'M' as const,
    fecha_nacimiento: '1985-03-15',
    telefono: '0412-1234567',
    email: null,
    direccion: null,
    activo: true,
  }

  const mockApi = {
    patients: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [samplePatient] }),
      search: vi.fn().mockResolvedValue({ ok: true, data: [samplePatient] }),
      create: vi.fn().mockResolvedValue({ ok: true, data: { ...samplePatient, id: 2, cedula: 'V-22222222' } }),
      update: vi.fn().mockResolvedValue({ ok: true, data: samplePatient }),
      deactivate: vi.fn().mockResolvedValue({ ok: true, data: { ...samplePatient, activo: false } }),
      getHistory: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    },
  }

  beforeEach(() => {
    Object.values(mockApi.patients).forEach((m) => m.mockClear())
    mockApi.patients.list.mockResolvedValue({ ok: true, data: [samplePatient] })
    mockApi.patients.search.mockResolvedValue({ ok: true, data: [samplePatient] })
    window.api = mockApi as unknown as Window['api']
  })

  it('opens registration modal, creates patient and shows toast', async () => {
    render(
      <ToastProvider>
        <PatientsPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Nuevo paciente/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Cédula')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: 'V-22222222' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'María' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'López' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1992-05-10' } })

    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(mockApi.patients.create).toHaveBeenCalled()
      expect(screen.getByText('Paciente registrado exitosamente.')).toBeInTheDocument()
    })
  })

  it('opens edit modal, updates patient and shows toast', async () => {
    render(
      <ToastProvider>
        <PatientsPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Editar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan Carlos' } })
    fireEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(mockApi.patients.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, nombre: 'Juan Carlos' }),
      )
      expect(screen.getByText('Paciente actualizado exitosamente.')).toBeInTheDocument()
    })
  })

  it('opens ConfirmDialog on deactivate, confirms and shows toast', async () => {
    render(
      <ToastProvider>
        <PatientsPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Desactivar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Desactivar'))

    await waitFor(() => {
      expect(screen.getByText('Desactivar paciente')).toBeInTheDocument()
      expect(screen.getByText(/¿Está seguro de desactivar a Juan Pérez/i)).toBeInTheDocument()
    })

    // Cancel does not call deactivate
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mockApi.patients.deactivate).not.toHaveBeenCalled()

    // Open again and confirm
    fireEvent.click(screen.getByLabelText('Desactivar'))
    await waitFor(() => {
      expect(screen.getByText('Desactivar paciente')).toBeInTheDocument()
    })

    // Click confirm button inside the modal
    const deactivateButtons = screen.getAllByRole('button', { name: 'Desactivar' })
    const confirmBtn = deactivateButtons[deactivateButtons.length - 1]
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockApi.patients.deactivate).toHaveBeenCalledWith({ id: 1 })
      expect(screen.getByText('Paciente desactivado.')).toBeInTheDocument()
    })
  })
})

describe('PatientList row click opens the 360° dossier (M3 discoverability)', () => {
  const patient: Patient = {
    id: 1,
    cedula: 'V-11111111',
    nombre: 'Juan',
    apellido: 'Pérez',
    sexo: 'M',
    fecha_nacimiento: '1985-03-15',
    telefono: null,
    email: null,
    direccion: null,
    activo: true,
  }

  it('calls onDossier when the row (patient) is clicked', () => {
    const onDossier = vi.fn()
    render(
      <PatientList
        patients={[patient]}
        searchQuery=""
        onSearchChange={vi.fn()}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onHistory={vi.fn()}
        onDossier={onDossier}
      />,
    )

    fireEvent.click(screen.getByText('Juan Pérez'))
    expect(onDossier).toHaveBeenCalledWith(patient)
  })

  it('does not open the dossier when an action button inside the row is clicked', () => {
    const onDossier = vi.fn()
    const onEdit = vi.fn()
    render(
      <PatientList
        patients={[patient]}
        searchQuery=""
        onSearchChange={vi.fn()}
        onEdit={onEdit}
        onDeactivate={vi.fn()}
        onHistory={vi.fn()}
        onDossier={onDossier}
      />,
    )

    fireEvent.click(screen.getByLabelText('Editar'))
    expect(onEdit).toHaveBeenCalledWith(patient)
    expect(onDossier).not.toHaveBeenCalled()
  })
})
