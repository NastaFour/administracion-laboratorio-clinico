import { useEffect, useState } from 'react'
import {
  Users,
  LogOut,
  Beaker,
  FlaskConical,
  Settings,
  FileText,
  Stethoscope,
  TestTube,
  ClipboardList,
  Wallet,
  Calculator,
  LayoutDashboard,
  History,
  ScrollText,
  Lock,
  KeyRound,
  Sun,
  Moon,
  PlusCircle,
} from 'lucide-react'
import { Login } from './features/auth/Login'
import { LockScreen } from './features/auth/LockScreen'
import { PatientsPage } from './features/patients/PatientsPage'
import { PatientForm } from './features/patients/PatientForm'
import { CatalogPage } from './features/catalog/CatalogPage'
import { OrdersPage } from './features/orders/OrdersPage'
import { MedicosPage } from './features/medicos/MedicosPage'
import { SamplingPage } from './features/sampling/SamplingPage'
import { CapturePage } from './features/results/Capture'
import { PaymentsPage } from './features/payments/PaymentsPage'
import { CierrePage } from './features/cierre/CierrePage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { HistoryPage } from './features/history/HistoryPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AuditPage } from './features/audit/AuditPage'
import { useSessionStore } from './stores/useSessionStore'
import { useThemeStore } from './stores/useThemeStore'
import { ToastProvider } from './components/ui/Toast'
import { useToast } from './components/ui/useToast'
import { Button } from './components/ui/Button'
import { Modal } from './components/ui/Modal'
import { Input } from './components/ui/Input'
import { APP_NAME } from './lib/constants'
import { cn } from './lib/cn'
import type { PatientInput } from '@/shared/contracts'

type Tab =
  | 'dashboard'
  | 'patients'
  | 'catalog'
  | 'orders'
  | 'medicos'
  | 'sampling'
  | 'results'
  | 'payments'
  | 'cierre'
  | 'history'
  | 'settings'
  | 'audit'

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

function AppContent() {
  const { session, locked, restore, resetIdle, logout, lock, changePassword } = useSessionStore()
  const { theme, toggleTheme } = useThemeStore()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<Tab>('patients')
  const [quickPatientOpen, setQuickPatientOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  // Password change state
  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveConfirmar, setClaveConfirmar] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    void restore()
  }, [restore])

  // Design A4: the MAIN process owns the idle watchdog. When it invalidates
  // the session it pushes session:expired; drop to the login screen.
  useEffect(() => {
    const unsubscribe = window.api.onSessionExpired?.(() => {
      useSessionStore.getState().expire()
    })
    return unsubscribe
  }, [])

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

  const handleQuickPatientSave = async (input: PatientInput) => {
    const result = await window.api.patients.create(input)
    if (!result.ok) {
      return { ok: false, error: 'No se pudo registrar el paciente.' }
    }
    setQuickPatientOpen(false)
    toast.success(`Paciente ${input.nombre} ${input.apellido} registrado.`)
    setActiveTab('patients')
    return { ok: true }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (!claveActual) {
      setPasswordError('Ingrese su contraseña actual.')
      return
    }
    if (claveNueva.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (claveNueva !== claveConfirmar) {
      setPasswordError('Las nuevas contraseñas no coinciden.')
      return
    }

    setPasswordSubmitting(true)
    const success = await changePassword(claveActual, claveNueva)
    setPasswordSubmitting(false)

    if (success) {
      toast.success('Contraseña actualizada correctamente.')
      setPasswordModalOpen(false)
      setClaveActual('')
      setClaveNueva('')
      setClaveConfirmar('')
    } else {
      setPasswordError('Contraseña actual incorrecta.')
    }
  }

  if (!session) {
    return <Login />
  }

  if (locked) {
    return <LockScreen />
  }

  const isAdmin = session.rol === 'admin'

  return (
    <div className="min-h-screen bg-paper-50 text-ink-950 flex transition-colors duration-150">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-surface-card border-r border-paper-200 dark:border-surface-border flex flex-col h-screen select-none transition-colors duration-150">
        {/* Brand header */}
        <div className="p-5 border-b border-paper-200 dark:border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-white shadow-sm">
              <Beaker size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink-900 dark:text-ink-950 font-heading leading-tight tracking-tight">
                {APP_NAME}
              </h1>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold uppercase tracking-wider">
                v2.0
              </p>
            </div>
          </div>

          {/* Quick theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-paper-100 dark:text-ink-700 dark:hover:text-ink-950 dark:hover:bg-paper-200 transition-colors"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Global Quick Action: Nuevo Registro */}
        <div className="p-3 pb-0">
          <Button
            onClick={() => setQuickPatientOpen(true)}
            className="w-full justify-center shadow-xs text-sm font-semibold gap-2 py-2"
          >
            <PlusCircle size={17} />
            Nuevo Registro
          </Button>
        </div>

        {/* Navigation Sections with vertical scroll (Fix C8) */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {/* Section: OPERACIONES */}
          <div className="space-y-1">
            <p className="px-3 py-1 text-[11px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wider">
              Operaciones
            </p>
            <NavItem
              icon={LayoutDashboard}
              label="Panel"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <NavItem
              icon={Users}
              label="Pacientes"
              active={activeTab === 'patients'}
              onClick={() => setActiveTab('patients')}
            />
            <NavItem
              icon={FlaskConical}
              label="Catálogo"
              active={activeTab === 'catalog'}
              onClick={() => setActiveTab('catalog')}
            />
            <NavItem
              icon={FileText}
              label="Órdenes"
              active={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
            />
            <NavItem
              icon={Stethoscope}
              label="Médicos"
              active={activeTab === 'medicos'}
              onClick={() => setActiveTab('medicos')}
            />
            <NavItem
              icon={TestTube}
              label="Muestras"
              active={activeTab === 'sampling'}
              onClick={() => setActiveTab('sampling')}
            />
            <NavItem
              icon={ClipboardList}
              label="Resultados"
              active={activeTab === 'results'}
              onClick={() => setActiveTab('results')}
            />
            <NavItem
              icon={Wallet}
              label="Pagos"
              active={activeTab === 'payments'}
              onClick={() => setActiveTab('payments')}
            />
            <NavItem
              icon={Calculator}
              label="Cierre de caja"
              active={activeTab === 'cierre'}
              onClick={() => setActiveTab('cierre')}
            />
            <NavItem
              icon={History}
              label="Historial"
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
          </div>

          {/* Section: SISTEMA (Role-gated, Fix B7) */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-paper-100 dark:border-surface-border">
              <p className="px-3 py-1 text-[11px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wider">
                Sistema
              </p>
              <NavItem
                icon={Settings}
                label="Configuración"
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
              />
              <NavItem
                icon={ScrollText}
                label="Auditoría"
                active={activeTab === 'audit'}
                onClick={() => setActiveTab('audit')}
              />
            </div>
          )}
        </nav>

        {/* Sidebar Footer with Profile & Quick Actions */}
        <div className="p-3 border-t border-paper-200 dark:border-surface-border space-y-2 bg-paper-50/50 dark:bg-surface-card/80">
          <div className="px-3 py-1 flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-950 truncate">
                {session.nombre}
              </p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-paper-200 text-ink-700 dark:bg-paper-300 dark:text-ink-800">
                {session.rol}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={lock}
                className="p-1.5 rounded-md text-ink-500 hover:text-ink-900 hover:bg-paper-200/60 dark:text-ink-600 dark:hover:text-ink-950 dark:hover:bg-paper-300 transition-colors"
                title="Bloquear ahora"
                aria-label="Bloquear estación de trabajo"
              >
                <Lock size={15} />
              </button>
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="p-1.5 rounded-md text-ink-500 hover:text-ink-900 hover:bg-paper-200/60 dark:text-ink-600 dark:hover:text-ink-950 dark:hover:bg-paper-300 transition-colors"
                title="Cambiar contraseña"
                aria-label="Cambiar contraseña"
              >
                <KeyRound size={15} />
              </button>
            </div>
          </div>

          <button
            onClick={() => void logout()}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-danger-700 dark:text-danger-500',
              'hover:bg-danger-50 dark:hover:bg-danger-100/30 transition-all duration-150 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500',
            )}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Workspace Area with 2D View Transition */}
      <main className="flex-1 p-6 overflow-auto">
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'patients' && <PatientsPage />}
          {activeTab === 'catalog' && <CatalogPage />}
          {activeTab === 'orders' && <OrdersPage onNavigateToHistory={() => setActiveTab('history')} />}
          {activeTab === 'medicos' && <MedicosPage />}
          {activeTab === 'sampling' && <SamplingPage />}
          {activeTab === 'results' && <CapturePage />}
          {activeTab === 'payments' && <PaymentsPage />}
          {activeTab === 'cierre' && <CierrePage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'audit' && <AuditPage />}
        </div>
      </main>

      {/* Global Modal: Quick Create Patient (Gap A6) */}
      <Modal
        open={quickPatientOpen}
        title="Nuevo Paciente"
        onClose={() => setQuickPatientOpen(false)}
        size="md"
      >
        <PatientForm
          onSaved={() => setQuickPatientOpen(false)}
          onCancel={() => setQuickPatientOpen(false)}
          onSubmit={handleQuickPatientSave}
        />
      </Modal>

      {/* Modal: Change Password Self-Service (Gap D) */}
      <Modal
        open={passwordModalOpen}
        title="Cambiar contraseña"
        onClose={() => setPasswordModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-danger-50 text-danger-700 dark:bg-danger-100/30 dark:text-danger-400 px-3 py-2 text-xs" role="alert">
              {passwordError}
            </div>
          )}
          <Input
            label="Contraseña actual"
            type="password"
            value={claveActual}
            onChange={(e) => setClaveActual(e.target.value)}
            autoFocus
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={claveNueva}
            onChange={(e) => setClaveNueva(e.target.value)}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={claveConfirmar}
            onChange={(e) => setClaveConfirmar(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Guardando…' : 'Actualizar clave'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none relative',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-[0.98]',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-100/30 dark:text-primary-400 font-semibold shadow-2xs'
          : 'text-ink-600 dark:text-ink-700 hover:bg-paper-100 dark:hover:bg-surface-hover hover:text-ink-900 dark:hover:text-ink-950',
      )}
    >
      <Icon size={18} className={cn(active ? 'text-primary-600 dark:text-primary-400' : 'text-ink-500 dark:text-ink-600')} />
      <span>{label}</span>
      {active && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-600 dark:bg-primary-400"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

export default App
