import { Edit, Trash2, PlusCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { RESULT_TYPE } from '@/shared/contracts'
import type { Parameter } from '@/shared/contracts'

interface ParamListProps {
  params: Parameter[]
  canManage: boolean
  onAdd: () => void
  onEdit: (param: Parameter) => void
  onDeactivate: (param: Parameter) => void
}

export function ParamList({ params, canManage, onAdd, onEdit, onDeactivate }: ParamListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink-900">Parámetros</h3>
        {canManage && (
          <Button size="sm" onClick={onAdd}>
            <PlusCircle size={16} className="mr-2" />
            Agregar parámetro
          </Button>
        )}
      </div>

      {params.length === 0 ? (
        <div className="rounded-lg border border-paper-200 bg-paper-50 p-6 text-center">
          <p className="text-ink-500">Este examen no tiene parámetros configurados.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 text-ink-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Orden</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Unidad</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {params.map((param) => (
                <tr key={param.id} className="hover:bg-paper-50">
                  <td className="px-4 py-3 text-ink-600">{param.orden}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{param.nombre}</td>
                  <td className="px-4 py-3 text-ink-600">{param.unidad ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {param.tipo_resultado === RESULT_TYPE.CUALITATIVO
                      ? `Cualitativo (${param.opciones_cualitativas?.join(', ') ?? ''})`
                      : 'Numérico'}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(param)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivate(param)}
                          aria-label="Desactivar"
                          title="Desactivar"
                        >
                          <Trash2 size={16} className="text-danger-600" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
