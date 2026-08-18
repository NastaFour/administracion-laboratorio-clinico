import { useState, useEffect, useContext } from 'react'
import { Save, AlertTriangle, CheckCircle, FileDown, DollarSign, List, LayoutGrid, MessageSquare, MessageSquareOff, RefreshCw, X } from 'lucide-react'
import { NotificationContext } from '../App'

interface ResultParam {
    id: string
    name: string
    unit: string
    min: number
    max: number
    value: string
}

export default function ResultEntryModule() {
    const { showNotification } = useContext(NotificationContext)
    const [params, setParams] = useState<ResultParam[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedOrderId, setLastSavedOrderId] = useState<number | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [patients, setPatients] = useState<any[]>([])
    const [exams, setExams] = useState<any[]>([])
    const [selectedPatientId, setSelectedPatientId] = useState('')
    const [selectedExamId, setSelectedExamId] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [generalObservation, setGeneralObservation] = useState('')
    const [paymentStatus, setPaymentStatus] = useState<'Pendiente' | 'Pagado'>('Pendiente')
    const [totalPrice, setTotalPrice] = useState(0)
    const [selectedSample, setSelectedSample] = useState('')
    const [pdfFormat, setPdfFormat] = useState<'list' | 'grid'>('list')
    const [showObservations, setShowObservations] = useState(true)

    useEffect(() => {
        window.electronAPI?.getPatients().then(setPatients).catch(console.error)
        window.electronAPI?.getExams().then(setExams).catch(console.error)
    }, [])

    const handlePatientChange = (id: string) => {
        const p = patients.find(p => p.id.toString() === id)
        setSelectedPatientId(id)
        setSelectedPatient(p)
        setLastSavedOrderId(null)
    }

    const handleExamChange = (examId: string) => {
        const exam = exams.find(e => e.id.toString() === examId)
        setSelectedExamId(examId)
        setTotalPrice(exam ? exam.precio : 0)
        setSelectedSample(exam ? (exam.muestra || 'Sangre') : '')
        setLastSavedOrderId(null)
    }

    useEffect(() => {
        const loadParams = async () => {
            if (!selectedExamId || !selectedPatient) {
                setParams([])
                return
            }

            try {
                const dbParams = await window.electronAPI.getParams({
                    examId: parseInt(selectedExamId),
                    sexo: selectedPatient.sexo
                })

                const mappedParams: ResultParam[] = dbParams.map((p: any) => ({
                    id: p.id.toString(),
                    name: p.nombre,
                    unit: p.unidad || '',
                    min: p.valor_min,
                    max: p.valor_max,
                    value: ''
                }))
                setParams(mappedParams)
            } catch (error) {
                console.error("Error cargando parámetros:", error)
            }
        }

        loadParams()
    }, [selectedExamId, selectedPatient])

    const handleValueChange = (id: string, value: string) => {
        setParams(prev => prev.map(p => p.id === id ? { ...p, value } : p))
    }

    const getStatusColor = (param: ResultParam) => {
        if (!param.value) return 'var(--border)'
        if (param.min === null || param.max === null) return 'var(--border)'

        const val = parseFloat(param.value)
        if (isNaN(val)) return 'var(--border)'
        if (val < param.min || val > param.max) return 'var(--danger)'
        return 'var(--success)'
    }


    const handleSave = async () => {
        if (!selectedPatientId || !selectedExamId || params.length === 0) {
            return showNotification("Seleccione paciente y examen primero.", "error")
        }

        setIsSaving(true)
        try {
            const results = params.map(p => ({
                parametro_id: parseInt(p.id),
                value: p.value || ''
            }))

            const response = await window.electronAPI.saveResults({
                patientId: parseInt(selectedPatientId),
                examId: parseInt(selectedExamId),
                results,
                observation: generalObservation,
                precioTotal: totalPrice,
                estatusPago: paymentStatus
            });

            const orderId = typeof response === 'object' ? response.lastInsertRowid : response;
            setLastSavedOrderId(orderId);

            showNotification("¡Resultados guardados exitosamente!", "success")
        } catch (error) {
            console.error("Error al guardar:", error)
            showNotification("Error al guardar los resultados.", "error")
        } finally {
            setIsSaving(false)
        }
    }



    const handleGeneratePDF = async () => {
        if (!lastSavedOrderId) return;
        setIsGenerating(true)

        try {
            const reportData = await window.electronAPI.getOrderReport(lastSavedOrderId)
            if (!reportData) throw new Error("No se pudo recuperar la orden guardada.")

            const pdfData = {
                examName: reportData.results[0]?.exam_name || 'ESTUDIO GENERAL',
                patient: {
                    nombres: reportData.nombres,
                    apellidos: reportData.apellidos,
                    cedula: reportData.cedula,
                    sexo: reportData.sexo,
                    edad: reportData.edad
                },
                generalObservation: reportData.observaciones || generalObservation,
                edad: reportData.edad,
                format: pdfFormat,
                showObservations,
                sample: selectedSample
            }

            await window.electronAPI.generatePDF(pdfData)
            showNotification("Reporte generado en Documentos.", "success")
        } catch (error) {
            console.error("Error al generar PDF:", error)
            showNotification("Error al generar el PDF.", "error")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="card fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 className="text-accent" style={{ marginBottom: '0.75rem' }}>Captura de Resultados</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <select
                                    className="input"
                                    value={selectedExamId}
                                    onChange={(e) => handleExamChange(e.target.value)}
                                    style={{ background: 'var(--bg-card)', height: '42px' }}
                                >
                                    <option value="">Seleccione un examen...</option>
                                    {exams.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1.2 }}>
                                <select
                                    className="input"
                                    value={selectedPatientId}
                                    onChange={(e) => handlePatientChange(e.target.value)}
                                    style={{ background: 'var(--bg-card)', height: '42px' }}
                                >
                                    <option value="">Seleccione un paciente...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} ({p.cedula})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="btn btn-ghost" title="Refrescar Listas" onClick={() => {
                                    window.electronAPI.getPatients().then(setPatients);
                                    window.electronAPI.getExams().then(setExams);
                                    showNotification("Datos actualizados", "success");
                                }} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '10px' }}>
                                    <RefreshCw size={18} />
                                </button>
                                <button className="btn btn-ghost" title="Limpiar Todo" onClick={() => {
                                    setSelectedExamId('');
                                    setSelectedPatientId('');
                                    setSelectedPatient(null);
                                    setParams([]);
                                    setGeneralObservation('');
                                }} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '10px' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {selectedExamId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase' }}>Muestra:</span>
                                <input
                                    value={selectedSample}
                                    onChange={e => setSelectedSample(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.85rem', width: '100px', fontWeight: 600 }}
                                />
                            </div>
                        )}

                        {/* Opciones PDF (Iconos limpios) */}
                        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <button
                                className={`btn ${pdfFormat === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setPdfFormat('list')}
                                title="Formato Lista"
                                style={{ padding: '8px', borderRadius: '7px', height: '34px' }}
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={`btn ${pdfFormat === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setPdfFormat('grid')}
                                title="Formato Cuadrícula"
                                style={{ padding: '8px', borderRadius: '7px', height: '34px' }}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <div style={{ width: '1px', background: 'var(--border)', margin: '4px 2px' }} />
                            <button
                                className={`btn ${showObservations ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setShowObservations(!showObservations)}
                                title={showObservations ? "Ocultar Observaciones en PDF" : "Mostrar Observaciones en PDF"}
                                style={{ padding: '8px', borderRadius: '7px', height: '34px' }}
                            >
                                {showObservations ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {/* Pago */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <DollarSign size={16} className="text-accent" />
                                <span style={{ fontWeight: 800, fontSize: '1rem' }}>${totalPrice.toFixed(2)}</span>
                            </div>
                            <select
                                className="input"
                                style={{ width: '110px', height: '30px', padding: '0 6px', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                                value={paymentStatus}
                                onChange={(e: any) => setPaymentStatus(e.target.value)}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pagado">Pagado</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            {lastSavedOrderId && (
                                <button
                                    className="btn btn-ghost text-accent"
                                    onClick={handleGeneratePDF}
                                    disabled={isGenerating}
                                    style={{ border: '1.5px solid var(--accent)', padding: '0 1.25rem', height: '40px', borderRadius: '10px' }}
                                >
                                    <FileDown size={18} />
                                    <span style={{ marginLeft: '6px' }}>{isGenerating ? '...' : 'PDF'}</span>
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={isSaving || params.length === 0}
                                style={{ padding: '0 1.5rem', height: '40px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                            >
                                <Save size={18} />
                                <span style={{ marginLeft: '6px' }}>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {params.length > 0 ? (
                    <>
                        <header style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr', padding: '0 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <div>Parámetro</div>
                            <div>Resultado</div>
                            <div>Unidad</div>
                            <div>Rango de Referencia</div>
                        </header>

                        {params.map(param => {
                            const statusColor = getStatusColor(param)
                            const val = parseFloat(param.value)
                            const isOut = param.value && (val < param.min || val > param.max)

                            return (
                                <div
                                    key={param.id}
                                    className="card"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        borderLeft: `4px solid ${statusColor}`,
                                        background: isOut ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                                    }}
                                >
                                    <div style={{ fontWeight: 500 }}>{param.name}</div>
                                    <div>
                                        <input
                                            type="text"
                                            className="input"
                                            value={param.value || ''}
                                            onChange={(e) => handleValueChange(param.id, e.target.value)}
                                            style={{
                                                width: '120px',
                                                borderColor: statusColor,
                                                boxShadow: isOut ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none',
                                                textAlign: 'center'
                                            }}
                                            placeholder="..."
                                        />
                                    </div>
                                    <div className="text-muted">{param.unit}</div>
                                    <div className="flex gap-2 items-center">
                                        <span style={{ fontSize: '0.875rem' }}>
                                            {param.min !== null && param.max !== null ? `${param.min} - ${param.max}` : (param.unit ? 'Negativo' : 'Normal')}
                                        </span>
                                        {param.min !== null && isOut && <AlertTriangle size={14} className="text-danger" />}
                                        {param.value && !isOut && !isNaN(val) && param.min !== null && <CheckCircle size={14} className="text-success" />}
                                    </div>
                                </div>
                            )
                        })}

                        <div className="card" style={{ marginTop: '1rem', borderTop: '2px solid var(--accent)' }}>
                            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Resultado / Observación General</h4>
                            <textarea
                                className="input"
                                style={{ minHeight: '100px', resize: 'vertical' }}
                                placeholder="Escriba aquí el resultado final o comentarios adicionales..."
                                value={generalObservation}
                                onChange={(e) => setGeneralObservation(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dotted var(--border)' }}>
                        <p className="text-muted">
                            {!selectedPatient
                                ? "Seleccione un paciente para comenzar."
                                : !selectedExamId
                                    ? "Ahora seleccione el tipo de examen."
                                    : "Cargando parámetros..."}
                        </p>
                    </div>
                )}
            </div>
        </div >
    )
}
