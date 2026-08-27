import { useCallback, useEffect, useState } from 'react'
import {
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  FileText,
  DollarSign,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Patient, PatientDossier } from '@/shared/contracts'

interface PatientDossierModalProps {
  patient: Patient | null
  open: boolean
  onClose: () => void
}

function formatMoney(value: number, currency: 'Bs' | 'USD' = 'Bs'): string {
  const n = value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'Bs' ? `Bs ${n}` : `$ ${n}`
}

const SEX_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
}

const METHOD_LABELS: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  punto: 'Punto',
  efectivo: 'Efectivo',
  mixto: 'Mixto',
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  en_proceso: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  completada: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  entregada: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  anulada: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
}

type DossierTab = 'ordenes' | 'resultados' | 'pagos'

export function PatientDossierModal({ patient, open, onClose }: PatientDossierModalProps) {
  const [loading, setLoading] = useState(true) // true by default — component is keyed per patient
  const [dossier, setDossier] = useState<PatientDossier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DossierTab>('ordenes')
  const [expandedOrden, setExpandedOrden] = useState<number | null>(null)

  const loadDossier = useCallback(async () => {
    if (!patient) return
    try {
      const result = await window.api.patients.dossier({ pacienteId: patient.id })
      if (!result.ok) {
        setError('No se pudo cargar la ficha del paciente.')
        return
      }
      setDossier(result.data)
    } catch {
      setError('No se pudo cargar la ficha del paciente.')
    } finally {
      setLoading(false)
    }
  }, [patient])

  useEffect(() => {
    if (!open || !patient) return
    void loadDossier()
  }, [open, patient, loadDossier])

  const handleDownloadPdf = async (ordenId: number) => {
    await window.api.reports.savePdf({ ordenId, copia: false })
  }

  if (!patient) return null

  const tabs: Array<{ id: DossierTab; label: string; icon: React.ReactNode }> = [
    { id: 'ordenes', label: 'Órdenes', icon: <FileText size={15} /> },
    { id: 'resultados', label: 'Resultados', icon: <FlaskConical size={15} /> },
    { id: 'pagos', label: 'Pagos', icon: <DollarSign size={15} /> },
  ]

  return (
    <Modal
      open={open}
      title={`Ficha del paciente — ${patient.nombre} ${patient.apellido}`}
      onClose={onClose}
      size="xl"
    >
      {loading && (
        <div className="p-8 text-center text-ink-500 dark:text-ink-600">Cargando ficha del paciente…</div>
      )}
      {error && (
        <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {dossier && (
        <div className="space-y-6">
          {/* Header — Patient Info */}
          <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-5">
            <div className="flex flex-wrap gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-2xl font-bold uppercase">
                {patient.nombre[0]}{patient.apellido[0]}
              </div>

              {/* Basic info */}
              <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                  <CreditCard size={14} className="text-ink-400 flex-shrink-0" />
                  <span className="font-mono font-medium">{dossier.paciente.cedula}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                  <User size={14} className="text-ink-400 flex-shrink-0" />
                  <span>{SEX_LABELS[dossier.paciente.sexo] ?? dossier.paciente.sexo}</span>
                  <span className="text-ink-500">· {dossier.paciente.edad} años</span>
                </div>
                {dossier.paciente.telefono && (
                  <div className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                    <Phone size={14} className="text-ink-400 flex-shrink-0" />
                    <span>{dossier.paciente.telefono}</span>
                  </div>
                )}
                {dossier.paciente.email && (
                  <div className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                    <Mail size={14} className="text-ink-400 flex-shrink-0" />
                    <span className="truncate">{dossier.paciente.email}</span>
                  </div>
                )}
                {dossier.paciente.direccion && (
                  <div className="flex items-center gap-2 text-ink-700 dark:text-ink-300 col-span-2">
                    <MapPin size={14} className="text-ink-400 flex-shrink-0" />
                    <span className="truncate">{dossier.paciente.direccion}</span>
                  </div>
                )}
              </div>

              {/* Active badge */}
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    dossier.paciente.activo
                      ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {dossier.paciente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* KPIs financieros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-600 mb-2">
                <TrendingUp size={14} className="text-primary-600" />
                Facturado
              </div>
              <p className="text-xl font-bold text-ink-900 dark:text-ink-950 tabular-nums" data-testid="dossier-facturado">
                {formatMoney(dossier.balance.facturado)}
              </p>
            </div>
            <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-600 mb-2">
                <CheckCircle2 size={14} className="text-success-600" />
                Pagado
              </div>
              <p className="text-xl font-bold text-success-700 dark:text-success-400 tabular-nums" data-testid="dossier-pagado">
                {formatMoney(dossier.balance.pagado)}
              </p>
            </div>
            <div className="rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-600 mb-2">
                <AlertCircle size={14} className={dossier.balance.saldo > 0 ? 'text-danger-600' : 'text-ink-400'} />
                Saldo
              </div>
              <p
                className={`text-xl font-bold tabular-nums ${
                  dossier.balance.saldo > 0
                    ? 'text-danger-700 dark:text-danger-400'
                    : 'text-ink-900 dark:text-ink-950'
                }`}
                data-testid="dossier-saldo"
              >
                {formatMoney(dossier.balance.saldo)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b border-paper-200 dark:border-surface-border mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                      : 'border-transparent text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className="ml-1 text-xs text-ink-400 dark:text-ink-600">
                    ({activeTab === 'ordenes'
                      ? dossier.ordenes.length
                      : activeTab === 'resultados'
                      ? dossier.resultados.length
                      : dossier.pagos.length})
                  </span>
                </button>
              ))}
            </div>

            {/* ── Órdenes Tab ─────────────────────────────────────────── */}
            {activeTab === 'ordenes' && (
              <div className="space-y-2">
                {dossier.ordenes.length === 0 ? (
                  <p className="text-center text-ink-500 dark:text-ink-600 py-8">No hay órdenes registradas.</p>
                ) : (
                  dossier.ordenes.map((orden) => (
                    <div
                      key={orden.orden_id}
                      className="rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedOrden((prev) => (prev === orden.orden_id ? null : orden.orden_id))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-mono font-semibold text-ink-900 dark:text-ink-950">
                            #{orden.orden_id}
                          </span>
                          <span className="text-ink-500 dark:text-ink-600">{orden.fecha_solicitud}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[orden.estatus] ?? 'bg-ink-100 text-ink-700'
                            }`}
                          >
                            {orden.estatus}
                          </span>
                          <span className="text-ink-600 dark:text-ink-400 tabular-nums">
                            {formatMoney(orden.precio_total)}
                          </span>
                          {orden.saldo > 0 && (
                            <span className="text-danger-600 dark:text-danger-400 text-xs font-medium">
                              Debe: {formatMoney(orden.saldo)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDownloadPdf(orden.orden_id)
                            }}
                            title="Descargar PDF"
                            className="h-7 px-2"
                            data-testid={`dossier-pdf-${orden.orden_id}`}
                          >
                            <Download size={14} />
                          </Button>
                          {expandedOrden === orden.orden_id ? (
                            <ChevronDown size={16} className="text-ink-400" />
                          ) : (
                            <ChevronRight size={16} className="text-ink-400" />
                          )}
                        </div>
                      </button>

                      {expandedOrden === orden.orden_id && (
                        <div className="px-4 pb-4 border-t border-paper-200 dark:border-surface-border pt-3">
                          <p className="text-xs font-semibold text-ink-500 dark:text-ink-600 uppercase mb-2">Exámenes</p>
                          <ul className="flex flex-wrap gap-1.5">
                            {orden.examenes.map((ex) => (
                              <li
                                key={ex.examen_id}
                                className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
                              >
                                {ex.examen_nombre}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Resultados Tab ──────────────────────────────────────── */}
            {activeTab === 'resultados' && (
              <div>
                {dossier.resultados.length === 0 ? (
                  <p className="text-center text-ink-500 dark:text-ink-600 py-8">No hay resultados registrados.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card">
                    <table className="w-full text-sm">
                      <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 text-xs uppercase border-b border-paper-200 dark:border-surface-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-left">Orden</th>
                          <th className="px-4 py-3 font-semibold text-left">Examen</th>
                          <th className="px-4 py-3 font-semibold text-left">Parámetro</th>
                          <th className="px-4 py-3 font-semibold text-right">Valor</th>
                          <th className="px-4 py-3 font-semibold text-left">Unidad</th>
                          <th className="px-4 py-3 font-semibold text-center">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
                        {dossier.resultados.map((r, idx) => (
                          <tr key={idx} className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors">
                            <td className="px-4 py-2 font-mono text-xs text-ink-600 dark:text-ink-400">
                              #{r.orden_id}
                            </td>
                            <td className="px-4 py-2 text-ink-900 dark:text-ink-950">{r.examen_nombre}</td>
                            <td className="px-4 py-2 text-ink-700 dark:text-ink-300">{r.parametro_nombre}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium text-ink-900 dark:text-ink-950">
                              {r.valor ?? '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-ink-500 dark:text-ink-600">{r.unidad ?? ''}</td>
                            <td className="px-4 py-2 text-center">
                              {r.flag ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400">
                                  {r.flag}
                                </span>
                              ) : (
                                <span className="text-ink-300 dark:text-ink-700">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Pagos Tab ───────────────────────────────────────────── */}
            {activeTab === 'pagos' && (
              <div>
                {dossier.pagos.length === 0 ? (
                  <p className="text-center text-ink-500 dark:text-ink-600 py-8">No hay pagos registrados.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card">
                    <table className="w-full text-sm">
                      <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 text-xs uppercase border-b border-paper-200 dark:border-surface-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-left">Fecha</th>
                          <th className="px-4 py-3 font-semibold text-left">Orden</th>
                          <th className="px-4 py-3 font-semibold text-left">Método</th>
                          <th className="px-4 py-3 font-semibold text-right">Monto Bs</th>
                          <th className="px-4 py-3 font-semibold text-right">Monto USD</th>
                          <th className="px-4 py-3 font-semibold text-left">Cajero</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
                        {dossier.pagos.map((pago) => (
                          <tr key={pago.id} className="hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors">
                            <td className="px-4 py-2 font-mono text-xs text-ink-600 dark:text-ink-400">{pago.fecha}</td>
                            <td className="px-4 py-2 font-mono text-xs text-ink-600 dark:text-ink-400">
                              #{pago.orden_id}
                            </td>
                            <td className="px-4 py-2 text-ink-700 dark:text-ink-300">
                              {METHOD_LABELS[pago.metodo] ?? pago.metodo}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-ink-900 dark:text-ink-950">
                              {formatMoney(pago.monto_bs)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-ink-600 dark:text-ink-400">
                              {pago.monto_usd > 0 ? formatMoney(pago.monto_usd, 'USD') : '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-ink-700 dark:text-ink-300">{pago.cajero}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
