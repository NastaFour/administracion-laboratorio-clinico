import React from 'react'
import { cn } from '../../lib/cn'

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-paper-200 bg-white dark:bg-surface-card dark:border-surface-border transition-colors">
      <table className={cn('w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-paper-100 text-ink-700 dark:bg-paper-200 dark:text-ink-800 border-b border-paper-200 dark:border-surface-border',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        'divide-y divide-paper-100 dark:divide-surface-border',
        className,
      )}
      {...props}
    >
      {children}
    </tbody>
  )
}

export function TableRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-100 hover:bg-paper-50 dark:hover:bg-surface-hover/60',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-ink-600 dark:text-ink-700',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-ink-900 dark:text-ink-800 align-middle',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

export function TableActionCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-right align-middle whitespace-nowrap',
        className,
      )}
      {...props}
    >
      <div className="inline-flex items-center justify-end gap-1.5">{children}</div>
    </td>
  )
}
