import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CatalogPage } from './CatalogPage'
import type { Exam, Parameter } from '@/shared/contracts'

const sampleExam: Exam = {
  id: 10,
  codigo: 'HEM01',
  nombre: 'Hematología Completa',
  categoria: 'Hematología',
  tipo_muestra: 'Sangre total (EDTA)',
  precio: 25.0,
  tercerizado: false,
  proveedor: null,
  activo: true,
}

const sampleParam: Parameter = {
  id: 101,
  examen_id: 10,
  nombre: 'Hemoglobina',
  unidad: 'g/dL',
  tipo_resultado: 'numerico',
  orden: 1,
  opciones_cualitativas: null,
  activo: true,
}

const mockApi = {
  catalog: {
    listExams: vi.fn().mockResolvedValue({ ok: true, data: [sampleExam] }),
    listParams: vi.fn().mockResolvedValue({ ok: true, data: [sampleParam] }),
    saveExam: vi.fn().mockResolvedValue({ ok: true, data: sampleExam }),
    saveParam: vi.fn().mockResolvedValue({ ok: true, data: sampleParam }),
    deactivateExam: vi.fn().mockResolvedValue({ ok: true, data: sampleExam }),
    deactivateParam: vi.fn().mockResolvedValue({ ok: true, data: sampleParam }),
  },
}

beforeEach(() => {
  mockApi.catalog.listExams.mockResolvedValue({ ok: true, data: [sampleExam] })
  mockApi.catalog.listParams.mockResolvedValue({ ok: true, data: [sampleParam] })
  window.api = mockApi as unknown as Window['api']
})

afterEach(() => {
  cleanup()
})

describe('CatalogPage accordion toggle (M5 Quick fix)', () => {
  it('toggles exam selection on repeat click: first click expands, second click collapses', async () => {
    render(<CatalogPage />)

    // Wait for exam to appear in table
    await waitFor(() => {
      expect(screen.getByText('HEM01')).toBeInTheDocument()
      expect(screen.getByText('Hematología Completa')).toBeInTheDocument()
    })

    // Initially, parameter section is not rendered
    expect(screen.queryByText('Hemoglobina')).not.toBeInTheDocument()

    // 1st click on HEM01: expands parameter panel
    fireEvent.click(screen.getByText('HEM01'))

    await waitFor(() => {
      // The parameters panel for Hematología Completa is visible
      expect(screen.getByText('Hemoglobina')).toBeInTheDocument()
    })

    // 2nd click on HEM01: toggles and collapses the panel
    fireEvent.click(screen.getByText('HEM01'))

    await waitFor(() => {
      // The parameters panel is now collapsed and removed from DOM
      expect(screen.queryByText('Hemoglobina')).not.toBeInTheDocument()
    })
  })
})
