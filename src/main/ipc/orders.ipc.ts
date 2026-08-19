import type Database from 'better-sqlite3'
import { ordersChannels, ROLES } from '@/shared/contracts'
import { handle } from './register'
import {
  advanceOrderStatusService,
  authorizeOrderCreditService,
  createOrderService,
  deliverOrderService,
  updateOrderService,
  voidOrderService,
} from '../services/orders'
import { getOrder, listOrders } from '../repositories/orders'
import type { Order, OrderFilters, OrderWithExams, Session } from '@/shared/contracts'

const ORDER_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]
const CLINICAL_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO]
const DELIVER_ROLES = [ROLES.ADMIN, ROLES.RECEPCION]
const ADMIN_ROLES = [ROLES.ADMIN]
const CREDIT_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA]

export async function handleCreateOrder(
  db: Database.Database,
  req: Parameters<typeof createOrderService>[1],
  session: Session,
): Promise<OrderWithExams> {
  return createOrderService(db, req, session)
}

export async function handleUpdateOrder(
  db: Database.Database,
  req: Parameters<typeof updateOrderService>[1],
  session: Session,
): Promise<OrderWithExams> {
  return updateOrderService(db, req, session)
}

export async function handleGetOrder(db: Database.Database, req: { id: number }): Promise<OrderWithExams | null> {
  return getOrder(db, req.id)
}

export async function handleListOrders(db: Database.Database, req: OrderFilters): Promise<OrderWithExams[]> {
  return listOrders(db, req)
}

export async function handleAdvanceOrderStatus(
  db: Database.Database,
  req: { id: number },
  session: Session,
): Promise<Order> {
  return advanceOrderStatusService(db, req.id, session)
}

export async function handleDeliverOrder(db: Database.Database, req: { id: number }, session: Session): Promise<Order> {
  return deliverOrderService(db, req.id, session)
}

export async function handleVoidOrder(
  db: Database.Database,
  req: { id: number; motivo: string },
  session: Session,
): Promise<Order> {
  return voidOrderService(db, req.id, req.motivo, session)
}

export async function handleAuthorizeCredit(
  db: Database.Database,
  req: { id: number; monto: number; motivo: string },
  session: Session,
): Promise<Order> {
  return authorizeOrderCreditService(db, req.id, req.monto, req.motivo, session)
}

export function registerOrdersHandlers(db: Database.Database): void {
  handle(db, 'orders:create', ORDER_ROLES, ordersChannels['orders:create'].request, handleCreateOrder)
  handle(db, 'orders:update', ORDER_ROLES, ordersChannels['orders:update'].request, handleUpdateOrder)
  handle(db, 'orders:get', ORDER_ROLES, ordersChannels['orders:get'].request, handleGetOrder)
  handle(db, 'orders:list', ORDER_ROLES, ordersChannels['orders:list'].request, handleListOrders)
  handle(db, 'orders:advanceStatus', CLINICAL_ROLES, ordersChannels['orders:advanceStatus'].request, handleAdvanceOrderStatus)
  handle(db, 'orders:deliver', DELIVER_ROLES, ordersChannels['orders:deliver'].request, handleDeliverOrder)
  handle(db, 'orders:void', ADMIN_ROLES, ordersChannels['orders:void'].request, handleVoidOrder)
  handle(db, 'orders:authorizeCredit', CREDIT_ROLES, ordersChannels['orders:authorizeCredit'].request, handleAuthorizeCredit)
}
