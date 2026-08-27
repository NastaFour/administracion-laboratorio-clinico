import { cn } from '../../lib/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'active:scale-[0.98] select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        size === 'sm' && 'px-3 py-1.5 text-sm gap-1.5',
        size === 'md' && 'px-4 py-2 text-sm gap-2',
        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
        variant === 'secondary' &&
          'bg-white text-ink-700 border border-paper-300 hover:bg-paper-50 hover:text-ink-900 active:bg-paper-100 dark:bg-surface-card dark:text-ink-800 dark:border-paper-300 dark:hover:bg-surface-hover',
        variant === 'danger' && 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm',
        variant === 'ghost' &&
          'bg-transparent text-ink-600 hover:bg-paper-100 hover:text-ink-900 dark:text-ink-700 dark:hover:bg-paper-200 dark:hover:text-ink-900',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
