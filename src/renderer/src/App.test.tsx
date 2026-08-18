import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the LabCore scaffold shell', () => {
    render(<App />)

    expect(screen.getByText('LabCore')).toBeInTheDocument()
    expect(screen.getByText('Sistema de gestión de laboratorio clínico')).toBeInTheDocument()
  })
})
