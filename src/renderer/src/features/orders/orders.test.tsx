import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { OrderForm } from './OrderForm'
import { OrderList } from './OrderList'
import { OrdersPage } from './OrdersPage'
import { ToastProvider } from '../../components/ui/Toast'
import { useSessionStore } from '../../stores/useSessionStore'
import type { OrderWithExams, Patient, Session } from '@/shared/contracts'

const mockSubmit = vi.fn()

const samplePatient: Patient = {
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

const completedOrder: OrderWithExams = {
  id: 1,
  paciente_id: 1,
  medico_id: 5,
  empresa_id: null,
  estatus: 'Completada',
  observaciones: null,
  total_bs: 500,
  credito: false,
  anulada: false,
  motivo_anulacion: null,
  cerrada: false,
  fecha: '2026-08-27',
  creado_en: '2026-08-27T10:00:00Z',
  examenes: [{ id: 100, examen_id: 10, precio: 500, tercerizado: false, proveedor: null, comentario: null }],
}

const pendingOrder: OrderWithExams = {
  ...completedOrder,
  id: 2,
  estatus: 'Pendiente',
}

const anuladaOrder: OrderWithExams = {
  ...completedOrder,
  id: 3,
  anulada: true,
  motivo_anulacion: 'Error de registro',
}

const adminSession: Session = {
  userId: 1,
  usuario: 'admin',
  nombre: 'Administrador',
  rol: 'admin',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

const tecnicoSession: Session = {
  userId: 2,
  usuario: 'tecnico',
  nombre: 'Técnico',
  rol: 'tecnico',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

const mockApi = {
  patients: {
    list: vi.fn().mockResolvedValue({
      ok: true,
      data: [samplePatient],
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
  orders: {
    list: vi.fn().mockResolvedValue({ ok: true, data: [completedOrder] }),
    create: vi.fn().mockResolvedValue({ ok: true, data: completedOrder }),
    update: vi.fn().mockResolvedValue({ ok: true, data: completedOrder }),
    advanceStatus: vi.fn().mockResolvedValue({ ok: true, data: completedOrder }),
    deliver: vi.fn().mockResolvedValue({ ok: true, data: { ...completedOrder, estatus: 'Entregada' } }),
    void: vi.fn().mockResolvedValue({ ok: true, data: { ...completedOrder, anulada: true } }),
    authorizeCredit: vi.fn().mockResolvedValue({ ok: true, data: { ...completedOrder, credito: true } }),
  },
}

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmit.mockResolvedValue({ ok: true })
  Object.values(mockApi.patients).forEach((m) => m.mockClear())
  Object.values(mockApi.catalog).forEach((m) => m.mockClear())
  Object.values(mockApi.medicos).forEach((m) => m.mockClear())
  Object.values(mockApi.orders).forEach((m) => m.mockClear())
  mockApi.orders.list.mockResolvedValue({ ok: true, data: [completedOrder] })
  mockApi.orders.deliver.mockResolvedValue({ ok: true, data: { ...completedOrder, estatus: 'Entregada' } })
  mockApi.orders.void.mockResolvedValue({ ok: true, data: { ...completedOrder, anulada: true } })
  mockApi.patients.list.mockResolvedValue({ ok: true, data: [samplePatient] })
  window.api = mockApi as unknown as Window['api']
  useSessionStore.setState({ session: adminSession, locked: false })
})

afterEach(() => {
  cleanup()
  useSessionStore.setState({ session: null, locked: false })
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

describe('OrderList actions and role guards (Fix A1, A16, B1)', () => {
  it('renders Entregar button when canDeliver is true and order is Completada', () => {
    const onDeliver = vi.fn()
    render(
      <OrderList
        orders={[completedOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={true}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onDeliver={onDeliver}
      />,
    )

    const deliverBtn = screen.getByLabelText(`Entregar orden ${completedOrder.id}`)
    expect(deliverBtn).toBeInTheDocument()
    fireEvent.click(deliverBtn)
    expect(onDeliver).toHaveBeenCalledWith(completedOrder)
  })

  it('hides Entregar button when order is Pendiente or canDeliver is false', () => {
    const { rerender } = render(
      <OrderList
        orders={[pendingOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={true}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onDeliver={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(`Entregar orden ${pendingOrder.id}`)).not.toBeInTheDocument()

    rerender(
      <OrderList
        orders={[completedOrder]}
        canAuthorizeCredit={true}
        canDeliver={false}
        canVoid={true}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onDeliver={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(`Entregar orden ${completedOrder.id}`)).not.toBeInTheDocument()
  })

  it('renders Anular button when canVoid is true and order is active', () => {
    const onVoid = vi.fn()
    render(
      <OrderList
        orders={[completedOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={true}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onVoid={onVoid}
      />,
    )

    const voidBtn = screen.getByLabelText(`Anular orden ${completedOrder.id}`)
    expect(voidBtn).toBeInTheDocument()
    fireEvent.click(voidBtn)
    expect(onVoid).toHaveBeenCalledWith(completedOrder)
  })

  it('hides Anular button when order is already anulada or canVoid is false', () => {
    const { rerender } = render(
      <OrderList
        orders={[anuladaOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={true}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onVoid={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(`Anular orden ${anuladaOrder.id}`)).not.toBeInTheDocument()

    rerender(
      <OrderList
        orders={[completedOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={false}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
        onVoid={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(`Anular orden ${completedOrder.id}`)).not.toBeInTheDocument()
  })

  it('displays patient name and cédula when patientsMap is provided', () => {
    const patientsMap = new Map<number, Patient>([[1, samplePatient]])
    render(
      <OrderList
        orders={[completedOrder]}
        canAuthorizeCredit={true}
        canDeliver={true}
        canVoid={true}
        patientsMap={patientsMap}
        onEdit={vi.fn()}
        onAuthorizeCredit={vi.fn()}
      />,
    )

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText(/V-11111111/)).toBeInTheDocument()
  })
})

describe('OrdersPage workflows and toast feedback (Fix A1, A16)', () => {
  it('delivers completed order and shows success toast', async () => {
    render(
      <ToastProvider>
        <OrdersPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(`Entregar orden ${completedOrder.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(`Entregar orden ${completedOrder.id}`))

    await waitFor(() => {
      expect(mockApi.orders.deliver).toHaveBeenCalledWith({ id: completedOrder.id })
      expect(screen.getByText(`Resultados de la orden #${completedOrder.id} entregados.`)).toBeInTheDocument()
    })
  })

  it('handles deliver error and shows error toast', async () => {
    mockApi.orders.deliver.mockResolvedValueOnce({
      ok: false,
      error: { code: 'CONFLICT', message: 'La orden no está lista' },
    })

    render(
      <ToastProvider>
        <OrdersPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(`Entregar orden ${completedOrder.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(`Entregar orden ${completedOrder.id}`))

    await waitFor(() => {
      expect(screen.getByText('La orden no permite esta acción en su estado actual.')).toBeInTheDocument()
    })
  })

  it('opens void modal, requires reason, cancels order and shows toast', async () => {
    render(
      <ToastProvider>
        <OrdersPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(`Anular orden ${completedOrder.id}`)).toBeInTheDocument()
    })

    // Open void modal
    fireEvent.click(screen.getByLabelText(`Anular orden ${completedOrder.id}`))

    await waitFor(() => {
      expect(screen.getByText(`Anular Orden #${completedOrder.id}`)).toBeInTheDocument()
    })

    // Try submitting without reason using form submit event
    const form = screen.getByRole('button', { name: 'Anular orden' }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Debe ingresar un motivo para anular la orden.')).toBeInTheDocument()
    })
    expect(mockApi.orders.void).not.toHaveBeenCalled()

    // Type motivo and submit
    fireEvent.change(screen.getByLabelText(/Motivo de anulación/i), {
      target: { value: 'Muestra coagulada y paciente se retiró' },
    })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockApi.orders.void).toHaveBeenCalledWith({
        id: completedOrder.id,
        motivo: 'Muestra coagulada y paciente se retiró',
      })
      expect(screen.getByText(`Orden #${completedOrder.id} anulada.`)).toBeInTheDocument()
    })
  })

  it('hides Entregar and Anular buttons for non-admin/recepcion roles', async () => {
    useSessionStore.setState({ session: tecnicoSession, locked: false })

    render(
      <ToastProvider>
        <OrdersPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(`Entregar orden ${completedOrder.id}`)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(`Anular orden ${completedOrder.id}`)).not.toBeInTheDocument()
  })
})
