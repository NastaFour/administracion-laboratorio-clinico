import React from 'react'
import { cn } from '../../lib/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'outline'
  size?: 'sm' | 'md'
}

export function Badge({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full transition-colors',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        variant === 'default' &&
          'bg-paper-100 text-ink-700 dark:bg-paper-200 dark:text-ink-800 border border-paper-200 dark:border-surface-border',
        variant === 'primary' &&
          'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-100/30 dark:text-primary-400 dark:border-primary-200/20',
        variant === 'success' &&
          'bg-success-50 text-success-700 border border-success-100 dark:bg-success-100/30 dark:text-success-500 dark:border-success-200/20',
        variant === 'warning' &&
          'bg-warning-50 text-warning-700 border border-warning-100 dark:bg-warning-100/30 dark:text-warning-500 dark:border-warning-200/20',
        variant === 'danger' &&
          'bg-danger-50 text-danger-700 border border-danger-100 dark:bg-danger-100/30 dark:text-danger-400 dark:border-danger-200/20',
        variant === 'accent' &&
          'bg-accent-100 text-accent-800 border border-accent-200 dark:bg-accent-100/30 dark:text-accent-400 dark:border-accent-200/20',
        variant === 'outline' &&
          'bg-transparent text-ink-700 border border-paper-300 dark:text-ink-800 dark:border-surface-border',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
