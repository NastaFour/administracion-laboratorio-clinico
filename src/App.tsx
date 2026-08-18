import { useState, useEffect, createContext } from 'react'
import {
  Users,
  Settings,
  History,
  PlusCircle,
  Beaker,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Sun,
  Moon
} from 'lucide-react'
import PatientModule from './components/PatientModule'
import SettingsModule from './components/SettingsModule'
import HistoryModule from './components/HistoryModule'
import PatientForm from './components/PatientForm'
import ResultEntryModule from './components/ResultEntryModule'
import PaymentModule from './components/PaymentModule'

// Contexto para notificaciones globales
export const NotificationContext = createContext<{
  showNotification: (msg: string, type?: 'success' | 'error') => void
}>({ showNotification: () => { } })

function App() {
  const [activeTab, setActiveTab] = useState('orders')
  const [historyFilter, setHistoryFilter] = useState('')
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const navigateToPatientHistory = (cedula: string) => {
    setHistoryFilter(cedula)
    setActiveTab('history')
  }

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id)
        if (id !== 'history') setHistoryFilter('')
      }}
      className={`btn btn-ghost w-full justify-start p-3 transition-all ${activeTab === id ? 'bg-accent text-white shadow-lg' : 'hover:bg-accent/10'}`}
      style={{ gap: '1rem', marginBottom: '0.5rem' }}
    >
      <Icon size={20} />
      <span style={{ fontWeight: 500 }}>{label}</span>
    </button>
  )

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <div className="layout">
        {/* Notificación Toast */}
        {notification && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }} className="fade-in">
            <div className="card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              minWidth: '300px',
              borderLeft: `5px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--danger)'} `,
              background: 'var(--bg-card)'
            }}>
              {notification.type === 'success' ? <CheckCircle2 className="text-success" size={20} /> : <AlertCircle className="text-danger" size={20} />}
              <span style={{ fontWeight: 600 }}>{notification.msg}</span>
              <button onClick={() => setNotification(null)} className="btn btn-ghost p-1 ml-2">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <aside className="sidebar">
          <div className="flex items-center gap-3 p-6 mb-4">
            <div style={{ background: 'var(--accent)', padding: '10px', borderRadius: '14px', color: 'white' }}>
              <Beaker size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>LabCore</h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>V2.1 Professional</span>
            </div>
          </div>

          <nav style={{ padding: '0 1rem', flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Operaciones</div>
            <SidebarItem id="orders" icon={PlusCircle} label="Captura Resultados" />
            <SidebarItem id="payments" icon={CreditCard} label="Gestión de Pagos" />
            <SidebarItem id="history" icon={History} label="Historial Clínico" />
            <SidebarItem id="patients" icon={Users} label="Registro Pacientes" />

            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '3rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Sistema</div>
            <SidebarItem id="settings" icon={Settings} label="Configuración" />

            <button
              className="btn btn-ghost w-full justify-start mt-2"
              onClick={toggleTheme}
              style={{ gap: '1rem' }}
            >
              {theme === 'dark' ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-accent" />}
              <span>Cambiar a {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>

            <button
              className="btn btn-ghost w-full justify-start text-danger hover:bg-danger/10 mt-AUTO"
              style={{ marginTop: '2rem', gap: '1rem' }}
              onClick={() => window.electronAPI.quitApp()}
            >
              <LogOut size={20} />
              <span>Cerrar Aplicación</span>
            </button>
          </nav>

          <button
            onClick={() => setShowPatientForm(true)}
            className="btn btn-primary"
            style={{ margin: '1rem', padding: '1.25rem', borderRadius: '18px' }}
          >
            <PlusCircle size={22} />
            Nuevo Registro
          </button>
        </aside>

        <main className="main-content">
          <header className="header">
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                {activeTab === 'orders' && 'Panel de Resultados'}
                {activeTab === 'payments' && 'Gestión de Pagos'}
                {activeTab === 'history' && 'Historial de Órdenes'}
                {activeTab === 'patients' && 'Base de Pacientes'}
                {activeTab === 'settings' && 'Ajustes del Sistema'}
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Bienvenido al sistema de gestión de bioanálisis.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Admin Usuario</div>
                <div className="text-accent" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sesión Activa</div>
              </div>
              <div className="avatar">AD</div>
            </div>
          </header>

          <div className="fade-in">
            {activeTab === 'orders' && <ResultEntryModule />}
            {activeTab === 'payments' && <PaymentModule />}
            {activeTab === 'history' && <HistoryModule filterPatient={historyFilter} />}
            {activeTab === 'patients' && <PatientModule onViewHistory={navigateToPatientHistory} />}
            {activeTab === 'settings' && <SettingsModule />}
          </div>
        </main>

        {showPatientForm && <PatientForm onClose={() => setShowPatientForm(false)} />}
      </div>
    </NotificationContext.Provider>
  )
}

export default App
