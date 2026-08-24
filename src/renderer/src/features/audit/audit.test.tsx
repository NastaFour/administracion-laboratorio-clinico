import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import type { AuditEntry, User } from '@/shared/contracts'
import { AuditPage } from './AuditPage'

const entry = (id: number, overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  id,
  usuario_id: 1,
  accion: 'paciente.creado',
  entidad: 'paciente',
  entidad_id: 10,
  antes: null,
  despues: null,
  creado_en: '2026-08-20T09:30:00.000Z',
  ...overrides,
})

const user = (id: number, usuario: string, rol: User['rol'] = 'admin'): User => ({
  id,
  usuario,
  nombre: `Nombre ${usuario}`,
  rol,
  activo: true,
  debe_cambiar_clave: false,
  ultimo_acceso_en: null,
})

const mockApi = {
  audit: { list: vi.fn() },
  users: { list: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.audit.list.mockResolvedValue({
    ok: true,
    data: [
      entry(1, { usuario_id: 1, accion: 'paciente.creado', entidad: 'paciente' }),
      entry(2, { usuario_id: 2, accion: 'resultado.validado', entidad: 'resultado', creado_en: '2026-08-21T11:00:00.000Z' }),
    ],
  })
  mockApi.users.list.mockResolvedValue({
    ok: true,
    data: [user(1, 'admin01'), user(2, 'bio01', 'bioanalista')],
  })
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('AuditPage (admin audit viewer, M12.3)', () => {
  it('lists entries with actor, action, entity and timestamp', async () => {
    render(<AuditPage />)

    await waitFor(() => expect(screen.getByTestId('audit-row-1')).toBeInTheDocument())
    const row1 = within(screen.getByTestId('audit-row-1'))
    expect(row1.getByText('admin01')).toBeInTheDocument()
    expect(row1.getByText('paciente.creado')).toBeInTheDocument()
    expect(row1.getByText('paciente')).toBeInTheDocument()

    const row2 = within(screen.getByTestId('audit-row-2'))
    expect(row2.getByText('bio01')).toBeInTheDocument()
    expect(row2.getByText('resultado.validado')).toBeInTheDocument()
  })

  it('passes entity/action filters to the main side', async () => {
    render(<AuditPage />)
    await waitFor(() => expect(screen.getByTestId('audit-row-1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('audit-action'), { target: { value: 'resultado.validado' } })
    await waitFor(() => {
      expect(mockApi.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ accion: 'resultado.validado' }))
    })

    fireEvent.change(screen.getByTestId('audit-entity'), { target: { value: 'pago' } })
    await waitFor(() => {
      expect(mockApi.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ accion: 'resultado.validado', entidad: 'pago' }))
    })
  })

  it('filters by actor via the user dropdown (M12.3 admin filters by actor)', async () => {
    render(<AuditPage />)
    await waitFor(() => expect(screen.getByTestId('audit-row-1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('audit-actor'), { target: { value: '2' } })
    await waitFor(() => {
      expect(mockApi.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ usuarioId: 2 }))
    })
  })

  it('shows an empty state when no entries match', async () => {
    mockApi.audit.list.mockResolvedValue({ ok: true, data: [] })
    render(<AuditPage />)

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByText(/No hay entradas/i)).toBeInTheDocument()
  })

  it('surfaces a permission error when a non-admin is denied', async () => {
    mockApi.audit.list.mockResolvedValue({ ok: false, error: { code: 'PERMISSION_DENIED', message: 'denied' } })
    render(<AuditPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No tiene permiso para ver la auditoría.')
  })
})
