import { useState } from 'react'
import { KeyRound, UserPlus, UserX } from 'lucide-react'
import type { Role, User } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { useUsers } from './useSettings'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'bioanalista', label: 'Bioanalista' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'recepcion', label: 'Recepción' },
]

export function Users() {
  const { users, loading, error, createUser, disableUser, resetPassword } = useUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  return (
    <div className="space-y-6" data-testid="settings-users">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">Usuarios del sistema</h3>
          <p className="text-sm text-ink-500">
            Cree cuentas para el personal y gestione sus accesos.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="users-new-button">
          <UserPlus size={16} className="mr-2" />
          Nuevo usuario
        </Button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            feedback.ok ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {error && <p className="text-danger-600" role="alert">{error}</p>}
      {loading && <p className="text-ink-500">Cargando usuarios…</p>}

      {!loading && users.length === 0 ? (
        <p className="text-ink-500 text-sm">No hay usuarios registrados.</p>
      ) : (
        <table className="w-full text-sm border border-paper-200 rounded-md overflow-hidden">
          <thead className="bg-paper-100 text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-ink-700">Usuario</th>
              <th scope="col" className="px-3 py-2 font-medium text-ink-700">Nombre</th>
              <th scope="col" className="px-3 py-2 font-medium text-ink-700">Rol</th>
              <th scope="col" className="px-3 py-2 font-medium text-ink-700">Estado</th>
              <th scope="col" className="px-3 py-2 font-medium text-ink-700 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody data-testid="users-table-body">
            {users.map((user) => (
              <tr key={user.id} data-testid={`users-row-${user.usuario}`} className="bg-white border-t border-paper-200">
                <td className="px-3 py-2 font-medium text-ink-900">{user.usuario}</td>
                <td className="px-3 py-2 text-ink-600">{user.nombre}</td>
                <td className="px-3 py-2 capitalize text-ink-600">{user.rol}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.activo ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'
                    }`}
                    data-testid={`users-status-${user.usuario}`}
                  >
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {user.debe_cambiar_clave && (
                    <span className="ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                      Debe cambiar clave
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setResetTarget(user)} aria-label={`Restablecer clave de ${user.usuario}`}>
                      <KeyRound size={14} />
                      Clave
                    </Button>
                    {user.activo && (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDisable(user)} aria-label={`Deshabilitar a ${user.usuario}`}>
                        <UserX size={14} />
                        Deshabilitar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showCreate} title="Nuevo usuario" onClose={() => setShowCreate(false)}>
        <UserForm
          onCancel={() => setShowCreate(false)}
          onSubmit={async (input) => {
            const result = await createUser(input)
            if (!result.ok) {
              setFeedback({ ok: false, message: result.error })
              return false
            }
            setFeedback({ ok: true, message: `Usuario ${input.usuario} creado.` })
            setShowCreate(false)
            return true
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDisable}
        title="Deshabilitar usuario"
        message={`¿Está seguro de deshabilitar a ${confirmDisable?.usuario}? Ya no podrá iniciar sesión.`}
        confirmLabel="Deshabilitar"
        onConfirm={async () => {
          if (!confirmDisable) return
          const result = await disableUser(confirmDisable.id)
          setFeedback(
            result.ok
              ? { ok: true, message: `Usuario ${confirmDisable.usuario} deshabilitado.` }
              : { ok: false, message: result.error },
          )
          setConfirmDisable(null)
        }}
        onCancel={() => setConfirmDisable(null)}
      />

      <ResetPasswordModal
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onSubmit={async (nueva, debeCambiarClave) => {
          if (!resetTarget) return false
          const result = await resetPassword(resetTarget.id, nueva, debeCambiarClave)
          if (!result.ok) {
            setFeedback({ ok: false, message: result.error })
            return false
          }
          setFeedback({ ok: true, message: `Clave de ${resetTarget.usuario} restablecida.` })
          setResetTarget(null)
          return true
        }}
      />
    </div>
  )
}

interface UserFormProps {
  onSubmit: (input: { usuario: string; nombre: string; clave: string; rol: Role }) => Promise<boolean>
  onCancel: () => void
}

function UserForm({ onSubmit, onCancel }: UserFormProps) {
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [clave, setClave] = useState('')
  const [rol, setRol] = useState<Role>('tecnico')
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = async (): Promise<void> => {
    const validation: string[] = []
    if (!usuario.trim()) validation.push('El usuario es requerido.')
    if (!nombre.trim()) validation.push('El nombre es requerido.')
    if (clave.length < 8) validation.push('La clave debe tener al menos 8 caracteres.')
    setErrors(validation)
    if (validation.length > 0) return
    const ok = await onSubmit({ usuario: usuario.trim(), nombre: nombre.trim(), clave, rol })
    if (ok) {
      setUsuario('')
      setNombre('')
      setClave('')
      setRol('tecnico')
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
    >
      {errors.length > 0 && (
        <ul className="text-sm text-danger-600 space-y-1">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <Input label="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} data-testid="users-create-usuario" />
      <Input label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} data-testid="users-create-nombre" />
      <Input
        label="Clave (mínimo 8 caracteres)"
        type="password"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        data-testid="users-create-clave"
      />
      <label className="block text-sm font-medium text-ink-700">
        Rol
        <select
          className="mt-1 w-full rounded-md border border-paper-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
          value={rol}
          onChange={(e) => setRol(e.target.value as Role)}
          data-testid="users-create-rol"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" data-testid="users-create-submit">
          Crear usuario
        </Button>
      </div>
    </form>
  )
}

interface ResetPasswordModalProps {
  target: User | null
  onClose: () => void
  onSubmit: (nueva: string, debeCambiarClave: boolean) => Promise<boolean>
}

function ResetPasswordModal({ target, onClose, onSubmit }: ResetPasswordModalProps) {
  const [nueva, setNueva] = useState('')
  const [debeCambiarClave, setDebeCambiarClave] = useState(true)

  const handleClose = (): void => {
    setNueva('')
    setDebeCambiarClave(true)
    onClose()
  }

  return (
    <Modal open={!!target} title={`Restablecer clave de ${target?.usuario ?? ''}`} onClose={handleClose} size="sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit(nueva, debeCambiarClave).then((ok) => {
            if (ok) handleClose()
          })
        }}
      >
        <Input
          label="Nueva clave (mínimo 8 caracteres)"
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          data-testid="users-reset-clave"
        />
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={debeCambiarClave}
            onChange={(e) => setDebeCambiarClave(e.target.checked)}
            data-testid="users-reset-flag"
          />
          Exigir cambio de clave en el próximo inicio de sesión
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" data-testid="users-reset-submit">
            Restablecer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
