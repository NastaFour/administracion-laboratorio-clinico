import { useState, useEffect, useContext } from 'react'
import { Search, Download, Calendar, Trash2, Edit, Save, X, List, LayoutGrid, MessageSquare, MessageSquareOff } from 'lucide-react'
import { NotificationContext } from '../App'

export default function HistoryModule({ filterPatient }: { filterPatient?: string }) {
    const { showNotification } = useContext(NotificationContext)
    const [history, setHistory] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState(filterPatient || '')
    const [loading, setLoading] = useState(true)
    const [downloadingId, setDownloadingId] = useState<number | null>(null)
    const [editingOrder, setEditingOrder] = useState<any | null>(null)
    const [saving, setSaving] = useState(false)
    const [pdfFormat, setPdfFormat] = useState<'list' | 'grid'>('list')
    const [showObservations, setShowObservations] = useState(true)

    const loadHistory = async () => {
        setLoading(true)
        try {
            const data = await window.electronAPI.getHistory()
            setHistory(data)
        } catch (error) {
            console.error("Error cargando historial:", error)
            showNotification("Error al cargar los registros.", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadHistory()
    }, [])




    const handleDownloadPDF = async (orderId: number) => {
        setDownloadingId(orderId)
        try {
            const reportData = await window.electronAPI.getOrderReport(orderId)
            if (!reportData) throw new Error("No se pudo obtener la información de la orden.")

            const pdfData = {
                examName: reportData.results[0]?.exam_name || 'ESTUDIO GENERAL',
                patient: {
                    nombres: reportData.nombres,
                    apellidos: reportData.apellidos,
                    cedula: reportData.cedula,
                    sexo: reportData.sexo,
                    edad: reportData.edad
                },
                generalObservation: reportData.observaciones,
                results: reportData.results,
                edad: reportData.edad,
                format: pdfFormat,
                showObservations
            }

            await window.electronAPI.generatePDF(pdfData)
            showNotification("Reporte generado con éxito.", "success")
        } catch (error) {
            console.error(error)
            showNotification("Error al generar el reporte histórico.", "error")
        } finally {
            setDownloadingId(null)
        }
    }

    const handleEditOrder = async (orderId: number) => {
        try {
            const data = await window.electronAPI.getOrderReport(orderId)
            setEditingOrder(data)
        } catch (error) {
            console.error(error)
            showNotification("No se pudo cargar la orden para editar.", "error")
        }
    }

    const handleUpdateOrder = async () => {
        if (!editingOrder) return
        setSaving(true)
        try {
            // Aseguramos que los resultados tengan la estructura que espera el backend
            const resultsToSave = editingOrder.results.map((r: any) => ({
                parametro_id: r.parametro_id,
                value: String(r.value || '')
            }))

            await window.electronAPI.updateOrderResults({
                orderId: editingOrder.id,
                results: resultsToSave,
                observation: editingOrder.observaciones || ''
            })
            showNotification("Orden actualizada correctamente.", "success")
            setEditingOrder(null)
            loadHistory()
        } catch (error: any) {
            console.error("Error al actualizar orden:", error)
            showNotification(`Error al guardar: ${error.message || 'Error desconocido'}`, "error")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteOrder = async (id: number) => {
        if (confirm(`¿Está seguro de que desea eliminar permanentemente la orden #${id}?`)) {
            try {
                await window.electronAPI.deleteOrder(id)
                loadHistory()
                showNotification("Orden eliminada correctamente.", "success")
            } catch (error) {
                console.error(error)
                showNotification("Error al eliminar la orden.", "error")
            }
        }
    }

    useEffect(() => {
        if (filterPatient) setSearchTerm(filterPatient)
    }, [filterPatient])

    const filtered = history.filter(h =>
        h.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.cedula.includes(searchTerm)
    )

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial clínico...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                    <input
                        className="input"
                        placeholder="Buscar por paciente o cédula..."
                        style={{ paddingLeft: '40px', background: 'var(--bg-main)', width: '100%' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <button
                        className={`btn ${pdfFormat === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPdfFormat('list')}
                        style={{ padding: '0 12px', borderRadius: '8px', height: '36px', fontSize: '0.8rem', gap: '0.5rem' }}
                    >
                        <List size={16} /> <span>Lista</span>
                    </button>
                    <button
                        className={`btn ${pdfFormat === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPdfFormat('grid')}
                        style={{ padding: '0 12px', borderRadius: '8px', height: '36px', fontSize: '0.8rem', gap: '0.5rem' }}
                    >
                        <LayoutGrid size={16} /> <span>Cuadrícula</span>
                    </button>
                    <div style={{ width: '1px', background: 'var(--border)', margin: '4px 2px' }} />
                    <button
                        className={`btn ${showObservations ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setShowObservations(!showObservations)}
                        style={{ padding: '0 12px', borderRadius: '8px', height: '36px', fontSize: '0.8rem', gap: '0.5rem' }}
                    >
                        {showObservations ? (
                            <>
                                <MessageSquare size={16} /> <span>Con Observ.</span>
                            </>
                        ) : (
                            <>
                                <MessageSquareOff size={16} /> <span>Sin Observ.</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>Fecha</th>
                            <th style={{ padding: '1rem' }}>Paciente</th>
                            <th style={{ padding: '1rem' }}>Exámenes</th>
                            <th style={{ padding: '1rem' }}>Estatus</th>
                            <th style={{ padding: '1rem' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover:bg-main">
                                <td style={{ padding: '1rem', fontWeight: 600 }}>#{item.id}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={12} className="text-muted" />
                                            {new Date(item.fecha).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-muted">
                                            {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div className="font-bold">{item.paciente}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.cedula}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {item.examenes ? item.examenes.split(',').map((ex: string) => (
                                            <span key={ex} className="badge" style={{ background: 'rgba(59, 130, 246, 0.05)', color: 'var(--accent)', fontSize: '0.7rem' }}>
                                                {ex}
                                            </span>
                                        )) : <span className="text-muted">Sin exámenes</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{
                                        background: item.estatus === 'Completada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: item.estatus === 'Completada' ? 'var(--success)' : 'orange'
                                    }}>
                                        {item.estatus}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-ghost text-accent"
                                            style={{ padding: '8px' }}
                                            onClick={() => handleEditOrder(item.id)}
                                            title="Editar Resultados"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className={`btn btn-ghost ${downloadingId === item.id ? 'animate-pulse text-accent' : ''}`}
                                            style={{ padding: '8px' }}
                                            onClick={() => handleDownloadPDF(item.id)}
                                            disabled={downloadingId !== null}
                                            title="Descargar PDF"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost text-danger"
                                            style={{ padding: '8px' }}
                                            onClick={() => handleDeleteOrder(item.id)}
                                            title="Eliminar Orden"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No se encontraron registros clínicos guardados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Edición */}
            {
                editingOrder && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)'
                    }}>
                        <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Corregir Orden #{editingOrder.id}</h3>
                                    <p className="text-muted text-sm">{editingOrder.nombres} {editingOrder.apellidos} - {editingOrder.cedula}</p>
                                </div>
                                <button className="btn btn-ghost" onClick={() => setEditingOrder(null)}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {editingOrder.results.map((res: any, idx: number) => (
                                    <div key={`edit-param-${res.parametro_id || idx}`} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <label className="font-bold text-sm">{res.nombre}</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={editingOrder.results[idx].value}
                                            onChange={(e) => {
                                                const updatedResults = [...editingOrder.results];
                                                updatedResults[idx] = { ...updatedResults[idx], value: e.target.value };
                                                setEditingOrder({ ...editingOrder, results: updatedResults });
                                            }}
                                        />
                                        <div className="text-xs text-muted">{res.unidad || '-'}</div>
                                    </div>
                                ))}

                                <div style={{ marginTop: '1rem' }}>
                                    <label className="block text-sm font-bold mb-2">Observaciones / Comentario General</label>
                                    <textarea
                                        className="input"
                                        rows={4}
                                        style={{ height: 'auto' }}
                                        value={editingOrder.observaciones || ''}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, observaciones: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <button className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Cancelar</button>
                                <button
                                    className="btn btn-primary flex items-center gap-2"
                                    onClick={handleUpdateOrder}
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
