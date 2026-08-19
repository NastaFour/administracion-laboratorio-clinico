import { useCallback, useEffect, useState } from 'react'
import type { CreateOrderRequest, OrderFilters, OrderWithExams, UpdateOrderRequest } from '@/shared/contracts'

export function useOrders(filters: OrderFilters = {}) {
  const [orders, setOrders] = useState<OrderWithExams[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { pacienteId, estatus, desde, hasta, pendientePago } = filters

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.orders.list({ pacienteId, estatus, desde, hasta, pendientePago })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setOrders(result.data)
    } finally {
      setLoading(false)
    }
  }, [pacienteId, estatus, desde, hasta, pendientePago])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const create = useCallback(async (input: CreateOrderRequest) => {
    const result = await window.api.orders.create(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => [result.data, ...prev])
    return { ok: true, order: result.data } as const
  }, [])

  const update = useCallback(async (input: UpdateOrderRequest) => {
    const result = await window.api.orders.update(input)
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => prev.map((o) => (o.id === result.data.id ? result.data : o)))
    return { ok: true, order: result.data } as const
  }, [])

  const advanceStatus = useCallback(async (id: number) => {
    const result = await window.api.orders.advanceStatus({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...result.data } : o)))
    return { ok: true, order: result.data } as const
  }, [])

  const deliver = useCallback(async (id: number) => {
    const result = await window.api.orders.deliver({ id })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...result.data } : o)))
    return { ok: true, order: result.data } as const
  }, [])

  const voidOrder = useCallback(async (id: number, motivo: string) => {
    const result = await window.api.orders.void({ id, motivo })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...result.data } : o)))
    return { ok: true, order: result.data } as const
  }, [])

  const authorizeCredit = useCallback(async (id: number, monto: number, motivo: string) => {
    const result = await window.api.orders.authorizeCredit({ id, monto, motivo })
    if (!result.ok) {
      return { ok: false, error: mapError(result.error.code) } as const
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...result.data } : o)))
    return { ok: true, order: result.data } as const
  }, [])

  return {
    orders,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    advanceStatus,
    deliver,
    voidOrder,
    authorizeCredit,
  }
}

export function useOrder(id: number | null) {
  const [order, setOrder] = useState<OrderWithExams | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (id === null) {
      setOrder(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.orders.get({ id })
      if (!result.ok) {
        setError(mapError(result.error.code))
        return
      }
      setOrder(result.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { order, loading, error, refetch: fetch }
}

function mapError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'No tiene permiso para realizar esta acción.',
    NOT_FOUND: 'La orden no existe.',
    DUPLICATE: 'Ya existe un registro con esos datos.',
    CONFLICT: 'La orden no permite esta acción en su estado actual.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}
