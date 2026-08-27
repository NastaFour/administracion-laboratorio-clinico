import { Search, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import type { Exam } from '@/shared/contracts'

interface ExamListProps {
  exams: Exam[]
  searchQuery: string
  selectedExam: Exam | null
  onSearchChange: (value: string) => void
  onSelect: (exam: Exam) => void
  onEdit: (exam: Exam) => void
  onDeactivate: (exam: Exam) => void
  canManage?: boolean
}

export function ExamList({
  exams,
  searchQuery,
  selectedExam,
  onSearchChange,
  onSelect,
  onEdit,
  onDeactivate,
  canManage = true,
}: ExamListProps) {
  const filtered = exams.filter((exam) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      exam.codigo.toLowerCase().includes(q) ||
      exam.nombre.toLowerCase().includes(q) ||
      exam.categoria.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 z-10" size={18} />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por código, nombre o categoría…"
          inputClassName="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-paper-200 dark:border-surface-border bg-paper-50 dark:bg-surface-card p-8 text-center">
          <p className="text-ink-500 dark:text-ink-600">No se encontraron exámenes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 dark:bg-paper-100 text-ink-700 dark:text-ink-700 border-b border-paper-200 dark:border-surface-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Muestra</th>
                <th className="px-4 py-3 font-semibold text-right">Precio</th>
                {canManage && <th className="px-4 py-3 font-semibold text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 dark:divide-surface-border">
              {filtered.map((exam) => (
                <tr
                  key={exam.id}
                  className={cn(
                    'hover:bg-paper-50 dark:hover:bg-surface-hover transition-colors',
                    selectedExam?.id === exam.id && 'bg-primary-50 dark:bg-primary-100/30',
                  )}
                >
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-950">
                    <button
                      onClick={() => onSelect(exam)}
                      className="flex items-center gap-2 text-left"
                    >
                      {selectedExam?.id === exam.id ? (
                        <ChevronUp size={16} className="text-primary-600 dark:text-primary-400" />
                      ) : (
                        <ChevronDown size={16} className="text-ink-400" />
                      )}
                      {exam.codigo}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-700">
                    {exam.nombre}
                    {exam.tercerizado && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-warning-100 dark:bg-warning-100/30 px-2 py-0.5 text-xs font-medium text-warning-800 dark:text-warning-300">
                        Tercerizado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{exam.categoria}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-700">{exam.tipo_muestra}</td>
                  <td className="px-4 py-3 text-right font-variant-numeric tabular-nums text-ink-900 dark:text-ink-950 font-medium">
                    {exam.precio.toFixed(2)}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(exam)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivate(exam)}
                          aria-label="Desactivar"
                          title="Desactivar"
                        >
                          <Trash2 size={16} className="text-danger-600 dark:text-danger-400" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

