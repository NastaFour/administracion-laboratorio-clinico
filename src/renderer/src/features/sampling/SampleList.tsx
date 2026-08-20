import { Edit3, Printer, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Sample } from '@/shared/contracts'
import { SAMPLE_STATUS } from '@/shared/contracts'

interface SampleListProps {
  samples: Sample[]
  onUpdateStatus: (sample: Sample) => void
  onReject: (sample: Sample) => void
  onLabel: (sample: Sample) => void
}

function statusPill(estatus: string): string {
  switch (estatus) {
    case SAMPLE_STATUS.RECOLECTADA:
      return 'bg-amber-100 text-amber-800'
    case SAMPLE_STATUS.EN_PROCESO:
      return 'bg-primary-100 text-primary-800'
    case SAMPLE_STATUS.RESULTADA:
      return 'bg-success-50 text-success-700'
    case SAMPLE_STATUS.RECHAZADA:
      return 'bg-danger-100 text-danger-700'
    default:
      return 'bg-paper-100 text-ink-700'
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function SampleList({ samples, onUpdateStatus, onReject, onLabel }: SampleListProps) {
  if (samples.length === 0) {
    return (
      <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center">
        <p className="text-ink-500">No hay muestras registradas para esta orden.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-paper-100 text-ink-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Código</th>
            <th className="px-4 py-3 text-left font-medium">Tipo de muestra</th>
            <th className="px-4 py-3 text-left font-medium">Recolección</th>
            <th className="px-4 py-3 text-left font-medium">Estatus</th>
            <th className="px-4 py-3 text-left font-medium">Motivo rechazo</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-100">
          {samples.map((sample) => (
            <tr key={sample.id} className={cn('hover:bg-paper-50', sample.estatus === 'Rechazada' && 'opacity-60')}>
              <td className="px-4 py-3 text-ink-900 font-medium">{sample.codigo}</td>
              <td className="px-4 py-3 text-ink-600">{sample.tipo_muestra}</td>
              <td className="px-4 py-3 text-ink-600">{formatDate(sample.recoleccion_en)}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusPill(sample.estatus))}>
                  {sample.estatus}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-600">{sample.motivo_rechazo ?? '—'}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-2">
                  <button
                    onClick={() => onUpdateStatus(sample)}
                    className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    aria-label={`Cambiar estatus de ${sample.codigo}`}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => onLabel(sample)}
                    className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    aria-label={`Imprimir etiqueta de ${sample.codigo}`}
                  >
                    <Printer size={16} />
                  </button>
                  {sample.estatus !== 'Rechazada' && (
                    <button
                      onClick={() => onReject(sample)}
                      className="p-1.5 text-ink-500 hover:text-danger-600 hover:bg-danger-50 rounded-md transition-colors"
                      aria-label={`Rechazar ${sample.codigo}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
