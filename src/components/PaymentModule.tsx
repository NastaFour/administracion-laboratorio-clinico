import { useState, useEffect, useContext } from 'react'
import { DollarSign, Search, Clock, AlertCircle } from 'lucide-react'
import { NotificationContext } from '../App'

interface PaymentOrder {
    id: number
    paciente: string
    cedula: string
    fecha: string
    examenes: string
    precio_total: number
    estatus_pago: 'Pendiente' | 'Pagado'
}

export default function PaymentModule() {
    const { showNotification } = useContext(NotificationContext)
    const [orders, setOrders] = useState<PaymentOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState<'Todos' | 'Pendiente' | 'Pagado'>('Pendiente')

    const loadOrders = async () => {
        setLoading(true)
        try {
            const data = await window.electronAPI.getHistory()
            setOrders(data)
        } catch (error) {
            console.error("Error al cargar cobros:", error)
            showNotification("No se pudieron cargar los datos de pago", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const handleTogglePayment = async (orderId: any, currentStatus: string) => {
        const newStatus = currentStatus === 'Pendiente' ? 'Pagado' : 'Pendiente'
        console.log(`[Payment] Intentando cambiar estatus Orden #${orderId} de ${currentStatus} a ${newStatus}`);

        try {
            const numericId = Number(orderId);
            if (isNaN(numericId)) throw new Error("ID de orden no válido");

            await window.electronAPI.updatePaymentStatus({
                orderId: numericId,
                status: newStatus
            })

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estatus_pago: newStatus as any } : o))
            showNotification(`Orden #${orderId} marcada como ${newStatus}`, "success")
        } catch (error: any) {
            console.error("[Payment] Error:", error);
            showNotification(`Error: ${error.message || 'No se pudo actualizar el pago'}`, "error")
        }
    }

    const filtered = orders.filter(o => {
        const matchesSearch = o.paciente.toLowerCase().includes(searchTerm.toLowerCase()) || o.cedula.includes(searchTerm)
        const matchesFilter = filter === 'Todos' || o.estatus_pago === filter
        return matchesSearch && matchesFilter
    })

    const totalPending = orders
        .filter(o => o.estatus_pago === 'Pendiente')
        .reduce((acc, curr) => acc + (curr.precio_total || 0), 0)

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }} className="fade-in">Cargando gestión financiera...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }} className="fade-in">
            {/* Resumen de Caja Único (Solo Pendiente) */}
            <div style={{ maxWidth: '400px' }}>
                <div className="card" style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '160px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '16px', color: '#f87171' }}>
                            <DollarSign size={28} />
                        </div>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Por Cobrar</span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.25rem', color: 'white' }}>${totalPending.toFixed(2)}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Deuda acumulada de pacientes</p>
                    </div>
                </div>
            </div>

            {/* Controles y Búsqueda */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Buscar por nombre o cédula del paciente..."
                        style={{ paddingLeft: '50px', height: '50px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {(['Pendiente', 'Pagado', 'Todos'] as const).map(f => (
                        <button
                            key={f}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                padding: '8px 20px',
                                fontSize: '0.85rem',
                                borderRadius: '8px',
                                boxShadow: filter === f ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                            }}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Transacciones */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-main)' }}>
                            <th style={{ padding: '1.25rem' }}>ID Orden</th>
                            <th style={{ padding: '1.25rem' }}>Paciente</th>
                            <th style={{ padding: '1.25rem' }}>Estudios</th>
                            <th style={{ padding: '1.25rem' }}>Monto</th>
                            <th style={{ padding: '1.25rem' }}>Estado</th>
                            <th style={{ padding: '1.25rem', textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map(order => (
                            <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>#{order.id}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: 600 }}>{order.paciente}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {order.cedula}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {order.examenes}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: 800, fontSize: '1.1rem' }}>
                                    ${(order.precio_total || 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span className="badge" style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: order.estatus_pago === 'Pagado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: order.estatus_pago === 'Pagado' ? 'var(--success)' : 'var(--danger)',
                                        border: `1px solid ${order.estatus_pago === 'Pagado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {order.estatus_pago === 'Pagado' ? <DollarSign size={14} /> : <Clock size={14} />}
                                        {order.estatus_pago}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <button
                                        className="btn"
                                        style={{
                                            padding: '8px 16px',
                                            background: order.estatus_pago === 'Pagado' ? 'var(--bg-main)' : 'var(--accent)',
                                            color: order.estatus_pago === 'Pagado' ? 'var(--text-main)' : 'white',
                                            border: '1px solid var(--border)',
                                            fontSize: '0.8rem'
                                        }}
                                        onClick={() => handleTogglePayment(order.id, order.estatus_pago)}
                                    >
                                        {order.estatus_pago === 'Pagado' ? 'Revertir a Pendiente' : 'Procesar Pago'}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} style={{ padding: '5rem', textAlign: 'center' }}>
                                    <div style={{ opacity: 0.3, marginBottom: '1.5rem' }}>
                                        <AlertCircle size={60} style={{ margin: '0 auto' }} />
                                    </div>
                                    <h3 style={{ color: 'var(--text-muted)' }}>No hay movimientos financieros</h3>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
