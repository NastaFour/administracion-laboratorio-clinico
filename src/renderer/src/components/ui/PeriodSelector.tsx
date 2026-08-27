import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  type PeriodRange,
  type PeriodType,
  getPeriodRange,
  shiftAnchorDate,
  todayLocalDateIso,
} from '../../lib/dates'
import { Button } from './Button'

export interface PeriodSelectorProps {
  value?: PeriodRange
  anchorDate?: Date
  onChange: (range: PeriodRange, anchorDate: Date) => void
  className?: string
}

export function PeriodSelector({
  value,
  anchorDate: externalAnchorDate,
  onChange,
  className,
}: PeriodSelectorProps) {
  const [internalAnchor, setInternalAnchor] = useState<Date>(() => new Date())
  const [internalType, setInternalType] = useState<PeriodType>(() => value?.tipo ?? 'dia')

  const activeAnchor = externalAnchorDate ?? internalAnchor
  const activeType = value?.tipo ?? internalType
  const currentRange = value ?? getPeriodRange(activeType, activeAnchor)

  const isCurrentToday = todayLocalDateIso(activeAnchor) === todayLocalDateIso(new Date())

  const handleTypeChange = (newType: PeriodType) => {
    setInternalType(newType)
    const newRange = getPeriodRange(newType, activeAnchor)
    onChange(newRange, activeAnchor)
  }

  const handleShift = (direction: -1 | 1) => {
    const nextAnchor = shiftAnchorDate(activeType, activeAnchor, direction)
    setInternalAnchor(nextAnchor)
    const newRange = getPeriodRange(activeType, nextAnchor)
    onChange(newRange, nextAnchor)
  }

  const handleResetToday = () => {
    const today = new Date()
    setInternalAnchor(today)
    const newRange = getPeriodRange(activeType, today)
    onChange(newRange, today)
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card px-4 py-2.5 shadow-xs transition-colors',
        className,
      )}
      role="region"
      aria-label="Selector de período"
    >
      {/* Segmented Period Type Buttons */}
      <div className="flex items-center rounded-md bg-paper-100 dark:bg-paper-100/50 p-0.5" role="group">
        {(['dia', 'semana', 'mes', 'anio'] as const).map((tipo) => {
          const labels: Record<PeriodType, string> = {
            dia: 'Día',
            semana: 'Semana',
            mes: 'Mes',
            anio: 'Año',
          }
          const isSelected = activeType === tipo
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => handleTypeChange(tipo)}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium transition-all',
                isSelected
                  ? 'bg-white dark:bg-surface-card text-ink-900 dark:text-ink-950 shadow-xs'
                  : 'text-ink-500 dark:text-ink-600 hover:text-ink-900 dark:hover:text-ink-900',
              )}
              aria-pressed={isSelected}
            >
              {labels[tipo]}
            </button>
          )
        })}
      </div>

      {/* Navigator: Prev, Label, Next */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleShift(-1)}
          aria-label="Período anterior"
          title="Período anterior"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="flex items-center gap-1.5 min-w-[170px] justify-center text-center">
          <Calendar size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
          <span className="text-sm font-semibold text-ink-900 dark:text-ink-950 select-none">
            {currentRange.label}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleShift(1)}
          aria-label="Período siguiente"
          title="Período siguiente"
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={16} />
        </Button>

        {!isCurrentToday && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetToday}
            className="text-xs h-7 px-2 ml-1"
          >
            Hoy
          </Button>
        )}
      </div>
    </div>
  )
}
