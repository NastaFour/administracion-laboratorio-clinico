import type { Balance, OrderWithExams } from '@/shared/contracts'

export interface HistoryRow {
  orden: OrderWithExams
  balance: Balance
  pacienteNombre: string
  pacienteCedula: string
}

/**
 * Real payment state derived from the live balance (WU11): an authorized
 * credit order with an open balance is "Crédito", not a silent default.
 */
export function paymentStateLabel(saldoBs: number, credito: boolean): 'Pagado' | 'Pendiente' | 'Crédito' {
  if (saldoBs <= 0) return 'Pagado'
  return credito ? 'Crédito' : 'Pendiente'
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Client-side CSV of the currently filtered history rows (M10.3 re-export of
 * the list). UTF-8 BOM so Excel opens the es-VE text correctly.
 */
export function buildHistoryCsv(rows: HistoryRow[], examNames: Map<number, string>): string {
  const header = ['ID', 'Fecha', 'Paciente', 'Cédula', 'Estatus', 'Exámenes', 'Total Bs', 'Pagado Bs', 'Saldo Bs', 'Estado de pago']
  const lines = rows.map(({ orden, balance, pacienteNombre, pacienteCedula }) => {
    const exams = orden.examenes.map((exam) => examNames.get(exam.examen_id) ?? `#${exam.examen_id}`).join(' / ')
    return [
      orden.id,
      orden.fecha,
      pacienteNombre,
      pacienteCedula,
      orden.estatus,
      exams,
      orden.total_bs,
      balance.pagado_bs,
      balance.saldo_bs,
      paymentStateLabel(balance.saldo_bs, orden.credito),
    ]
      .map(csvCell)
      .join(',')
  })
  return `\uFEFF${header.map(csvCell).join(',')}\n${lines.join('\n')}`
}