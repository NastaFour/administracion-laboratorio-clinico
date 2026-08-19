import { useState } from 'react'
import { useSessionStore } from '../../stores/useSessionStore'
import { cn } from '../../lib/cn'

export function LockScreen() {
  const { session, unlock, logout, loading, error, clearError } = useSessionStore()
  const [clave, setClave] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await unlock(clave)
    if (!useSessionStore.getState().error) {
      setClave('')
    }
  }

  return (
    <div className="min-h-screen bg-paper-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-lg font-semibold">
            {session?.nombre.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-semibold text-ink-900">Sesión bloqueada</h2>
          <p className="text-ink-500 text-sm">Ingrese su clave para continuar</p>
        </div>

        {error && (
          <div className="rounded-md bg-danger-50 text-danger-700 px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="clave-bloqueo" className="block text-sm font-medium text-ink-700">
              Clave
            </label>
            <input
              id="clave-bloqueo"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="w-full rounded-md border border-paper-300 px-3 py-2 text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !clave}
            className={cn(
              'w-full rounded-md bg-primary-600 px-4 py-2 text-white font-medium',
              'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
          <button
            type="button"
            onClick={() => {
              setClave('')
              void logout()
            }}
            disabled={loading}
            className="w-full rounded-md border border-paper-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-paper-50"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
