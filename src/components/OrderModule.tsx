import { useState, useEffect, useRef } from 'react'
import { X, Search, Beaker, Save, Keyboard, User } from 'lucide-react'

interface Exam {
    id: string
    nombre: string
    categoria: string
    precio: number
}

export default function OrderModule() {
    const [selectedExams, setSelectedExams] = useState<Exam[]>([])
    const [examsCatalog, setExamsCatalog] = useState<Exam[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [selectedPatientId, setSelectedPatientId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        window.electronAPI.getExams().then(setExamsCatalog).catch(console.error)
        window.electronAPI.getPatients().then(setPatients).catch(console.error)
    }, [])

    const filteredExams = examsCatalog.filter(e =>
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedExams.find(se => se.id === e.id)
    )

    const addExam = (exam: Exam) => {
        setSelectedExams([...selectedExams, exam])
        setSearchTerm('')
        setShowDropdown(false)
        inputRef.current?.focus()
    }

    const removeExam = (id: string) => {
        setSelectedExams(selectedExams.filter(e => e.id !== id))
    }

    const handleCreateOrder = async () => {
        if (!selectedPatientId || selectedExams.length === 0) {
            alert("Seleccione un paciente y al menos un examen.")
            return
        }

        setIsSaving(true)
        try {
            // En este sistema, la "orden" se crea al guardar los resultados.
            // Para "Nueva Orden", lo que hacemos es preparar la captura.
            // Pero según el flujo, si el usuario está aquí es porque va a procesar.
            // Vamos a avisar que la orden se confirma al capturar los resultados en la pestaña 'Resultados'.
            alert("Orden preparada. Ahora pase a la pestaña 'Resultados' para capturar los valores.");
            // Podríamos automatizar el cambio de pestaña enviando un evento, 
            // pero mantenemos la simplicidad por ahora.
        } catch (error) {
            alert("Error al crear la orden.")
        } finally {
            setIsSaving(false)
        }
    }

    const totalPrice = selectedExams.reduce((acc, curr) => acc + curr.precio, 0)
    const selectedPatient = patients.find(p => p.id.toString() === selectedPatientId)

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div className="card">
                <div className="flex-between mb-6">
                    <h3>Selección de Exámenes</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Keyboard size={14} />
                        <span>Presiona <strong>Alt + N</strong> para buscar</span>
                    </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="input"
                        placeholder="Escribe el nombre del examen..."
                        style={{ paddingLeft: '40px' }}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                    />

                    {showDropdown && searchTerm && (
                        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '8px', padding: '8px' }}>
                            {filteredExams.length > 0 ? (
                                filteredExams.map(exam => (
                                    <button
                                        key={exam.id}
                                        className="btn btn-ghost w-full justify-between"
                                        onClick={() => addExam(exam)}
                                    >
                                        <div className="flex gap-3">
                                            <Beaker size={16} className="text-accent" />
                                            <span>{exam.nombre}</span>
                                        </div>
                                        <span className="badge" style={{ background: 'var(--bg-main)' }}>${exam.precio}</span>
                                    </button>
                                ))
                            ) : (
                                <p className="text-muted" style={{ padding: '8px', textAlign: 'center' }}>No se encontraron exámenes</p>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedExams.length > 0 ? (
                        selectedExams.map(exam => (
                            <div key={exam.id} className="flex-between" style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                                <div className="flex gap-4">
                                    <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '6px' }}>
                                        <Beaker size={18} className="text-accent" />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>{exam.nombre}</p>
                                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>{exam.categoria}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span style={{ fontWeight: 700 }}>${exam.precio.toFixed(2)}</span>
                                    <button onClick={() => removeExam(exam.id)} className="text-danger hover:bg-danger/10 p-1 rounded">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--border)', borderRadius: '12px' }}>
                            <p className="text-muted">No has seleccionado ningún examen aún</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ height: 'fit-content' }}>
                <h3 className="mb-4">Resumen de Orden</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="label">Paciente</label>
                        <select
                            className="input"
                            value={selectedPatientId}
                            onChange={e => setSelectedPatientId(e.target.value)}
                        >
                            <option value="">Seleccione...</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>
                            ))}
                        </select>
                    </div>

                    {selectedPatient && (
                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', display: 'flex', gap: '0.75rem' }}>
                            <User className="text-accent" size={20} />
                            <div style={{ fontSize: '0.85rem' }}>
                                <p style={{ fontWeight: 600 }}>{selectedPatient.nombres} {selectedPatient.apellidos}</p>
                                <p className="text-muted">C.I: {selectedPatient.cedula}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex-between">
                        <span className="text-muted">Cantidad Exámenes</span>
                        <span style={{ fontWeight: 500 }}>{selectedExams.length}</span>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                    <div className="flex-between" style={{ fontSize: '1.25rem' }}>
                        <span style={{ fontWeight: 700 }}>Total</span>
                        <span style={{ fontWeight: 800, color: 'var(--accent)' }}>${totalPrice.toFixed(2)}</span>
                    </div>

                    <button
                        className="btn btn-primary w-full mt-4"
                        style={{ height: '48px' }}
                        disabled={selectedExams.length === 0 || !selectedPatientId || isSaving}
                        onClick={handleCreateOrder}
                    >
                        <Save size={18} />
                        {isSaving ? 'Procesando...' : 'Confirmar y Generar Orden'}
                    </button>
                </div>
            </div>
        </div>
    )
}
