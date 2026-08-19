import { useEffect } from 'react'
import { Users, LogOut, Beaker } from 'lucide-react'
import { Login } from './features/auth/Login'
import { LockScreen } from './features/auth/LockScreen'
import { PatientsPage } from './features/patients/PatientsPage'
import { useSessionStore } from './stores/useSessionStore'
import { cn } from './lib/cn'

function App() {
  const { session, locked, restore, resetIdle, logout } = useSessionStore()

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
    <div className="min-h-screen bg-paper-50 text-ink-950 flex">
      <aside className="w-64 bg-white border-r border-paper-200 flex flex-col">
        <div className="p-6 border-b border-paper-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center text-white">
              <Beaker size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink-900 leading-tight">LabCore</h1>
              <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide">v2.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={Users} label="Pacientes" active />
        </nav>

        <div className="p-4 border-t border-paper-200 space-y-3">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-ink-900">{session.nombre}</p>
            <p className="text-xs text-ink-500 capitalize">{session.rol}</p>
          </div>
          <button
            onClick={() => void logout()}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-danger-700',
              'hover:bg-danger-50 transition-colors',
            )}
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <PatientsPage />
      </main>
    </div>
  )
}

interface NavItemProps {
  icon: React.ComponentType<{ size?: number }>
  label: string
  active?: boolean
}

function NavItem({ icon: Icon, label, active }: NavItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-ink-600 hover:bg-paper-100',
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  )
}

export default App
