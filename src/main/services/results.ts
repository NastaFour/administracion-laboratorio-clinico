import type Database from 'better-sqlite3'
import type {
  CaptureResultRequest,
  ParamForCapture,
  Result,
  Session,
} from '@/shared/contracts'
import { ERROR_CODES, RESULT_STATUS, RESULT_TYPE } from '@/shared/contracts'
import { computeExactAge, computeFlag, selectBandForExactAge } from './referenceRanges'
import { transitionResult } from './validation'
import { writeAudit } from './audit'
import { getOrderExam } from '../repositories/orders'
import { getPatient } from '../repositories/patients'
import { getParam, listParams, listRanges } from '../repositories/catalog'
import {
  createResult,
  getResultByOrderExamAndParam,
  requireResult,
  setResultComment,
  setResultMotivoRechazo,
  setResultValidation,
  updateResultValue,
} from '../repositories/results'
import { markSampleResultadaByOrderExam } from '../repositories/samples'

interface ResolvedOrderExamPatient {
  ordenId: number
  examenId: number
  pacienteId: number
  paciente: {
    sexo: 'M' | 'F' | 'O'
    fecha_nacimiento: string
  }
}

function requireOrderExamPatient(db: Database.Database, ordenExamenId: number): ResolvedOrderExamPatient {
  const orderExam = getOrderExam(db, ordenExamenId)
  if (!orderExam) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  const patient = getPatient(db, orderExam.paciente_id)
  if (!patient) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  return {
    ordenId: orderExam.orden_id,
    examenId: orderExam.examen_id,
    pacienteId: patient.id,
    paciente: { sexo: patient.sexo, fecha_nacimiento: patient.fecha_nacimiento },
  }
}

/**
 * WU9a: build the capture form data for one exam in an order. Each parameter is
 * paired with the reference band selected from the patient's sex + exact age at
 * capture time (fixes the v1 defect where an unfiltered row was shown), plus the
 * main-computed flag/status of any existing result.
 */
export function paramsForCaptureService(db: Database.Database, ordenExamenId: number): ParamForCapture[] {
  const { examenId, paciente } = requireOrderExamPatient(db, ordenExamenId)
  const exactAge = computeExactAge(paciente.fecha_nacimiento, new Date())
  const params = listParams(db, examenId)

  return params.map((param) => {
    const bands = listRanges(db, param.id)
    const band = selectBandForExactAge(bands, paciente.sexo, exactAge)
    const existing = getResultByOrderExamAndParam(db, ordenExamenId, param.id)
    return {
      parametro_id: param.id,
      nombre: param.nombre,
      unidad: param.unidad,
      tipo_resultado: param.tipo_resultado,
      opciones_cualitativas: param.opciones_cualitativas,
      banda: band,
      resultado: existing
        ? {
            id: existing.id,
            estatus_validacion: existing.estatus_validacion,
            valor_numerico: existing.valor_numerico,
            valor_cualitativo: existing.valor_cualitativo,
            flag: existing.flag,
            validado_por: existing.validado_por,
            comentario: existing.comentario,
            motivo_rechazo: existing.motivo_rechazo,
          }
        : null,
    }
  })
}

/**
 * WU9a: record a captured value. The flag is computed in main against the
 * entry-time band (A10); out-of-range and critical values are auto-flagged
 * (M7.6). The transition outcome decides whether the result lands in Capturado
 * or Validado (D8). A Validado outcome advances the sample to Resultada via the
 * WU8 hook. Every transition is audited.
 */
export function captureResultService(
  db: Database.Database,
  req: CaptureResultRequest,
  session: Session,
): Result {
  const { examenId, paciente } = requireOrderExamPatient(db, req.orden_examen_id)
  const param = getParam(db, req.parametro_id)
  if (!param || param.examen_id !== examenId) {
    throw new Error(ERROR_CODES.CONFLICT)
  }

  const exactAge = computeExactAge(paciente.fecha_nacimiento, new Date())
  const bands = listRanges(db, param.id)
  const band = selectBandForExactAge(bands, paciente.sexo, exactAge)
  const numeric = req.valor.tipo === RESULT_TYPE.NUMERICO ? req.valor.valor : null
  const flag = computeFlag(numeric, band, true)

  const existing = getResultByOrderExamAndParam(db, req.orden_examen_id, req.parametro_id)
  const outcome = transitionResult(
    existing?.estatus_validacion ?? RESULT_STATUS.PENDIENTE,
    'capture',
    session.rol,
  )

  let result: Result
  if (existing) {
    result = updateResultValue(db, existing.id, {
      valor: req.valor,
      comentario: req.comentario,
      flag,
    })
    if (outcome.stampsValidadoPor) {
      result = setResultValidation(db, existing.id, outcome.to, session.userId)
    } else if (existing.estatus_validacion !== outcome.to) {
      result = setResultValidation(db, existing.id, outcome.to, null)
    }
  } else {
    result = createResult(db, {
      orden_examen_id: req.orden_examen_id,
      parametro_id: req.parametro_id,
      valor: req.valor,
      estatus: outcome.to,
      validado_por: outcome.stampsValidadoPor ? session.userId : null,
      flag,
      comentario: req.comentario,
    })
  }

  if (outcome.advancesSample) {
    markSampleResultadaByOrderExam(db, req.orden_examen_id)
  }

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'resultado.capturado',
    entidad: 'resultado',
    entidad_id: result.id,
    antes: existing
      ? {
          estatus_validacion: existing.estatus_validacion,
          valor_numerico: existing.valor_numerico,
          valor_cualitativo: existing.valor_cualitativo,
          flag: existing.flag,
        }
      : null,
    despues: {
      orden_examen_id: result.orden_examen_id,
      parametro_id: result.parametro_id,
      estatus_validacion: result.estatus_validacion,
      valor_numerico: result.valor_numerico,
      valor_cualitativo: result.valor_cualitativo,
      flag: result.flag,
    },
  })

  if (outcome.stampsValidadoPor) {
    writeAudit(db, {
      usuario_id: session.userId,
      accion: 'resultado.validado',
      entidad: 'resultado',
      entidad_id: result.id,
      despues: { estatus_validacion: RESULT_STATUS.VALIDADO, validado_por: session.userId },
    })
  }

  return result
}

/**
 * WU9b: explicit validation of a Capturado result. Advances the sample to
 * Resultada (sampling spec scenario) and audits the transition.
 */
export function validateResultService(db: Database.Database, id: number, session: Session): Result {
  const result = requireResult(db, id)
  transitionResult(result.estatus_validacion, 'validate', session.rol)

  const updated = setResultValidation(db, id, RESULT_STATUS.VALIDADO, session.userId)
  markSampleResultadaByOrderExam(db, result.orden_examen_id)

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'resultado.validado',
    entidad: 'resultado',
    entidad_id: result.id,
    antes: { estatus_validacion: result.estatus_validacion },
    despues: { estatus_validacion: RESULT_STATUS.VALIDADO, validado_por: session.userId },
  })
  return updated
}

/**
 * WU9b: reject a Capturado result back to Pendiente for rework, storing the
 * reason (M7.4). Audited.
 */
export function rejectResultService(
  db: Database.Database,
  id: number,
  motivo: string,
  session: Session,
): Result {
  const result = requireResult(db, id)
  transitionResult(result.estatus_validacion, 'reject', session.rol)

  setResultValidation(db, id, RESULT_STATUS.PENDIENTE, null)
  const updated = setResultMotivoRechazo(db, id, motivo)

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'resultado.rechazado',
    entidad: 'resultado',
    entidad_id: result.id,
    antes: { estatus_validacion: result.estatus_validacion, flag: result.flag },
    despues: { estatus_validacion: RESULT_STATUS.PENDIENTE, motivo },
  })
  return updated
}

/**
 * WU9b: admin-only reopen of a Validado result (M7.5). The override reason is
 * audited; the result returns to Pendiente for rework and re-validation.
 */
export function reopenResultService(
  db: Database.Database,
  id: number,
  motivo: string,
  session: Session,
): Result {
  const result = requireResult(db, id)
  transitionResult(result.estatus_validacion, 'reopen', session.rol)

  const updated = setResultValidation(db, id, RESULT_STATUS.PENDIENTE, null)

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'resultado.reabierto',
    entidad: 'resultado',
    entidad_id: result.id,
    antes: { estatus_validacion: RESULT_STATUS.VALIDADO, validado_por: result.validado_por },
    despues: { estatus_validacion: RESULT_STATUS.PENDIENTE, motivo },
  })
  return updated
}

/**
 * M7.7 (Should): per-exam comment. Validated results are immutable to edits
 * until reopened.
 */
export function commentResultService(
  db: Database.Database,
  id: number,
  comentario: string,
  session: Session,
): Result {
  const result = requireResult(db, id)
  if (result.estatus_validacion === RESULT_STATUS.VALIDADO) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  const updated = setResultComment(db, id, comentario)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'resultado.capturado',
    entidad: 'resultado',
    entidad_id: result.id,
    antes: { comentario: result.comentario },
    despues: { comentario },
  })
  return updated
}
