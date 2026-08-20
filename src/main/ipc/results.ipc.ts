import type Database from 'better-sqlite3'
import { resultsChannels } from '@/shared/contracts'
import { handle } from './register'
import { CAPTURE_ROLES, REOPEN_ROLES, VALIDATE_ROLES } from '../services/validation'
import {
  captureResultService,
  commentResultService,
  paramsForCaptureService,
  rejectResultService,
  reopenResultService,
  validateResultService,
} from '../services/results'
import type { CaptureResultRequest, ParamForCapture, Result, Session } from '@/shared/contracts'

export function handleParamsForCapture(
  db: Database.Database,
  req: { ordenExamenId: number },
): ParamForCapture[] {
  return paramsForCaptureService(db, req.ordenExamenId)
}

export async function handleCaptureResult(
  db: Database.Database,
  req: CaptureResultRequest,
  session: Session,
): Promise<Result> {
  return captureResultService(db, req, session)
}

export async function handleValidateResult(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Result> {
  return validateResultService(db, req.id, session)
}

export async function handleRejectResult(
  db: Database.Database,
  req: { id: number; motivo: string },
  session: Session,
): Promise<Result> {
  return rejectResultService(db, req.id, req.motivo, session)
}

export async function handleReopenResult(
  db: Database.Database,
  req: { id: number; motivo: string },
  session: Session,
): Promise<Result> {
  return reopenResultService(db, req.id, req.motivo, session)
}

export async function handleCommentResult(
  db: Database.Database,
  req: { id: number; comentario: string },
  session: Session,
): Promise<Result> {
  return commentResultService(db, req.id, req.comentario, session)
}

export function registerResultsHandlers(db: Database.Database): void {
  handle(
    db,
    'results:paramsForCapture',
    CAPTURE_ROLES,
    resultsChannels['results:paramsForCapture'].request,
    handleParamsForCapture,
  )
  handle(db, 'results:capture', CAPTURE_ROLES, resultsChannels['results:capture'].request, handleCaptureResult)
  handle(db, 'results:validate', VALIDATE_ROLES, resultsChannels['results:validate'].request, handleValidateResult)
  handle(db, 'results:reject', VALIDATE_ROLES, resultsChannels['results:reject'].request, handleRejectResult)
  handle(db, 'results:reopen', REOPEN_ROLES, resultsChannels['results:reopen'].request, handleReopenResult)
  handle(db, 'results:comment', CAPTURE_ROLES, resultsChannels['results:comment'].request, handleCommentResult)
}
