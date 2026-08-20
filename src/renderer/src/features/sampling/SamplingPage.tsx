import { useState } from 'react'
import { Search, TestTube } from 'lucide-react'
import { useOrders } from '../orders/useOrders'
import { useSamples } from './useSamples'
import { SampleList } from './SampleList'
import { Register } from './Register'
import { Status } from './Status'
import { Reject } from './Reject'
import { Label } from './Label'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import type { OrderWithExams, Sample, SampleStatus } from '@/shared/contracts'

export function SamplingPage() {
  const { orders, loading: ordersLoading } = useOrders({ estatus: 'Pendiente' })
  const [selectedOrder, setSelectedOrder] = useState<OrderWithExams | null>(null)
  const { samples, loading: samplesLoading, error, register, updateStatus, reject, label } = useSamples(
    selectedOrder?.id ?? null,
  )

  const [registerOpen, setRegisterOpen] = useState(false)
  const [statusSample, setStatusSample] = useState<Sample | null>(null)
  const [rejectSample, setRejectSample] = useState<Sample | null>(null)
  const [labelSample, setLabelSample] = useState<Sample | null>(null)
  const [labelHtml, setLabelHtml] = useState<string | null>(null)
  const [labelLoading, setLabelLoading] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)

  const handleRegister = async (recoleccion_en?: string) => {
    const result = await register(recoleccion_en)
    if (!result.ok) return { ok: false, error: result.error }
    setRegisterOpen(false)
    return { ok: true }
  }

  const handleUpdateStatus = async (id: number, estatus: SampleStatus, recoleccion_en?: string) => {
    const result = await updateStatus(id, estatus, recoleccion_en)
    return result
  }

  const handleReject = async (id: number, motivo: string) => {
    const result = await reject(id, motivo)
    return result
  }

  const openLabel = async (sample: Sample) => {
    setLabelSample(sample)
    setLabelHtml(null)
    setLabelError(null)
    setLabelLoading(true)
    const result = await label(sample.id)
    setLabelLoading(false)
    if (!result.ok) {
      setLabelError(result.error ?? 'No se pudo generar la etiqueta.')
      return
    }
    setLabelHtml(result.html ?? null)
  }

  const closeLabel = () => {
    setLabelSample(null)
    setLabelHtml(null)
    setLabelError(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="sampling-heading">
          Muestras
        </h2>
        <p className="text-sm text-ink-500">Registre y gestione muestras por orden.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-paper-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <Search size={16} />
              Órdenes pendientes
            </h3>
            {ordersLoading && <p className="text-ink-500 text-sm">Cargando órdenes…</p>}
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order)
                    setRegisterOpen(false)
                  }}
                  className={cn(
                    'w-full text-left rounded-md border px-3 py-2 transition-colors',
                    selectedOrder?.id === order.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-paper-200 hover:bg-paper-50',
                  )}
                >
                  <p className="text-sm font-medium text-ink-900">Orden #{order.id}</p>
                  <p className="text-xs text-ink-500">{order.examenes.length} exámenes</p>
                </button>
              ))}
              {!ordersLoading && orders.length === 0 && (
                <p className="text-sm text-ink-500">No hay órdenes pendientes.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-ink-900">Orden #{selectedOrder.id}</h3>
                  <p className="text-sm text-ink-500">{selectedOrder.examenes.length} exámenes solicitados</p>
                </div>
                {samples.length === 0 && (
                  <Button onClick={() => setRegisterOpen(true)}>
                    <TestTube size={18} className="mr-2" />
                    Registrar muestras
                  </Button>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
                  {error}
                </div>
              )}

              {samplesLoading && <p className="text-ink-500">Cargando muestras…</p>}

              <SampleList
                samples={samples}
                onUpdateStatus={setStatusSample}
                onReject={setRejectSample}
                onLabel={openLabel}
              />

              <Register
                open={registerOpen}
                ordenId={selectedOrder.id}
                onClose={() => setRegisterOpen(false)}
                onRegister={handleRegister}
              />

              <Status
                open={!!statusSample}
                sample={statusSample}
                onClose={() => setStatusSample(null)}
                onUpdate={handleUpdateStatus}
              />

              <Reject
                open={!!rejectSample}
                sample={rejectSample}
                onClose={() => setRejectSample(null)}
                onReject={handleReject}
              />

              <Label
                open={!!labelSample}
                sample={labelSample}
                html={labelHtml}
                loading={labelLoading}
                error={labelError}
                onClose={closeLabel}
              />
            </>
          ) : (
            <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
              <p className="text-ink-500">Seleccione una orden para ver sus muestras.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
