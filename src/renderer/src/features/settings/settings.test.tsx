import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'
import { Lab } from './Lab'
import { Billing } from './Billing'
import { Users } from './Users'
import { ToastProvider } from '../../components/ui/Toast'
import { useSessionStore } from '../../stores/useSessionStore'
import type { Session } from '@/shared/contracts'

const adminSession: Session = {
  userId: 1,
  usuario: 'admin',
  nombre: 'Administrador',
  rol: 'admin',
  loginAt: new Date().toISOString(),
  debe_cambiar_clave: false,
}

const tecnicoSession: Session = { ...adminSession, userId: 2, usuario: 'tec1', rol: 'tecnico' }

const labPayload = {
  nombre: 'Laboratorio Central',
  rif: null,
  direccion: null,
  sede: null,
  telefono: null,
  email: null,
  logo: null,
}

const bioanalistaPayload = {
  nombre: 'Dra. María Pérez',
  titulo: 'Bioanalista',
  registro_msds: null,
  registro_cbz: null,
  firma: null,
}

const userRow = {
  id: 7,
  usuario: 'tecnico01',
  nombre: 'Ana Técnica',
  rol: 'tecnico',
  activo: true,
  debe_cambiar_clave: false,
  ultimo_acceso_en: null,
}

const mockApi = {
  config: {
    getLab: vi.fn(),
    setLab: vi.fn(),
    getBioanalista: vi.fn(),
    setBioanalista: vi.fn(),
    setLogo: vi.fn(),
    getPrint: vi.fn(),
    setPrint: vi.fn(),
    getReportFormat: vi.fn(),
    setReportFormat: vi.fn(),
    getBcvHistory: vi.fn(),
    getBcvRate: vi.fn(),
    setBcvRate: vi.fn(),
  },
  users: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    disable: vi.fn(),
    resetPassword: vi.fn(),
  },
}

function ok<T>(data: T) {
  return Promise.resolve({ ok: true as const, data })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.config.getLab.mockImplementation(() => ok(labPayload))
  mockApi.config.setLab.mockImplementation(() => ok({ ...labPayload }))
  mockApi.config.getBioanalista.mockImplementation(() => ok(bioanalistaPayload))
  mockApi.config.setBioanalista.mockImplementation(() => ok({ ...bioanalistaPayload }))
  mockApi.config.setLogo.mockImplementation(() => ok('data:image/png;base64,QQ=='))
  mockApi.config.getReportFormat.mockImplementation(() => ok('generico'))
  mockApi.config.setReportFormat.mockImplementation((req: { formato: 'generico' | 'especializado' }) => ok(req.formato))
  mockApi.config.getBcvHistory.mockImplementation(() =>
    ok([
      { tasa: 960, actualizado_en: '2026-08-20T15:00:00.000Z', usuario_id: 1 },
      { tasa: 950, actualizado_en: '2026-08-19T15:00:00.000Z', usuario_id: 1 },
    ]),
  )
  mockApi.config.getBcvRate.mockImplementation(() => ok(null))
  mockApi.config.setBcvRate.mockImplementation(() => ok({ tasa: 970, actualizado_en: new Date().toISOString() }))
  mockApi.users.list.mockImplementation(() => ok([userRow]))
  mockApi.users.create.mockImplementation(() => ok(userRow))
  mockApi.users.disable.mockImplementation(() => ok({ ...userRow, activo: false }))
  mockApi.users.resetPassword.mockImplementation(() => ok(undefined))
  window.api = mockApi as unknown as Window['api']
  useSessionStore.setState({ session: adminSession, locked: false })
})

afterEach(() => {
  cleanup()
  useSessionStore.setState({ session: null, locked: false })
})

describe('SettingsPage (M13.3 split)', () => {
  it('renders the five focused sub-screens instead of a god component', async () => {
    render(
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>,
    )
    expect(screen.getByTestId('settings-tab-lab')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-bioanalista')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-billing')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-users')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab-backup')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('settings-lab')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('settings-tab-billing'))
    await waitFor(() => expect(screen.getByTestId('settings-billing')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('settings-tab-backup'))
    await waitFor(() => expect(screen.getByTestId('backup-screen')).toBeInTheDocument())
  })

  it('denies access to non-admin roles', async () => {
    useSessionStore.setState({ session: tecnicoSession })
    render(<SettingsPage />)
    expect(screen.getByTestId('settings-denied')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-tab-lab')).not.toBeInTheDocument()
  })
})

describe('Lab screen (logo upload N11.3)', () => {
  it('saves the lab configuration', async () => {
    render(
      <ToastProvider>
        <Lab />
      </ToastProvider>,
    )
    const nombreInput = await screen.findByTestId('lab-nombre-input')
    fireEvent.change(nombreInput, { target: { value: 'Laboratorio Actualizado' } })
    fireEvent.click(screen.getByTestId('lab-save-button'))

    await waitFor(() => {
      expect(mockApi.config.setLab).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Laboratorio Actualizado' }),
      )
    })
  })

  it('uploads a logo as a base64 image data URI (no filesystem path)', async () => {
    render(
      <ToastProvider>
        <Lab />
      </ToastProvider>,
    )
    await screen.findByTestId('lab-nombre-input')

    const file = new File(['pixels'], 'logo.png', { type: 'image/png' })
    const input = screen.getByTestId('logo-input')
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(mockApi.config.setLogo).toHaveBeenCalledTimes(1)
    })
    const arg = mockApi.config.setLogo.mock.calls[0][0] as { logo: string }
    expect(arg.logo.startsWith('data:image/png;base64,')).toBe(true)
    expect(arg.logo.includes('/Users/')).toBe(false)
    expect(arg.logo.includes('\\')).toBe(false)
  })

  it('saves the default report format through config:setReportFormat with a toast', async () => {
    render(
      <ToastProvider>
        <Lab />
      </ToastProvider>,
    )
    const select = (await screen.findByTestId('report-format-select')) as HTMLSelectElement
    expect(select.value).toBe('generico')

    fireEvent.change(select, { target: { value: 'especializado' } })
    fireEvent.click(screen.getByTestId('report-format-save'))

    await waitFor(() => {
      expect(mockApi.config.setReportFormat).toHaveBeenCalledWith({ formato: 'especializado' })
    })
    expect(await screen.findByText(/Formato de reporte guardado/i)).toBeInTheDocument()
  })
})

describe('Billing screen (BCV rate M13.2)', () => {
  it('shows the active rate with its last-updated timestamp and the history table', async () => {
    render(<Billing />)
    await waitFor(() => expect(screen.getByTestId('bcv-active-rate')).toHaveTextContent('960'))
    expect(screen.getByTestId('bcv-last-updated')).toBeInTheDocument()
    const rows = screen.getByTestId('bcv-history-body').querySelectorAll('tr')
    expect(rows).toHaveLength(2)
  })

  it('registers a new rate through config:setBcvRate and refreshes the history', async () => {
    render(<Billing />)
    await waitFor(() => expect(screen.getByTestId('bcv-active-rate')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('bcv-rate-input'), { target: { value: '970' } })
    fireEvent.click(screen.getByTestId('bcv-save-button'))

    await waitFor(() => {
      expect(mockApi.config.setBcvRate).toHaveBeenCalledWith({ tasa: 970 })
    })
    await waitFor(() => {
      expect(mockApi.config.getBcvHistory.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    expect(await screen.findByText(/Tasa actualizada a 970/)).toBeInTheDocument()
  })

  it('rejects an invalid rate input without calling the channel', async () => {
    render(<Billing />)
    await waitFor(() => expect(screen.getByTestId('bcv-active-rate')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('bcv-save-button'))
    await waitFor(() => {
      expect(screen.getByText(/Ingrese una tasa válida/i)).toBeInTheDocument()
    })
    expect(mockApi.config.setBcvRate).not.toHaveBeenCalled()
  })
})

describe('Users screen (task 5.2 admin CRUD)', () => {
  it('lists existing users with role and status', async () => {
    render(<Users />)
    await waitFor(() => {
      expect(screen.getByTestId('users-row-tecnico01')).toBeInTheDocument()
    })
    expect(screen.getByTestId('users-status-tecnico01')).toHaveTextContent('Activo')
  })

  it('creates a user with a role through users:create', async () => {
    render(<Users />)
    await screen.findByTestId('users-new-button')

    fireEvent.click(screen.getByTestId('users-new-button'))
    fireEvent.change(screen.getByTestId('users-create-usuario'), { target: { value: 'recepcion02' } })
    fireEvent.change(screen.getByTestId('users-create-nombre'), { target: { value: 'Luis Caja' } })
    fireEvent.change(screen.getByTestId('users-create-clave'), { target: { value: 'clave12345' } })
    fireEvent.change(screen.getByTestId('users-create-rol'), { target: { value: 'recepcion' } })
    fireEvent.click(screen.getByTestId('users-create-submit'))

    await waitFor(() => {
      expect(mockApi.users.create).toHaveBeenCalledWith({
        usuario: 'recepcion02',
        nombre: 'Luis Caja',
        clave: 'clave12345',
        rol: 'recepcion',
      })
    })
  })

  it('validates the creation form before submitting (min 8-char clave)', async () => {
    render(<Users />)
    fireEvent.click(await screen.findByTestId('users-new-button'))
    fireEvent.change(screen.getByTestId('users-create-usuario'), { target: { value: 'corto' } })
    fireEvent.change(screen.getByTestId('users-create-clave'), { target: { value: 'corta' } })
    fireEvent.click(screen.getByTestId('users-create-submit'))

    await waitFor(() => {
      expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    })
    expect(mockApi.users.create).not.toHaveBeenCalled()
  })

  it('disables a user after typed confirmation', async () => {
    render(<Users />)
    await screen.findByTestId('users-row-tecnico01')

    fireEvent.click(screen.getByRole('button', { name: /Deshabilitar a tecnico01/ }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }))

    await waitFor(() => {
      expect(mockApi.users.disable).toHaveBeenCalledWith({ id: 7 })
    })
  })

  it('resets a password demanding change on next login by default', async () => {
    render(<Users />)
    await screen.findByTestId('users-row-tecnico01')

    fireEvent.click(screen.getByRole('button', { name: /Restablecer clave de tecnico01/ }))
    fireEvent.change(await screen.findByTestId('users-reset-clave'), {
      target: { value: 'nuevaClave99' },
    })
    const flag = screen.getByTestId('users-reset-flag') as HTMLInputElement
    expect(flag.checked).toBe(true)
    fireEvent.click(screen.getByTestId('users-reset-submit'))

    await waitFor(() => {
      expect(mockApi.users.resetPassword).toHaveBeenCalledWith({
        id: 7,
        nueva: 'nuevaClave99',
        debe_cambiar_clave: true,
      })
    })
  })
})
