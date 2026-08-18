import { useState, useContext } from 'react'
import { X, User, CreditCard, Calendar, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import { useMask } from '../hooks/useMask'
import { NotificationContext } from '../App'

interface PatientFormProps {
    onClose: () => void
}

export default function PatientForm({ onClose }: PatientFormProps) {
    const { showNotification } = useContext(NotificationContext)
    const { maskCedula, maskPhone } = useMask()
    const [isSaving, setIsSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula: '',
        sexo: 'M',
        fecha_nacimiento: '',
        telefono: '',
        email: '',
        direccion: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.cedula || !formData.nombres) {
            return showNotification("Por favor complete los campos obligatorios", "error")
        }

        setIsSaving(true)
        try {
            await window.electronAPI.savePatient(formData)
            setShowSuccess(true)
            showNotification("Paciente registrado con éxito", "success")
            setTimeout(() => {
                onClose()
                // Evitamos el reload total para no perder el estado de la app
                // Si PatientModule está activo, se refrescará con su propio useEffect si se añade una prop de refresh
            }, 1000)
        } catch (error: any) {
            console.error("Error al registrar paciente:", error)
            showNotification(`Error: ${error.message || 'Cédula duplicada u otro error de DB'}`, "error")
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        let maskedValue = value

        if (name === 'cedula') maskedValue = maskCedula(value)
        if (name === 'telefono') maskedValue = maskPhone(value)

        setFormData(prev => ({ ...prev, [name]: maskedValue }))
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '650px', padding: '2.5rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
                    className="btn btn-ghost"
                    disabled={isSaving}
                >
                    <X size={24} />
                </button>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Registro de Paciente</h2>
                    <p className="text-muted">Ingrese los datos clínicos del nuevo ingreso</p>
                </div>

                {showSuccess ? (
                    <div style={{ textAlign: 'center', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: 'var(--success)', color: 'white', padding: '1.5rem', borderRadius: '50%', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                            <CheckCircle2 size={64} />
                        </div>
                        <h3 style={{ color: 'var(--success)', fontSize: '1.5rem' }}>¡Completado con éxito!</h3>
                        <p className="text-muted">Cerrando formulario...</p>
                    </div>
                ) : (
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} onSubmit={handleSubmit}>
                        <div className="grid-cols-2">
                            <div className="form-group">
                                <label className="label">Nombres</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input name="nombres" value={formData.nombres} onChange={handleChange} type="text" className="input" placeholder="Ej: Juan Antonio" style={{ paddingLeft: '40px' }} required autoFocus />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Apellidos</label>
                                <input name="apellidos" value={formData.apellidos} onChange={handleChange} type="text" className="input" placeholder="Ej: Perez Sosa" required />
                            </div>
                        </div>

                        <div className="grid-cols-2">
                            <div className="form-group">
                                <label className="label">Cédula / Pasaporte</label>
                                <div style={{ position: 'relative' }}>
                                    <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input name="cedula" value={formData.cedula} onChange={handleChange} type="text" className="input" placeholder="Sin puntos ni guiones" style={{ paddingLeft: '40px' }} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Sexo Biológico</label>
                                <select name="sexo" value={formData.sexo} onChange={handleChange} className="input">
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-cols-2">
                            <div className="form-group">
                                <label className="label">Fecha de Nacimiento</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} type="date" className="input" style={{ paddingLeft: '40px' }} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Teléfono Móvil</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input name="telefono" value={formData.telefono} onChange={handleChange} type="tel" className="input" placeholder="04xx-xxxxxxx" style={{ paddingLeft: '40px' }} />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Dirección de Habitación</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                                <textarea name="direccion" value={formData.direccion} onChange={handleChange} className="input" placeholder="Ciudad, sector, calle..." style={{ paddingLeft: '40px', minHeight: '80px', paddingTop: '10px' }}></textarea>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '52px', fontSize: '1rem' }} disabled={isSaving}>
                                {isSaving ? 'Registrando...' : 'Finalizar Registro'}
                            </button>
                            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }} disabled={isSaving}>Cancelar</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
