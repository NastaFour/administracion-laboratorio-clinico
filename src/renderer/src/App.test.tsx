import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import App from './App'

const mockMe = vi.fn()
const mockPatientsList = vi.fn()
const mockPatientsSearch = vi.fn()

beforeEach(() => {
  mockMe.mockReset()
  mockPatientsList.mockReset()
  mockPatientsSearch.mockReset()
  mockPatientsList.mockResolvedValue({ ok: true, data: [] })
  mockPatientsSearch.mockResolvedValue({ ok: true, data: [] })

  window.api = {
    auth: {
      login: vi.fn(),
      logout: vi.fn(),
      me: mockMe,
      changePassword: vi.fn(),
    },
    users: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      disable: vi.fn(),
      resetPassword: vi.fn(),
    },
    patients: { list: mockPatientsList, search: mockPatientsSearch, get: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn(), merge: vi.fn(), history: vi.fn() },
    catalog: { listExams: vi.fn(), saveExam: vi.fn(), deactivateExam: vi.fn(), listParams: vi.fn(), saveParam: vi.fn(), saveRange: vi.fn(), deactivateParam: vi.fn(), import: vi.fn(), export: vi.fn() },
    medicos: { list: vi.fn(), save: vi.fn(), deactivate: vi.fn() },
    orders: { create: vi.fn(), update: vi.fn(), get: vi.fn(), list: vi.fn(), advanceStatus: vi.fn(), deliver: vi.fn(), void: vi.fn() },
    samples: { register: vi.fn(), list: vi.fn(), updateStatus: vi.fn(), reject: vi.fn(), label: vi.fn() },
    results: { paramsForCapture: vi.fn(), capture: vi.fn(), validate: vi.fn(), reject: vi.fn(), reopen: vi.fn(), comment: vi.fn() },
    reports: { preview: vi.fn(), print: vi.fn(), savePdf: vi.fn() },
    payments: { record: vi.fn(), cancel: vi.fn(), listForOrder: vi.fn(), balance: vi.fn() },
    cierre: { run: vi.fn(), print: vi.fn() },
    config: { getBcvRate: vi.fn(), setBcvRate: vi.fn(), getLab: vi.fn(), setLab: vi.fn(), setBioanalista: vi.fn(), setLogo: vi.fn(), getPrint: vi.fn(), setPrint: vi.fn(), getReportFormat: vi.fn().mockResolvedValue({ ok: true, data: 'generico' }), setReportFormat: vi.fn() },
    backup: { create: vi.fn(), list: vi.fn(), restore: vi.fn(), prune: vi.fn() },
    import: { preview: vi.fn(), apply: vi.fn() },
    export: { filtered: vi.fn() },
    audit: { list: vi.fn() },
    dashboard: { today: vi.fn(), debtors: vi.fn(), stats: vi.fn(), trends: vi.fn() },
  } as unknown as Window['api']
})

describe('App', () => {
  it('shows the login screen when no session exists', async () => {
    cleanup()
    mockMe.mockResolvedValue({ ok: true, data: null })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
      expect(screen.getByLabelText('Clave')).toBeInTheDocument()
    })
  })

  it('shows the patients workspace when a session exists', async () => {
    cleanup()
    mockMe.mockResolvedValue({
      ok: true,
      data: {
        userId: 1,
        usuario: 'admin',
        nombre: 'Administrador',
        rol: 'admin',
        loginAt: new Date().toISOString(),
        debe_cambiar_clave: false,
      },
    })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('patients-heading')).toBeInTheDocument()
      expect(screen.getByText('Administrador')).toBeInTheDocument()
    })
  })
})
