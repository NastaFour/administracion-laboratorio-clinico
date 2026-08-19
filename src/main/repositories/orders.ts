import type Database from 'better-sqlite3'
import type { CreateOrderRequest, Order, OrderExam, OrderFilters, OrderWithExams, UpdateOrderRequest } from '@/shared/contracts'
import { ERROR_CODES } from '@/shared/contracts'
import { fromBoolean, toBoolean, toIsoString, toOrderStatus } from './helpers'
import { getExam } from './catalog'

export function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as number,
    paciente_id: row.paciente_id as number,
    medico_id: (row.medico_id as number | null | undefined) ?? null,
    empresa_id: (row.empresa_id as number | null | undefined) ?? null,
    estatus: toOrderStatus(row.estatus as string),
    observaciones: (row.observaciones as string | null | undefined) ?? null,
    total_bs: row.precio_total as number,
    credito: toBoolean(row.credito as number | null | undefined),
    anulada: toBoolean(row.anulada as number | null | undefined),
    motivo_anulacion: (row.motivo_anulacion as string | null | undefined) ?? null,
    cerrada: toBoolean(row.cerrada as number | null | undefined),
    fecha: (row.fecha_solicitud as string).slice(0, 10),
    creado_en: toIsoString(row.fecha_solicitud) ?? (row.fecha_solicitud as string),
  }
}

export function rowToOrderExam(row: Record<string, unknown>): OrderExam {
  return {
    examen_id: row.examen_id as number,
    precio: row.precio as number,
    tercerizado: toBoolean(row.tercerizado as number | null | undefined),
    proveedor: (row.proveedor as string | null | undefined) ?? null,
    comentario: (row.comentario as string | null | undefined) ?? null,
  }
}

function loadExams(db: Database.Database, orderId: number): OrderExam[] {
  const rows = db
    .prepare('SELECT examen_id, precio, tercerizado, proveedor, comentario FROM orden_examenes WHERE orden_id = ?')
    .all(orderId) as Array<Record<string, unknown>>
  return rows.map(rowToOrderExam)
}

function toOrderWithExams(db: Database.Database, row: Record<string, unknown>): OrderWithExams {
  return {
    ...rowToOrder(row),
    examenes: loadExams(db, row.id as number),
  }
}

export function getOrder(db: Database.Database, id: number): OrderWithExams | null {
  const row = db.prepare('SELECT * FROM ordenes WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? toOrderWithExams(db, row) : null
}

export function listOrders(db: Database.Database, filters: OrderFilters = {}): OrderWithExams[] {
  const conditions: string[] = []
  const values: unknown[] = []
  if (filters.pacienteId !== undefined) {
    conditions.push('paciente_id = ?')
    values.push(filters.pacienteId)
  }
  if (filters.estatus !== undefined) {
    conditions.push('estatus = ?')
    values.push(filters.estatus)
  }
  if (filters.desde !== undefined) {
    conditions.push('date(fecha_solicitud) >= ?')
    values.push(filters.desde)
  }
  if (filters.hasta !== undefined) {
    conditions.push('date(fecha_solicitud) <= ?')
    values.push(filters.hasta)
  }
  if (filters.pendientePago !== undefined) {
    conditions.push(filters.pendientePago ? "estatus_pago = 'Pendiente'" : "estatus_pago = 'Pagado'")
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM ordenes ${where} ORDER BY fecha_solicitud DESC`)
    .all(...values) as Array<Record<string, unknown>>
  return rows.map((row) => toOrderWithExams(db, row))
}

function resolveExamPrices(db: Database.Database, examenes: OrderExam[]): OrderExam[] {
  return examenes.map((exam) => {
    const catalog = getExam(db, exam.examen_id)
    if (!catalog) {
      throw new Error(ERROR_CODES.NOT_FOUND)
    }
    return {
      ...exam,
      precio: catalog.precio,
    }
  })
}

function computeTotal(examenes: OrderExam[]): number {
  return examenes.reduce((sum, exam) => sum + exam.precio, 0)
}

function insertOrderExams(db: Database.Database, ordenId: number, examenes: OrderExam[]): void {
  const stmt = db.prepare(
    'INSERT INTO orden_examenes (orden_id, examen_id, precio, tercerizado, proveedor, comentario) VALUES (?, ?, ?, ?, ?, ?)',
  )
  for (const exam of examenes) {
    stmt.run(ordenId, exam.examen_id, exam.precio, fromBoolean(exam.tercerizado), exam.proveedor, exam.comentario)
  }
}

export function createOrder(db: Database.Database, input: CreateOrderRequest): OrderWithExams {
  const resolved = resolveExamPrices(db, input.examenes)
  const total = computeTotal(resolved)
  const result = db
    .prepare(
      `INSERT INTO ordenes (paciente_id, medico_id, empresa_id, estatus, observaciones, precio_total, estatus_pago)
       VALUES (?, ?, ?, 'Pendiente', ?, ?, 'Pendiente')`,
    )
    .run(input.paciente_id, input.medico_id, input.empresa_id, input.observaciones, total)
  const id = Number(result.lastInsertRowid)
  insertOrderExams(db, id, resolved)
  const order = getOrder(db, id)
  if (!order) {
    throw new Error('Order was not created')
  }
  return order
}

export function updateOrder(db: Database.Database, input: UpdateOrderRequest): OrderWithExams {
  const existing = getOrder(db, input.id)
  if (!existing) {
    throw new Error('Order not found')
  }
  if (existing.cerrada) {
    throw new Error('Cannot edit a closed order')
  }
  const resolved = resolveExamPrices(db, input.examenes)
  const total = computeTotal(resolved)
  db.prepare(
    'UPDATE ordenes SET paciente_id = ?, medico_id = ?, empresa_id = ?, observaciones = ?, precio_total = ? WHERE id = ?',
  ).run(input.paciente_id, input.medico_id, input.empresa_id, input.observaciones, total, input.id)
  db.prepare('DELETE FROM orden_examenes WHERE orden_id = ?').run(input.id)
  insertOrderExams(db, input.id, resolved)
  const order = getOrder(db, input.id)
  if (!order) {
    throw new Error('Order not found after update')
  }
  return order
}

export function updateOrderStatus(db: Database.Database, id: number, estatus: Order['estatus']): OrderWithExams {
  db.prepare('UPDATE ordenes SET estatus = ? WHERE id = ?').run(estatus, id)
  const order = getOrder(db, id)
  if (!order) {
    throw new Error('Order not found after status update')
  }
  return order
}

export function setOrderAnulada(db: Database.Database, id: number, motivo: string): OrderWithExams {
  db.prepare("UPDATE ordenes SET anulada = 1, motivo_anulacion = ?, estatus = 'Pendiente' WHERE id = ?").run(motivo, id)
  const order = getOrder(db, id)
  if (!order) {
    throw new Error('Order not found after void')
  }
  return order
}

export function setOrderCerrada(db: Database.Database, id: number, cerrada = true): OrderWithExams {
  db.prepare('UPDATE ordenes SET cerrada = ? WHERE id = ?').run(fromBoolean(cerrada), id)
  const order = getOrder(db, id)
  if (!order) {
    throw new Error('Order not found after closing')
  }
  return order
}

export function setOrderCredito(db: Database.Database, id: number): OrderWithExams {
  db.prepare('UPDATE ordenes SET credito = 1 WHERE id = ?').run(id)
  const order = getOrder(db, id)
  if (!order) {
    throw new Error('Order not found after credit authorization')
  }
  return order
}
