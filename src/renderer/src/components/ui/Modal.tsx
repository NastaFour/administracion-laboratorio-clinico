import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  title: string
  children: React.ReactNode
  onClose?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, title, children, onClose, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Focus the dialog on open for accessibility
    dialogRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-modal overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={cn(
            'relative bg-white rounded-xl shadow-2xl w-full max-h-[85vh] flex flex-col text-left outline-none my-auto z-10',
            'dark:bg-surface-card dark:border dark:border-surface-border dark:text-ink-900',
            'animate-modal-in',
            size === 'sm' && 'max-w-sm',
            size === 'md' && 'max-w-lg',
            size === 'lg' && 'max-w-2xl',
            size === 'xl' && 'max-w-4xl',
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-surface-border shrink-0">
            <h3 id="modal-title" className="text-lg font-semibold text-ink-900 dark:text-ink-950">
              {title}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-ink-400 hover:text-ink-600 hover:bg-paper-100 dark:hover:bg-paper-200 dark:hover:text-ink-800 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ink-700 dark:text-ink-800">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
