import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { BackupScreen } from './BackupScreen'
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

const mockApi = {
  backup: {
    create: vi.fn(),
    list: vi.fn(),
    restore: vi.fn(),
  },
  import: {
    preview: vi.fn(),
    apply: vi.fn(),
  },
  export: {
    filtered: vi.fn(),
  },
}

function ok<T>(data: T) {
  return Promise.resolve({ ok: true as const, data })
}

const backupRow = { path: 'C:\\respaldos\\labcore.db', creado_en: '2026-08-24T15:00:00.000Z', size_bytes: 12345 }

const conflict = {
  id: 'V-12345678',
  tipo: 'paciente' as const,
  cedula: 'V-12345678',
  local: {
    id: 1,
    cedula: 'V-12345678',
    nombre: 'Local',
    apellido: 'Paciente',
    fecha_nacimiento: '1985-03-15',
    sexo: 'M' as const,
    telefono: null,
    email: null,
    direccion: null,
    activo: true,
  },
  incoming: {
    cedula: 'V-12345678',
    nombre: 'Importado',
    apellido: 'Paciente',
    fecha_nacimiento: '1985-03-15',
    sexo: 'M' as const,
    telefono: null,
    email: null,
    direccion: null,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.backup.list.mockImplementation(() => ok([backupRow]))
  mockApi.backup.create.mockImplementation(() => ok(backupRow))
  mockApi.backup.restore.mockImplementation(() => ok(undefined))
  mockApi.import.preview.mockImplementation(() => ok([conflict]))
  mockApi.import.apply.mockImplementation(() => ok(undefined))
  mockApi.export.filtered.mockImplementation(() => ok('orden_id,fecha\n1,2026-08-24'))
  window.api = mockApi as unknown as Window['api']
  useSessionStore.setState({ session: adminSession, locked: false })
})

afterEach(() => {
  cleanup()
  useSessionStore.setState({ session: null, locked: false })
})

describe('BackupScreen (WU14)', () => {
  it('renders the create / list / import / export sections', async () => {
    render(<BackupScreen />)
    expect(screen.getByTestId('backup-screen')).toBeInTheDocument()
    expect(screen.getByTestId('backup-path-input')).toBeInTheDocument()
    expect(screen.getByTestId('import-path-input')).toBeInTheDocument()
    expect(screen.getByTestId('export-button')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('backup-list')).toBeInTheDocument())
    expect(screen.getByText('C:\\respaldos\\labcore.db')).toBeInTheDocument()
  })

  it('creates a backup to the chosen path', async () => {
    render(<BackupScreen />)
    fireEvent.change(screen.getByTestId('backup-path-input'), { target: { value: 'D:\\usb\\lab.db' } })
    fireEvent.click(screen.getByTestId('backup-create-button'))

    await waitFor(() => {
      expect(mockApi.backup.create).toHaveBeenCalledWith({ filePath: 'D:\\usb\\lab.db' })
    })
    expect(screen.getByText('Respaldo creado correctamente.')).toBeInTheDocument()
  })

  it('restores from the typed path', async () => {
    render(<BackupScreen />)
    fireEvent.change(screen.getByTestId('restore-path-input'), { target: { value: 'D:\\usb\\lab.db' } })
    fireEvent.click(screen.getByTestId('restore-button'))

    await waitFor(() => {
      expect(mockApi.backup.restore).toHaveBeenCalledWith({ filePath: 'D:\\usb\\lab.db' })
    })
  })

  it('previews import conflicts and applies resolutions', async () => {
    render(<BackupScreen />)
    fireEvent.change(screen.getByTestId('import-path-input'), { target: { value: 'C:\\tmp\\import.json' } })
    fireEvent.click(screen.getByTestId('import-preview-button'))

    await waitFor(() => expect(screen.getByTestId('conflict-list')).toBeInTheDocument())
    const select = screen.getByTestId(`resolution-${conflict.id}`)
    fireEvent.change(select, { target: { value: 'overwrite' } })

    fireEvent.click(screen.getByTestId('import-apply-button'))
    await waitFor(() => {
      expect(mockApi.import.apply).toHaveBeenCalledWith({
        filePath: 'C:\\tmp\\import.json',
        resolutions: { [conflict.id]: 'overwrite' },
      })
    })
  })

  it('exports a filtered dataset and shows the result', async () => {
    render(<BackupScreen />)
    fireEvent.change(screen.getByTestId('export-desde'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByTestId('export-hasta'), { target: { value: '2026-08-31' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => {
      expect(mockApi.export.filtered).toHaveBeenCalledWith(
        expect.objectContaining({ desde: '2026-08-01', hasta: '2026-08-31', formato: 'csv' }),
      )
    })
    expect(screen.getByTestId('export-result')).toHaveValue('orden_id,fecha\n1,2026-08-24')
  })
})
