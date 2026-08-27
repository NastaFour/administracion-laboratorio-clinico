import { ScrollText } from 'lucide-react'
import { auditActionSchema, auditEntitySchema, type AuditAction, type AuditEntity } from '@/shared/contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../i18n/es-ve'
import { useAudit } from './useAudit'

const ACTIONS = auditActionSchema.options as readonly AuditAction[]
const ENTITIES = auditEntitySchema.options as readonly AuditEntity[]

/**
 * Admin-only audit viewer (M12.3): filterable by actor, action, entity and
 * date range, paginated, with an explicit empty state. The append-only store
 * is read-only here — no mutation is ever offered (M12.4).
 */
export function AuditPage() {
  const { users, pageEntries, entries, loading, error, filters, setFilters, page, totalPages, setPage } =
    useAudit()

  const hasFilters =
    filters.usuarioId !== undefined ||
    filters.accion !== undefined ||
    filters.entidad !== undefined ||
    filters.desde !== undefined ||
    filters.hasta !== undefined

  const userOptions = [...users.entries()].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900" data-testid="audit-heading">
          Auditoría
        </h2>
        <p className="text-sm text-ink-500">
          Registro inmutable de acciones con filtros por actor, acción, entidad y rango de fechas.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 transition-colors">
        <div className="min-w-48">
          <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-700" htmlFor="audit-actor">
            Actor
          </label>
          <select
            id="audit-actor"
            className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-sm text-ink-900 dark:text-ink-950"
            value={filters.usuarioId ?? ''}
            onChange={(event) =>
              setFilters({
                ...filters,
                usuarioId: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            data-testid="audit-actor"
          >
            <option value="">Todos</option>
            {userOptions.map(([id, usuario]) => (
              <option key={id} value={id}>
                {usuario}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-700" htmlFor="audit-action">
            Acción
          </label>
          <select
            id="audit-action"
            className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-sm text-ink-900 dark:text-ink-950"
            value={filters.accion ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, accion: (event.target.value || undefined) as AuditAction | undefined })
            }
            data-testid="audit-action"
          >
            <option value="">Todas</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs font-medium text-ink-600 dark:text-ink-700" htmlFor="audit-entity">
            Entidad
          </label>
          <select
            id="audit-entity"
            className="w-full rounded-md border border-paper-300 dark:border-surface-border bg-white dark:bg-surface-card px-3 py-2 text-sm text-ink-900 dark:text-ink-950"
            value={filters.entidad ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, entidad: (event.target.value || undefined) as AuditEntity | undefined })
            }
            data-testid="audit-entity"
          >
            <option value="">Todas</option>
            {ENTITIES.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Desde"
          type="date"
          value={filters.desde ?? ''}
          onChange={(event) => setFilters({ ...filters, desde: event.target.value || undefined })}
        />
        <Input
          label="Hasta"
          type="date"
          value={filters.hasta ?? ''}
          onChange={(event) => setFilters({ ...filters, hasta: event.target.value || undefined })}
        />
        {hasFilters && (
          <Button variant="secondary" onClick={() => setFilters({})} data-testid="audit-clear">
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-500" data-testid="audit-loading">
          Cargando auditoría…
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No hay entradas con estos filtros"
          description="Cambie o limpie los filtros para ver el registro completo."
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => setFilters({})}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-paper-200 dark:border-surface-border bg-white dark:bg-surface-card transition-colors">
            <table className="w-full text-sm">
              <thead className="bg-paper-100 dark:bg-paper-100">
                <tr className="border-b border-paper-200 dark:border-surface-border text-left text-xs uppercase tracking-wide text-ink-600 dark:text-ink-700">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3 text-right">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-100 dark:divide-surface-border">
                {pageEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-paper-100" data-testid={`audit-row-${entry.id}`}>
                    <td className="px-4 py-2.5 tabular-nums">{formatDateTime(entry.creado_en)}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-900">
                      {users.get(entry.usuario_id) ?? `#${entry.usuario_id}`}
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">{entry.accion}</td>
                    <td className="px-4 py-2.5 text-ink-600">{entry.entidad}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-500">{entry.entidad_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-ink-600">
            <span>
              {entries.length} entrada{entries.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                Anterior
              </Button>
              <span data-testid="audit-page">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
