import React, { createContext, useContext, useId } from 'react'
import { cn } from '../../lib/cn'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}

export function Tabs({ value, onValueChange, className, children }: TabsProps) {
  const baseId = useId()
  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>

export function TabsList({ className, children, ...props }: TabsListProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsList must be used within Tabs')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    )
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement)
    if (currentIndex === -1) return

    let nextIndex = currentIndex
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }

    e.preventDefault()
    tabs[nextIndex]?.focus()
    const nextValue = tabs[nextIndex]?.getAttribute('data-value')
    if (nextValue) {
      ctx.onValueChange(nextValue)
    }
  }

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-paper-100 dark:bg-surface-card p-1 text-ink-600 dark:text-ink-700 border border-paper-200 dark:border-surface-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = ctx.value === value
  const tabId = `${ctx.baseId}-tab-${value}`
  const panelId = `${ctx.baseId}-panel-${value}`

  return (
    <button
      role="tab"
      id={tabId}
      data-value={value}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white dark:bg-surface-hover text-ink-900 dark:text-ink-950 shadow-xs font-semibold'
          : 'hover:text-ink-900 dark:hover:text-ink-900 hover:bg-paper-200/50 dark:hover:bg-surface-hover/50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used within Tabs')

  if (ctx.value !== value) return null

  const tabId = `${ctx.baseId}-tab-${value}`
  const panelId = `${ctx.baseId}-panel-${value}`

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={cn('focus-visible:outline-none animate-fade-in', className)}
      {...props}
    >
      {children}
    </div>
  )
}
