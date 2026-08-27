import { cn } from '../../lib/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  selectClassName?: string
}

export function Select({
  label,
  error,
  className,
  selectClassName,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-700 dark:text-ink-800">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-md border px-3 py-2 text-ink-900 bg-white transition-colors duration-150',
          'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          'dark:bg-surface-card dark:text-ink-900 dark:border-paper-300 dark:focus:border-primary-400',
          error ? 'border-danger-500 dark:border-danger-500' : 'border-paper-300',
          selectClassName,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-danger-600 dark:text-danger-500">{error}</p>}
    </div>
  )
}
