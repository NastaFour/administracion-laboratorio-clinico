import type Database from 'better-sqlite3'
import { dashboardChannels, ROLES, type DebtorBucket, type PatientAnalyte, type Stats, type TodayKpi, type Trend } from '@/shared/contracts'
import { handle } from './register'
import { getDebtors, getStats, getTodayKpis, getTrends, listPatientAnalytes } from '../services/dashboard'

// Role matrix (design): print/preview/history/dashboard are available to every role.
const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.BIOANALISTA, ROLES.TECNICO, ROLES.RECEPCION]

export function handleDashboardToday(db: Database.Database, req: { fecha?: string }): TodayKpi {
  return getTodayKpis(db, req.fecha)
}

export function handleDashboardDebtors(db: Database.Database, req: { fechaCorte?: string }): DebtorBucket[] {
  return getDebtors(db, req.fechaCorte)
}

export function handleDashboardStats(db: Database.Database, req: { desde: string; hasta: string }): Stats {
  return getStats(db, req.desde, req.hasta)
}

export function handleDashboardTrends(db: Database.Database, req: { pacienteId: number; parametroId: number }): Trend {
  return getTrends(db, req.pacienteId, req.parametroId)
}

export function handleDashboardPatientAnalytes(db: Database.Database, req: { pacienteId: number }): PatientAnalyte[] {
  return listPatientAnalytes(db, req.pacienteId)
}

export function registerDashboardHandlers(db: Database.Database): void {
  handle(db, 'dashboard:today', DASHBOARD_ROLES, dashboardChannels['dashboard:today'].request, handleDashboardToday)
  handle(db, 'dashboard:debtors', DASHBOARD_ROLES, dashboardChannels['dashboard:debtors'].request, handleDashboardDebtors)
  handle(db, 'dashboard:stats', DASHBOARD_ROLES, dashboardChannels['dashboard:stats'].request, handleDashboardStats)
  handle(db, 'dashboard:trends', DASHBOARD_ROLES, dashboardChannels['dashboard:trends'].request, handleDashboardTrends)
  handle(db, 'dashboard:patientAnalytes', DASHBOARD_ROLES, dashboardChannels['dashboard:patientAnalytes'].request, handleDashboardPatientAnalytes)
}