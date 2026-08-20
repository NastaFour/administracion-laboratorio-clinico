import { useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import type { Sample } from '@/shared/contracts'

interface LabelProps {
  open: boolean
  sample: Sample | null
  html: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function Label({ open, sample, html, loading, error, onClose }: LabelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handlePrint = () => {
    // Print through a same-origin srcdoc iframe instead of window.open, which is
    // unavailable in the sandboxed renderer (sandbox: true, no window open handler).
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  return (
    <Modal open={open} title={`Etiqueta - ${sample?.codigo ?? ''}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        {loading && <p className="text-ink-500 text-sm">Generando etiqueta…</p>}
        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}
        {html && (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={html}
              title={`Etiqueta ${sample?.codigo ?? ''}`}
              className="absolute h-0 w-0 border-0"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div
              className="rounded border border-paper-200 bg-white p-2 text-xs"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="button" onClick={handlePrint}>
                Imprimir
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
