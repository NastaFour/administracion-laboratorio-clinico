import { useEffect, useState } from 'react'
import { Plus, Phone, Calendar, Clock, ArrowRight, RefreshCw } from 'lucide-react'

interface Patient {
    id: string
    cedula: string
    nombres: string
    apellidos: string
    fecha_nacimiento: string
    sexo: 'M' | 'F'
    telefono: string
    updated_at: string
}

interface PatientModuleProps {
    onViewHistory?: (cedula: string) => void
}

export default function PatientModule({ onViewHistory }: PatientModuleProps) {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    const loadPatients = async () => {
        try {
            const data = await window.electronAPI.getPatients()
            setPatients(data)
        } catch (error) {
            console.error("Error cargando pacientes:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeletePatient = async (id: number, nombre: string) => {
        if (confirm(`¿Está seguro de que desea eliminar permanentemente al paciente "${nombre}"? Esta acción borrará todos sus historiales.`)) {
            try {
                await window.electronAPI.deletePatient(id)
                loadPatients()
            } catch (error) {
                alert("Error al eliminar paciente. Podría tener órdenes asociadas.")
            }
        }
    }

    useEffect(() => {
        loadPatients()
    }, [])

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando pacientes...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between">
                <h3 className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Registros en el sistema
                </h3>
                <button
                    className="btn btn-ghost"
                    onClick={loadPatients}
                    disabled={loading}
                    style={{ gap: '0.5rem', fontSize: '0.85rem' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refrescar Lista
                </button>
            </div>
            <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {patients.length > 0 ? patients.map(patient => (
                    <div key={patient.id} className="card" style={{ padding: '0' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div className="flex-between mb-3">
                                <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                                    {patient.cedula}
                                </span>
                                <h3 style={{ marginBottom: '0.25rem' }}>{patient.apellidos}, {patient.nombres}</h3>
                                <button className="card-delete-btn" title="Eliminar Paciente" onClick={() => handleDeletePatient(parseInt(patient.id), `${patient.nombres} ${patient.apellidos}`)}>
                                    <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
                                </button>
                            </div>
                            <h3 style={{ marginBottom: '0.25rem' }}>{patient.apellidos}, {patient.nombres}</h3>
                            <div className="flex gap-2 text-muted" style={{ fontSize: '0.875rem' }}>
                                <Calendar size={14} className="text-accent" />
                                <span>F. Nacimiento: <strong>{patient.fecha_nacimiento}</strong></span>
                                <span>•</span>
                                <span>{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(59, 130, 246, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <Phone size={14} className="text-muted" />
                                <span>{patient.telefono}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <Clock size={14} className="text-muted" />
                                <span>Actualizado: <strong>{new Date(patient.updated_at).toLocaleDateString()}</strong></span>
                            </div>
                        </div>

                        <div style={{ padding: '0.75rem 1.5rem' }}>
                            <button
                                onClick={() => onViewHistory?.(patient.cedula)}
                                className="btn btn-ghost w-full justify-between hover:text-accent"
                            >
                                <span>Ver historial completo</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <p className="text-muted">No hay pacientes registrados aún.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
