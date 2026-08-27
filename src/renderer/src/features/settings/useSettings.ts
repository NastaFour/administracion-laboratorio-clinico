import { useCallback, useEffect, useState } from 'react'
import type { BioanalistaConfig, LabConfig, ReportFormat, User } from '@/shared/contracts'

/**
 * Shared error mapping for the settings screens (plain-Spanish messages).
 */
export function mapConfigError(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Datos inválidos. Verifique los campos.',
    PERMISSION_DENIED: 'Solo el administrador puede modificar la configuración.',
    NOT_FOUND: 'El recurso no existe.',
    DUPLICATE: 'El registro ya existe.',
    CONFLICT: 'La acción no puede completarse por un conflicto.',
    DB_ERROR: 'Ocurrió un error en la base de datos.',
  }
  return messages[code] ?? 'Ocurrió un error inesperado.'
}

export function useLabConfig() {
  const [config, setConfig] = useState<LabConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.config
      .getLab()
      .then((result) => {
        if (cancelled) return
        if (!result.ok) {
          setError(mapConfigError(result.error.code))
          return
        }
        setConfig(result.data)
      })
      .catch(() => {
        if (!cancelled) setError(mapConfigError('DB_ERROR'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (next: LabConfig) => {
    const result = await window.api.config.setLab(next)
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    setConfig(result.data)
    return { ok: true as const }
  }, [])

  const setLogo = useCallback(async (logo: string) => {
    const result = await window.api.config.setLogo({ logo })
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    setConfig((prev) => (prev ? { ...prev, logo } : prev))
    return { ok: true as const }
  }, [])

  return { config, loading, error, save, setLogo }
}

/**
 * Dual-format report selector (SPEC-VISUAL-PDF-TEMPLATES §3.A): the admin
 * picks the default PDF layout; the value is read by the print/preview/save
 * pipeline in the main process (WU4) unless overridden per request.
 */
export function useReportFormat() {
  const [formato, setFormato] = useState<ReportFormat>('generico')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.config
      .getReportFormat()
      .then((result) => {
        if (cancelled) return
        if (!result.ok) {
          setError(mapConfigError(result.error.code))
          return
        }
        setFormato(result.data)
      })
      .catch(() => {
        if (!cancelled) setError(mapConfigError('DB_ERROR'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (next: ReportFormat) => {
    const result = await window.api.config.setReportFormat({ formato: next })
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    setFormato(result.data)
    return { ok: true as const }
  }, [])

  return { formato, loading, error, save }
}

export function useBioanalistaConfig() {
  const [config, setConfig] = useState<BioanalistaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.config
      .getBioanalista()
      .then((result) => {
        if (cancelled) return
        if (!result.ok) {
          setError(mapConfigError(result.error.code))
          return
        }
        setConfig(result.data)
      })
      .catch(() => {
        if (!cancelled) setError(mapConfigError('DB_ERROR'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (next: BioanalistaConfig) => {
    const result = await window.api.config.setBioanalista(next)
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    setConfig(result.data)
    return { ok: true as const }
  }, [])

  return { config, loading, error, save, setConfig }
}

interface BcvHistoryResult {
  ok: true
  data: Array<{ tasa: number; actualizado_en: string; usuario_id: number | null }>
}

export function useBcvHistory() {
  const [history, setHistory] = useState<Array<{ tasa: number; actualizado_en: string; usuario_id: number | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result: BcvHistoryResult | { ok: false; error: { code: string } } =
        await window.api.config.getBcvHistory()
      if (!result.ok) {
        setError(mapConfigError(result.error.code))
        return
      }
      setHistory(result.data)
    } catch {
      setError(mapConfigError('DB_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { history, loading, error, reloadHistory: load }
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<User[]> => {
    try {
      const result = await window.api.users.list()
      if (!result.ok) {
        setError(mapConfigError(result.error.code))
        return []
      }
      setUsers(result.data)
      return result.data
    } catch {
      setError(mapConfigError('DB_ERROR'))
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const createUser = useCallback(
    async (input: { usuario: string; nombre: string; clave: string; rol: User['rol'] }) => {
      const result = await window.api.users.create(input)
      if (!result.ok) {
        return { ok: false as const, error: mapConfigError(result.error.code) }
      }
      setUsers((prev) => [...prev, result.data].sort((a, b) => a.usuario.localeCompare(b.usuario)))
      return { ok: true as const }
    },
    [],
  )

  const disableUser = useCallback(async (id: number) => {
    const result = await window.api.users.disable({ id })
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? result.data : u)))
    return { ok: true as const }
  }, [])

  const resetPassword = useCallback(async (id: number, nueva: string, debeCambiarClave: boolean) => {
    const result = await window.api.users.resetPassword({
      id,
      nueva,
      debe_cambiar_clave: debeCambiarClave,
    })
    if (!result.ok) {
      return { ok: false as const, error: mapConfigError(result.error.code) }
    }
    return { ok: true as const }
  }, [])

  return { users, loading, error, reload, createUser, disableUser, resetPassword }
}

export function formatBcvDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}
