import type Database from 'better-sqlite3'
import type { CreateOrderRequest, Order, OrderStatus, OrderWithExams, Session, UpdateOrderRequest } from '@/shared/contracts'
import { ERROR_CODES, ORDER_STATUS } from '@/shared/contracts'
import { writeAudit } from './audit'
import { assertDeliverable } from './payments'
import { getBalance } from '../repositories/payments'
import {
  createOrder,
  getOrder,
  setOrderAnulada,
  setOrderCerrada,
  setOrderCredito,
  updateOrder,
  updateOrderStatus,
} from '../repositories/orders'

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  [ORDER_STATUS.PENDIENTE]: ORDER_STATUS.PROCESANDO,
  [ORDER_STATUS.PROCESANDO]: ORDER_STATUS.COMPLETADA,
  [ORDER_STATUS.COMPLETADA]: ORDER_STATUS.ENTREGADA,
  [ORDER_STATUS.ENTREGADA]: null,
}

function nextStatus(current: OrderStatus): OrderStatus {
  const next = STATUS_FLOW[current]
  if (!next) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  return next
}

function requireOrder(db: Database.Database, id: number): OrderWithExams {
  const order = getOrder(db, id)
  if (!order) {
    throw new Error(ERROR_CODES.NOT_FOUND)
  }
  return order
}

export async function createOrderService(
  db: Database.Database,
  input: CreateOrderRequest,
  session: Session,
): Promise<OrderWithExams> {
  const order = createOrder(db, input)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.creada',
    entidad: 'orden',
    entidad_id: order.id,
    despues: order,
  })
  return order
}

export async function updateOrderService(
  db: Database.Database,
  input: UpdateOrderRequest,
  session: Session,
): Promise<OrderWithExams> {
  const before = requireOrder(db, input.id)
  if (before.anulada) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  const order = updateOrder(db, input)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.editada',
    entidad: 'orden',
    entidad_id: order.id,
    antes: before,
    despues: order,
  })
  return order
}

export async function advanceOrderStatusService(
  db: Database.Database,
  id: number,
  session: Session,
): Promise<Order> {
  const before = requireOrder(db, id)
  if (before.anulada) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  const next = nextStatus(before.estatus)
  updateOrderStatus(db, id, next)
  if (next === ORDER_STATUS.COMPLETADA) {
    setOrderCerrada(db, id, true)
  }
  const order = requireOrder(db, id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.estatus.avanzado',
    entidad: 'orden',
    entidad_id: order.id,
    antes: { estatus: before.estatus },
    despues: { estatus: order.estatus, cerrada: order.cerrada },
  })
  return order
}

export async function deliverOrderService(db: Database.Database, id: number, session: Session): Promise<Order> {
  const before = requireOrder(db, id)
  if (before.anulada) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  if (before.estatus !== ORDER_STATUS.COMPLETADA) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  // Delivery-block gate (D5 / M9.7): blocked while a balance is pending,
  // except for authorized credit accounts (ordenes.credito = 1).
  assertDeliverable(before, getBalance(db, id))
  updateOrderStatus(db, id, ORDER_STATUS.ENTREGADA)
  setOrderCerrada(db, id, true)
  const order = requireOrder(db, id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.entregada',
    entidad: 'orden',
    entidad_id: order.id,
    antes: { estatus: before.estatus },
    despues: { estatus: order.estatus, cerrada: order.cerrada },
  })
  return order
}

export async function voidOrderService(
  db: Database.Database,
  id: number,
  motivo: string,
  session: Session,
): Promise<Order> {
  const before = requireOrder(db, id)
  if (before.anulada) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  const order = setOrderAnulada(db, id, motivo)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.anulada',
    entidad: 'orden',
    entidad_id: order.id,
    antes: before,
    despues: order,
  })
  return order
}

export async function authorizeOrderCreditService(
  db: Database.Database,
  id: number,
  monto: number,
  motivo: string,
  session: Session,
): Promise<Order> {
  const before = requireOrder(db, id)
  if (before.anulada) {
    throw new Error(ERROR_CODES.CONFLICT)
  }
  const order = setOrderCredito(db, id)
  writeAudit(db, {
    usuario_id: session.userId,
    accion: 'orden.credito.autorizado',
    entidad: 'orden',
    entidad_id: order.id,
    antes: { credito: before.credito },
    despues: { credito: order.credito, monto, motivo },
  })
  return order
}
