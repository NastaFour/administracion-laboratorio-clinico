import { useState } from 'react'
import { useSessionStore } from '../../stores/useSessionStore'
import { cn } from '../../lib/cn'
import { APP_NAME } from '../../lib/constants'

export function Login() {
  const { login, changePassword, loading, error, session, clearError } = useSessionStore()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    await login(usuario, clave)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    if (nueva.length < 8) {
      setLocalError('La nueva clave debe tener al menos 8 caracteres')
      return
    }
    if (nueva !== confirmar) {
      setLocalError('Las claves no coinciden')
      return
    }
    const ok = await changePassword(clave, nueva)
    if (ok) {
      setNueva('')
      setConfirmar('')
    }
  }

  const debeCambiar = session?.debe_cambiar_clave ?? false

  return (
    <div className="min-h-screen bg-paper-50 dark:bg-paper-50 flex items-center justify-center p-6 transition-colors">
      <div className="w-full max-w-sm bg-white dark:bg-surface-card border border-paper-200 dark:border-surface-border rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-400">{APP_NAME}</h1>
          <p className="text-ink-500 dark:text-ink-600 text-sm">Inicie sesión para continuar</p>
        </div>

        {(error || localError) && (
          <div className="rounded-md bg-danger-50 text-danger-700 dark:bg-danger-100/30 dark:text-danger-400 px-4 py-3 text-sm" role="alert">
            {error ?? localError}
          </div>
        )}

        {!debeCambiar ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="usuario" className="block text-sm font-medium text-ink-700 dark:text-ink-700">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="clave" className="block text-sm font-medium text-ink-700 dark:text-ink-700">
                Clave
              </label>
              <input
                id="clave"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-ink-900 dark:text-ink-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !usuario || !clave}
              className={cn(
                'w-full rounded-md bg-primary-600 px-4 py-2 text-white font-medium',
                'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <p className="text-sm text-warning-700 bg-warning-50 rounded-md px-4 py-3">
              Debe cambiar su clave antes de continuar.
            </p>
            <div className="space-y-1">
              <label htmlFor="nueva" className="block text-sm font-medium text-ink-700">
                Nueva clave
              </label>
              <input
                id="nueva"
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirmar" className="block text-sm font-medium text-ink-700">
                Confirmar clave
              </label>
              <input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !nueva || !confirmar}
              className={cn(
                'w-full rounded-md bg-primary-600 px-4 py-2 text-white font-medium',
                'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Guardando…' : 'Cambiar clave'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
