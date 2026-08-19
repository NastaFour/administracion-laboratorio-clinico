import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { Patient } from '@/shared/contracts'

interface PatientHistoryOrder {
  orden_id: number
  estatus: string
  estatus_pago: string
  precio_total: number
  fecha_solicitud: string
  examenes: Array<{ examen_id: number; examen_nombre: string }>
}

interface PatientHistoryProps {
  patient: Patient | null
  open: boolean
  onClose: () => void
}

export function PatientHistory({ patient, open, onClose }: PatientHistoryProps) {
  const [orders, setOrders] = useState<PatientHistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !patient) return

    window.api.patients
      .history({ id: patient.id })
      .then((result) => {
        if (!result.ok) {
          setError('No se pudo cargar el historial.')
          return
        }
        setOrders(result.data as PatientHistoryOrder[])
      })
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setLoading(false))
  }, [open, patient])

  return (
    <Modal open={open} title={`Historial: ${patient?.nombre} ${patient?.apellido}`} onClose={onClose} size="md">
      <div className="space-y-4">
        {loading && <p className="text-ink-500">Cargando historial…</p>}
        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm">{error}</div>
        )}
        {!loading && !error && orders.length === 0 && (
          <p className="text-ink-500">No hay órdenes registradas para este paciente.</p>
        )}
        {!loading &&
          orders.map((order) => (
            <div key={order.orden_id} className="border border-paper-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-ink-900">Orden #{order.orden_id}</span>
                <span className="text-sm text-ink-500">{order.fecha_solicitud}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-ink-500">Estatus:</span>{' '}
                  <span className="font-medium text-primary-700">{order.estatus}</span>
                </div>
                <div>
                  <span className="text-ink-500">Pago:</span>{' '}
                  <span className="font-medium">{order.estatus_pago}</span>
                </div>
                <div>
                  <span className="text-ink-500">Total:</span>{' '}
                  <span className="font-medium">Bs {order.precio_total.toFixed(2)}</span>
                </div>
              </div>
              {order.examenes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-500 uppercase mb-1">Exámenes</p>
                  <ul className="text-sm text-ink-700 list-disc list-inside">
                    {order.examenes.map((exam) => (
                      <li key={exam.examen_id}>{exam.examen_nombre}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
      </div>
    </Modal>
  )
}
