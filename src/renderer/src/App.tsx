import { useEffect } from 'react'
import { Login } from './features/auth/Login'
import { LockScreen } from './features/auth/LockScreen'
import { useSessionStore } from './stores/useSessionStore'

function App() {
  const { session, locked, restore, resetIdle } = useSessionStore()

  useEffect(() => {
    void restore()
  }, [restore])

  useEffect(() => {
    if (!session) {
      return
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const onActivity = () => resetIdle()
    for (const event of events) {
      window.addEventListener(event, onActivity)
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity)
      }
    }
  }, [session, resetIdle])

  if (!session) {
    return <Login />
  }

  if (locked) {
    return <LockScreen />
  }

  return (
    <div className="min-h-screen bg-paper-50 text-ink-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary-700">LabCore</h1>
        <p className="text-ink-600">Bienvenido, {session.nombre}</p>
        <p className="text-ink-400 text-sm">El módulo principal se habilitará en la siguiente fase.</p>
      </div>
    </div>
  )
}

export default App
