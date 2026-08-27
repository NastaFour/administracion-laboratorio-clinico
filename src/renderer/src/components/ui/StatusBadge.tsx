import { Badge } from './Badge'
import { ORDER_STATUS } from '@/shared/contracts'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case ORDER_STATUS.PENDIENTE:
    case 'Pendiente':
      return (
        <Badge variant="warning" className={className}>
          {status}
        </Badge>
      )
    case ORDER_STATUS.PROCESANDO:
    case 'Procesando':
    case 'Recolectada':
    case 'RECOLECTADA':
      return (
        <Badge variant="primary" className={className}>
          {status}
        </Badge>
      )
    case ORDER_STATUS.COMPLETADA:
    case 'Completada':
    case 'Validado':
    case 'VALIDADO':
    case 'Recibida':
    case 'RECIBIDA':
      return (
        <Badge variant="success" className={className}>
          {status}
        </Badge>
      )
    case ORDER_STATUS.ENTREGADA:
    case 'Entregada':
      return (
        <Badge variant="default" className={className}>
          {status}
        </Badge>
      )
    case 'Anulada':
    case 'ANULADA':
    case 'Rechazada':
    case 'RECHAZADA':
    case 'CRÍTICO':
      return (
        <Badge variant="danger" className={className}>
          {status}
        </Badge>
      )
    default:
      return (
        <Badge variant="default" className={className}>
          {status}
        </Badge>
      )
  }
}
