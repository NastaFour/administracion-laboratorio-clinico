import type Database from 'better-sqlite3'
import { paymentsChannels, ROLES, type BcvRate, type Balance, type CancelPaymentRequest, type ListAllPaymentsRequest, type Payment, type PaymentListItem, type RecordPaymentRequest, type Session } from '@/shared/contracts'
import { ERROR_CODES } from '@/shared/contracts'
import { handle } from './register'
import { writeAudit } from '../services/audit'
import { resolveBsAmount } from '../services/payments'
import { runCierreService, cierrePrintService } from '../services/cierre'
import { cancelPayment, getBalance, getPayment, listAllPayments, listPaymentsByOrder, recordPayment } from '../repositories/payments'
import { getBcvRate, setBcvRate } from '../repositories/config'

const PAYMENT_ROLES = [ROLES.ADMIN, ROLES.RECEPCION]
const ADMIN_ROLES = [ROLES.ADMIN]

export async function handleRecordPayment(
  db: Database.Database,
  req: RecordPaymentRequest,
  session: Session,
): Promise<Payment> {
  // The BCV rate is resolved server-side from history — never trusted from the
  // renderer. A missing active rate blocks a USD payment (no silent fallback).
  const rate = getBcvRate(db)
  const montoBs = resolveBsAmount({
    monto_bs: req.monto_bs,
    monto_usd: req.monto_usd,
    tasaBcv: rate?.tasa ?? null,
  })

  const payment = recordPayment(db, {
    orden_id: req.orden_id,
    cuenta_id: req.cuenta_id,
    metodo: req.metodo,
    monto_bs: montoBs,
    monto_usd: req.monto_usd,
    tasa_bcv: rate?.tasa ?? 0,
    referencia: req.referencia,
    fecha: req.fecha,
    usuario_id: session.userId,
  })

  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'pago.registrado',
    entidad: 'pago',
    entidad_id: payment.id,
    despues: payment,
  })

  return payment
}

export async function handleCancelPayment(
  db: Database.Database,
  req: CancelPaymentRequest,
  session: Session,
): Promise<Payment> {
  const before = getPayment(db, req.id)
  if (!before) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  const payment = cancelPayment(db, req.id, { anulado_por: session.userId })
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'pago.anulado',
    entidad: 'pago',
    entidad_id: payment.id,
    antes: before,
    despues: { anulado: true, motivo: req.motivo },
  })
  return payment
}

export function handleListPaymentsForOrder(db: Database.Database, req: { ordenId: number }): Payment[] {
  return listPaymentsByOrder(db, req.ordenId)
}

export function handleBalance(db: Database.Database, req: { ordenId: number }): Balance {
  return getBalance(db, req.ordenId)
}

export function handleListAllPayments(
  db: Database.Database,
  req: ListAllPaymentsRequest,
): PaymentListItem[] {
  return listAllPayments(db, req)
}

export function handleGetBcvRate(db: Database.Database): BcvRate | null {
  return getBcvRate(db)
}

export async function handleSetBcvRate(
  db: Database.Database,
  req: { tasa: number },
  session: Session,
): Promise<BcvRate> {
  // setBcvRate appends to bcv_historial (never overwrites in place silently).
  const rate = setBcvRate(db, req.tasa, session.userId)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'config.cambiada',
    entidad: 'config',
    entidad_id: null,
    despues: { tasa_bcv: rate.tasa },
  })
  return rate
}

export function handleRunCierre(db: Database.Database, req: { fecha: string }, session: Session) {
  return runCierreService(db, req.fecha, session)
}

export function handlePrintCierre(db: Database.Database, req: { fecha: string }): string {
  return cierrePrintService(db, req.fecha)
}

export function registerPaymentsHandlers(db: Database.Database): void {
  handle(db, 'payments:record', PAYMENT_ROLES, paymentsChannels['payments:record'].request, handleRecordPayment)
  handle(db, 'payments:cancel', PAYMENT_ROLES, paymentsChannels['payments:cancel'].request, handleCancelPayment)
  handle(db, 'payments:listForOrder', PAYMENT_ROLES, paymentsChannels['payments:listForOrder'].request, handleListPaymentsForOrder)
  handle(db, 'payments:balance', PAYMENT_ROLES, paymentsChannels['payments:balance'].request, handleBalance)
  handle(db, 'payments:listAll', PAYMENT_ROLES, paymentsChannels['payments:listAll'].request, handleListAllPayments)
  handle(db, 'config:getBcvRate', PAYMENT_ROLES, paymentsChannels['config:getBcvRate'].request, handleGetBcvRate)
  handle(db, 'config:setBcvRate', ADMIN_ROLES, paymentsChannels['config:setBcvRate'].request, handleSetBcvRate)
  handle(db, 'cierre:run', PAYMENT_ROLES, paymentsChannels['cierre:run'].request, handleRunCierre)
  handle(db, 'cierre:print', PAYMENT_ROLES, paymentsChannels['cierre:print'].request, handlePrintCierre)
}
