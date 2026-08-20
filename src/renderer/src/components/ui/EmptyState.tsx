interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ size?: number }>
  action?: React.ReactNode
}

/**
 * Friendly empty-state placeholder (M11.4): shown whenever a view has no real
 * data — the dashboard/history never fabricates zeros pretending to be data.
 */
export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-paper-300 bg-paper-50 px-6 py-12 text-center"
      data-testid="empty-state"
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-400">
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-500">{description}</p>}
      {action}
    </div>
  )
}