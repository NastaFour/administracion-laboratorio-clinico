import { describe, it, expect } from 'vitest'
import { RESULT_STATUS, ROLES } from '@/shared/contracts'
import {
  CAPTURE_ROLES,
  REOPEN_ROLES,
  TransitionError,
  VALIDATE_ROLES,
  transitionResult,
} from './validation'

describe('validation state machine — capture', () => {
  it('RED: a tecnico capture stays Capturado (pending validation)', () => {
    const outcome = transitionResult(RESULT_STATUS.PENDIENTE, 'capture', ROLES.TECNICO)
    expect(outcome.to).toBe(RESULT_STATUS.CAPTURADO)
    expect(outcome.stampsValidadoPor).toBe(false)
    expect(outcome.advancesSample).toBe(false)
  })

  it('a bioanalista capture validates immediately (D8)', () => {
    const outcome = transitionResult(RESULT_STATUS.PENDIENTE, 'capture', ROLES.BIOANALISTA)
    expect(outcome.to).toBe(RESULT_STATUS.VALIDADO)
    expect(outcome.stampsValidadoPor).toBe(true)
    expect(outcome.advancesSample).toBe(true)
  })

  it('an admin capture validates immediately', () => {
    const outcome = transitionResult(RESULT_STATUS.PENDIENTE, 'capture', ROLES.ADMIN)
    expect(outcome.to).toBe(RESULT_STATUS.VALIDADO)
    expect(outcome.stampsValidadoPor).toBe(true)
  })

  it('a recepcion cannot capture', () => {
    expect(() => transitionResult(RESULT_STATUS.PENDIENTE, 'capture', ROLES.RECEPCION)).toThrow(TransitionError)
  })

  it('re-capturing a Capturado result keeps tecnico semantics', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'capture', ROLES.TECNICO)
    expect(outcome.to).toBe(RESULT_STATUS.CAPTURADO)
    expect(outcome.stampsValidadoPor).toBe(false)
  })

  it('re-capturing a Capturado result validates immediately for a bioanalista', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'capture', ROLES.BIOANALISTA)
    expect(outcome.to).toBe(RESULT_STATUS.VALIDADO)
    expect(outcome.stampsValidadoPor).toBe(true)
  })

  it('a Validado result rejects normal capture (immutability, M7.5)', () => {
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'capture', ROLES.BIOANALISTA)).toThrow(TransitionError)
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'capture', ROLES.TECNICO)).toThrow(TransitionError)
  })
})

describe('validation state machine — validate', () => {
  it('a bioanalista validates a Capturado result', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'validate', ROLES.BIOANALISTA)
    expect(outcome.to).toBe(RESULT_STATUS.VALIDADO)
    expect(outcome.stampsValidadoPor).toBe(true)
    expect(outcome.advancesSample).toBe(true)
  })

  it('an admin validates a Capturado result', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'validate', ROLES.ADMIN)
    expect(outcome.to).toBe(RESULT_STATUS.VALIDADO)
  })

  it('RED: a tecnico cannot validate (M7.3)', () => {
    expect(() => transitionResult(RESULT_STATUS.CAPTURADO, 'validate', ROLES.TECNICO)).toThrow(TransitionError)
  })

  it('a recepcion cannot validate', () => {
    expect(() => transitionResult(RESULT_STATUS.CAPTURADO, 'validate', ROLES.RECEPCION)).toThrow(TransitionError)
  })

  it('cannot validate a Pendiente result (nothing captured yet)', () => {
    expect(() => transitionResult(RESULT_STATUS.PENDIENTE, 'validate', ROLES.BIOANALISTA)).toThrow(TransitionError)
  })

  it('cannot validate an already Validado result', () => {
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'validate', ROLES.BIOANALISTA)).toThrow(TransitionError)
  })
})

describe('validation state machine — reject', () => {
  it('a bioanalista rejects a Capturado result back to Pendiente', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'reject', ROLES.BIOANALISTA)
    expect(outcome.to).toBe(RESULT_STATUS.PENDIENTE)
    expect(outcome.stampsValidadoPor).toBe(false)
  })

  it('an admin rejects a Capturado result', () => {
    const outcome = transitionResult(RESULT_STATUS.CAPTURADO, 'reject', ROLES.ADMIN)
    expect(outcome.to).toBe(RESULT_STATUS.PENDIENTE)
  })

  it('a tecnico cannot reject', () => {
    expect(() => transitionResult(RESULT_STATUS.CAPTURADO, 'reject', ROLES.TECNICO)).toThrow(TransitionError)
  })

  it('cannot reject a Validado result without reopening first', () => {
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'reject', ROLES.BIOANALISTA)).toThrow(TransitionError)
  })

  it('cannot reject a Pendiente result', () => {
    expect(() => transitionResult(RESULT_STATUS.PENDIENTE, 'reject', ROLES.BIOANALISTA)).toThrow(TransitionError)
  })
})

describe('validation state machine — reopen (admin override)', () => {
  it('an admin reopens a Validado result back to Pendiente (M7.5)', () => {
    const outcome = transitionResult(RESULT_STATUS.VALIDADO, 'reopen', ROLES.ADMIN)
    expect(outcome.to).toBe(RESULT_STATUS.PENDIENTE)
    expect(outcome.stampsValidadoPor).toBe(false)
  })

  it('RED: a bioanalista cannot reopen (admin override only)', () => {
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'reopen', ROLES.BIOANALISTA)).toThrow(TransitionError)
  })

  it('a tecnico cannot reopen', () => {
    expect(() => transitionResult(RESULT_STATUS.VALIDADO, 'reopen', ROLES.TECNICO)).toThrow(TransitionError)
  })

  it('cannot reopen a result that is not Validado', () => {
    expect(() => transitionResult(RESULT_STATUS.CAPTURADO, 'reopen', ROLES.ADMIN)).toThrow(TransitionError)
    expect(() => transitionResult(RESULT_STATUS.PENDIENTE, 'reopen', ROLES.ADMIN)).toThrow(TransitionError)
  })
})

describe('role constants', () => {
  it('capture is allowed for admin, bioanalista and tecnico', () => {
    expect(CAPTURE_ROLES).toEqual([ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO])
  })

  it('validate/reject are allowed for admin and bioanalista only', () => {
    expect(VALIDATE_ROLES).toEqual([ROLES.ADMIN, ROLES.BIOANALISTA])
  })

  it('reopen is admin only', () => {
    expect(REOPEN_ROLES).toEqual([ROLES.ADMIN])
  })
})
