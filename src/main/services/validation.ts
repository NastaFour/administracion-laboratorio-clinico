/**
 * Pure validation state machine for results (D8).
 *
 * Pendiente → Capturado → Validado, with reject returning Capturado → Pendiente
 * and an admin-only reopen returning Validado → Pendiente. Role checks live
 * HERE (in addition to the IPC guard) so the clinical rules are enforced in one
 * testable place and can never be bypassed by a thin handler.
 *
 * - bioanalista/admin capture  → Validado immediately (D8 immediate validation)
 * - tecnico capture            → Capturado (pending validation)
 * - validate/reject            → bioanalista/admin only
 * - reopen (admin override)    → admin only, always audited by the caller
 * - a Validado result is immutable to capture (must be reopened first)
 */

import { ERROR_CODES, RESULT_STATUS, ROLES, type ResultStatus, type Role } from '@/shared/contracts'

export type ResultEvent = 'capture' | 'validate' | 'reject' | 'reopen'

export const CAPTURE_ROLES: Role[] = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO]
export const VALIDATE_ROLES: Role[] = [ROLES.ADMIN, ROLES.BIOANALISTA]
export const REOPEN_ROLES: Role[] = [ROLES.ADMIN]

export interface TransitionOutcome {
  to: ResultStatus
  /** Stamp validado_por/validado_en and mark the sample as Resultada. */
  stampsValidadoPor: boolean
  /** Reaching Validado advances muestras.estatus → Resultada (WU8 hook). */
  advancesSample: boolean
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransitionError'
  }
}

/**
 * Decide the next state for a result given the current state, the event, and
 * the acting role. Throws CONFLICT when the transition is not allowed.
 */
export function transitionResult(
  current: ResultStatus,
  event: ResultEvent,
  role: Role,
): TransitionOutcome {
  switch (event) {
    case 'capture': {
      if (current === RESULT_STATUS.VALIDADO) {
        throw new TransitionError(ERROR_CODES.CONFLICT)
      }
      if (role === ROLES.TECNICO) {
        return { to: RESULT_STATUS.CAPTURADO, stampsValidadoPor: false, advancesSample: false }
      }
      if (role === ROLES.BIOANALISTA || role === ROLES.ADMIN) {
        return { to: RESULT_STATUS.VALIDADO, stampsValidadoPor: true, advancesSample: true }
      }
      throw new TransitionError(ERROR_CODES.CONFLICT)
    }
    case 'validate': {
      if (current === RESULT_STATUS.CAPTURADO && VALIDATE_ROLES.includes(role)) {
        return { to: RESULT_STATUS.VALIDADO, stampsValidadoPor: true, advancesSample: true }
      }
      throw new TransitionError(ERROR_CODES.CONFLICT)
    }
    case 'reject': {
      if (current === RESULT_STATUS.CAPTURADO && VALIDATE_ROLES.includes(role)) {
        return { to: RESULT_STATUS.PENDIENTE, stampsValidadoPor: false, advancesSample: false }
      }
      throw new TransitionError(ERROR_CODES.CONFLICT)
    }
    case 'reopen': {
      if (current === RESULT_STATUS.VALIDADO && REOPEN_ROLES.includes(role)) {
        return { to: RESULT_STATUS.PENDIENTE, stampsValidadoPor: false, advancesSample: false }
      }
      throw new TransitionError(ERROR_CODES.CONFLICT)
    }
    default:
      throw new TransitionError(ERROR_CODES.CONFLICT)
  }
}
