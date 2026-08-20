import { useCallback, useEffect, useState } from 'react'
import type { CaptureResultRequest, ParamForCapture } from '@/shared/contracts'

/**
 * Load the capture parameters (with the main-computed band and any existing
 * result snapshot) for one exam in an order. Refetch after every capture /
 * validation action so the screen shows the authoritative state.
 */
export function useParamsForCapture(ordenExamenId: number | null) {
  const [params, setParams] = useState<ParamForCapture[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (ordenExamenId === null) {
      setParams([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.results.paramsForCapture({ ordenExamenId })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setParams(result.data)
    } finally {
      setLoading(false)
    }
  }, [ordenExamenId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { params, loading, error, refetch: fetch }
}

/**
 * Thin wrappers around the results IPC mutations. Each returns a discriminated
 * result so callers can branch without throwing; errors are also surfaced via
 * `error` for inline display.
 */
export function useResultActions() {
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback(async (req: CaptureResultRequest) => {
    const result = await window.api.results.capture(req)
    if (!result.ok) {
      const message = mapError(result.error.code)
      setError(message)
      return { ok: false as const, error: message }
    }
    return { ok: true as const, result: result.data }
  }, [])

  const validate = useCallback(async (id: number) => {
    const result = await window.api.results.validate({ id })
    if (!result.ok) {
      const message = mapError(result.error.code)
      setError(message)
      return { ok: false as const, error: message }
    }
    return { ok: true as const, result: result.data }
  }, [])

  const reject = useCallback(async (id: number, motivo: string) => {
    const result = await window.api.results.reject({ id, motivo })
    if (!result.ok) {
      const message = mapError(result.error.code)
      setError(message)
      return { ok: false as const, error: message }
    }
    return { ok: true as const, result: result.data }
  }, [])

  const reopen = useCallback(async (id: number, motivo: string) => {
    const result = await window.api.results.reopen({ id, motivo })
    if (!result.ok) {
      const message = mapError(result.error.code)
      setError(message)
      return { ok: false as const, error: message }
    }
    return { ok: true as const, result: result.data }
  }, [])

  return { error, setError, capture, validate, reject, reopen }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El registro solicitado no existe.',
    DUPLICATE: 'Ya existe un registro con esos datos.',
    CONFLICT: 'El resultado no permite esta acción en su estado actual.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
