import { useCallback, useEffect, useState } from 'react'
import type { Balance, BcvRate, Payment, RecordPaymentRequest } from '@/shared/contracts'

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'El registro solicitado no existe.',
    DUPLICATE: 'Ya existe un registro con esos datos.',
    CONFLICT: 'La operación no está permitida en este estado.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
    MISSING_BCV_RATE: 'Debe configurar la tasa BCV antes de registrar un pago en USD.',
    PENDING_BALANCE: 'La orden tiene un saldo pendiente y no puede entregarse.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

export { mapError as mapPaymentError }

/** Load the payments and live balance for one order. */
export function usePaymentsForOrder(ordenId: number | null) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (ordenId === null) {
      setPayments([])
      setBalance(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [paymentsResult, balanceResult] = await Promise.all([
        window.api.payments.listForOrder({ ordenId }),
        window.api.payments.balance({ ordenId }),
      ])
      if (!paymentsResult.ok) {
        setError(mapError(paymentsResult.error.code))
        return
      }
      if (!balanceResult.ok) {
        setError(mapError(balanceResult.error.code))
        return
      }
      setPayments(paymentsResult.data)
      setBalance(balanceResult.data)
    } finally {
      setLoading(false)
    }
  }, [ordenId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const record = useCallback(
    async (req: RecordPaymentRequest) => {
      const result = await window.api.payments.record(req)
      if (!result.ok) {
        return { ok: false as const, error: mapError(result.error.code) }
      }
      await fetch()
      return { ok: true as const, payment: result.data }
    },
    [fetch],
  )

  const cancel = useCallback(
    async (id: number, motivo: string) => {
      const result = await window.api.payments.cancel({ id, motivo })
      if (!result.ok) {
        return { ok: false as const, error: mapError(result.error.code) }
      }
      await fetch()
      return { ok: true as const, payment: result.data }
    },
    [fetch],
  )

  return { payments, balance, loading, error, refetch: fetch, record, cancel }
}

/** Load the active BCV rate (read from history on the main side). */
export function useBcvRate() {
  const [rate, setRate] = useState<BcvRate | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api.config.getBcvRate().then((result) => {
      if (!cancelled && result.ok) {
        setRate(result.data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { rate }
}
