import { useEffect, useState } from 'react'
import { Users, LogOut, Beaker, FlaskConical, Settings, FileText, Stethoscope, TestTube, ClipboardList, Wallet, Calculator, LayoutDashboard, History } from 'lucide-react'
import { Login } from './features/auth/Login'
import { LockScreen } from './features/auth/LockScreen'
import { PatientsPage } from './features/patients/PatientsPage'
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
import { useSessionStore } from './stores/useSessionStore'
import { cn } from './lib/cn'

type Tab = 'dashboard' | 'patients' | 'catalog' | 'orders' | 'medicos' | 'sampling' | 'results' | 'payments' | 'cierre' | 'history' | 'settings'

function App() {
  const { session, locked, restore, resetIdle, logout } = useSessionStore()
  const [activeTab, setActiveTab] = useState<Tab>('patients')

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
          <NavItem
            icon={Settings}
            label="Configuración"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
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
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'patients' && <PatientsPage />}
        {activeTab === 'catalog' && <CatalogPage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'medicos' && <MedicosPage />}
        {activeTab === 'sampling' && <SamplingPage />}
        {activeTab === 'results' && <CapturePage />}
        {activeTab === 'payments' && <PaymentsPage />}
        {activeTab === 'cierre' && <CierrePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

interface NavItemProps {
  icon: React.ComponentType<{ size?: number }>
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
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
