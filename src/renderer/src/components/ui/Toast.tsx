import { useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ToastContext } from './ToastContext'
import type { ToastItem } from './ToastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (options: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const duration = options.duration ?? 3500
      const newItem: ToastItem = { ...options, id, duration }

      setToasts((prev) => [...prev, newItem])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast],
  )

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', message, title }), [addToast])
  const error = useCallback((message: string, title?: string) => addToast({ type: 'error', message, title }), [addToast])
  const warning = useCallback((message: string, title?: string) => addToast({ type: 'warning', message, title }), [addToast])
  const info = useCallback((message: string, title?: string) => addToast({ type: 'info', message, title }), [addToast])

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-sm animate-toast-in transition-all',
              t.type === 'success' &&
                'bg-white text-ink-900 border-success-500/30 dark:bg-surface-card dark:text-ink-900',
              t.type === 'error' &&
                'bg-white text-ink-900 border-danger-500/30 dark:bg-surface-card dark:text-ink-900',
              t.type === 'warning' &&
                'bg-white text-ink-900 border-warning-500/30 dark:bg-surface-card dark:text-ink-900',
              t.type === 'info' &&
                'bg-white text-ink-900 border-primary-500/30 dark:bg-surface-card dark:text-ink-900',
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-success-500" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-danger-500" />}
              {t.type === 'warning' && <AlertTriangle size={18} className="text-warning-500" />}
              {t.type === 'info' && <Info size={18} className="text-primary-500" />}
            </div>
            <div className="flex-1 space-y-0.5">
              {t.title && <p className="font-semibold text-xs text-ink-900 dark:text-ink-950">{t.title}</p>}
              <p className="text-xs text-ink-600 dark:text-ink-700">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-ink-400 hover:text-ink-600 dark:hover:text-ink-700 p-0.5 rounded"
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
