import { useState } from 'react'
import { Building2, Stethoscope, Calculator, Users as UsersIcon, FolderArchive } from 'lucide-react'
import { useSessionStore } from '../../stores/useSessionStore'
import { cn } from '../../lib/cn'
import { Lab } from './Lab'
import { Bioanalist } from './Bioanalist'
import { Billing } from './Billing'
import { Users } from './Users'
import { Backup } from './Backup'

type SettingsTab = 'lab' | 'bioanalista' | 'billing' | 'users' | 'backup'

const TABS: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'lab', label: 'Laboratorio', icon: Building2 },
  { id: 'bioanalista', label: 'Bioanalista', icon: Stethoscope },
  { id: 'billing', label: 'Facturación', icon: Calculator },
  { id: 'users', label: 'Usuarios', icon: UsersIcon },
  { id: 'backup', label: 'Respaldo', icon: FolderArchive },
]

/**
 * Settings split into focused sub-screens (M13.3) — replaces the v1 856-line
 * god component. The whole area is admin-only per the role matrix.
 */
export function SettingsPage() {
  const session = useSessionStore((state) => state.session)
  const [activeTab, setActiveTab] = useState<SettingsTab>('lab')

  if (!session || session.rol !== 'admin') {
    return (
      <div className="rounded-lg border border-paper-200 bg-paper-50 p-8 text-center" data-testid="settings-denied">
        <p className="text-ink-500">
          La configuración del sistema está reservada al administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Configuración</h2>
        <p className="text-sm text-ink-500">Administre los datos del laboratorio y del personal.</p>
      </div>

      <div className="flex gap-1 border-b border-paper-200" role="tablist" aria-label="Secciones de configuración">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                  : 'text-ink-600 hover:bg-paper-100',
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {activeTab === 'lab' && <Lab />}
        {activeTab === 'bioanalista' && <Bioanalist />}
        {activeTab === 'billing' && <Billing />}
        {activeTab === 'users' && <Users />}
        {activeTab === 'backup' && <Backup />}
      </div>
    </div>
  )
}
