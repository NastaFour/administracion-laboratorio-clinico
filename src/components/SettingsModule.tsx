import { useState, useEffect, useContext } from 'react'
import { Database, Plus, Save, Edit, Edit2, Trash2, X, RefreshCw, FlaskConical, List, Download, Upload, ShieldCheck, Building2, UserCircle2, MapPin, Settings, Eye } from 'lucide-react'
import { NotificationContext } from '../App'

export default function SettingsModule() {
    const { showNotification } = useContext(NotificationContext)
    const [exams, setExams] = useState<any[]>([])
    const [newExam, setNewExam] = useState({ nombre: '', categoria: 'Hematología', precio: '0', muestra: 'Sangre' })
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editPrice, setEditPrice] = useState('0')
    const [editMuestra, setEditMuestra] = useState('')
    const [selectedExamForParams, setSelectedExamForParams] = useState<any>(null)
    const [currentParams, setCurrentParams] = useState<any[]>([])
    const [newParam, setNewParam] = useState({ nombre: '', unidad: '', min: '', max: '', sexo: 'Ambos', edad_min: '0', edad_max: '120' })
    const [isActionPending, setIsActionPending] = useState(false)
    const [showLabConfig, setShowLabConfig] = useState(false)
    const [showConflictModal, setShowConflictModal] = useState(false)
    const [importConflictData, setImportConflictData] = useState<{ conflicts: any[], filePath: string } | null>(null)
    const [labConfig, setLabConfig] = useState<Record<string, string>>({
        lab_nombre: '',
        lab_direccion: '',
        lab_sedes: '',
        prof_nombre: '',
        prof_titulo: '',
        prof_cedula: '',
        prof_creds: '',
        prof_especialidad: ''
    })

    const loadLabConfig = async () => {
        try {
            const config = await window.electronAPI.getLabConfig()
            setLabConfig(prev => ({ ...prev, ...config }))
        } catch (error) {
            console.error("Error cargando configuración:", error)
        }
    }

    const loadExams = async () => {
        try {
            const data = await window.electronAPI.getExams()
            setExams(data)
        } catch (error) {
            console.error("Error cargando exámenes:", error)
        }
    }

    const loadParams = async (examId: number) => {
        try {
            const data = await window.electronAPI.getParams({ examId })
            setCurrentParams(data)
        } catch (error) {
            console.error("Error cargando parámetros:", error)
        }
    }

    useEffect(() => {
        loadExams()
        loadLabConfig()
    }, [])

    useEffect(() => {
        if (selectedExamForParams) {
            loadParams(selectedExamForParams.id)
        } else {
            setCurrentParams([])
        }
    }, [selectedExamForParams])

    const handleExport = async () => {
        // Chequeo de seguridad: intentar acceder a la API de diferentes formas si falla
        const api = window.electronAPI;
        if (!api || typeof api.exportFullBackup !== 'function') {
            return showNotification("Sistema en espera de reinicio. Por favor, cierre el programa y ábralo manualmente para activar la exportación.", "error")
        }

        try {
            setIsActionPending(true)
            const result = await api.exportFullBackup()
            if (result) {
                showNotification(`Copia de seguridad guardada con éxito.`, 'success')
            }
        } catch (error: any) {
            console.error("Error en exportación:", error)
            showNotification(`Error: ${error.message || 'La base de datos está siendo utilizada por otro proceso.'}`, 'error')
        } finally {
            setIsActionPending(false)
        }
    }

    const [showImportOptions, setShowImportOptions] = useState(false);

    const handleImport = async (mode?: 'replace' | 'preview') => {
        const api = window.electronAPI;
        if (!api || typeof api.importFullBackup !== 'function') {
            return showNotification("Sistema en espera de reinicio. Por favor, cierre el programa y ábralo manualmente para activar la importación.", "error")
        }

        if (!mode) {
            setShowImportOptions(true);
            return;
        }

        setShowImportOptions(false);
        try {
            setIsActionPending(true)

            if (mode === 'replace') {
                if (!confirm("⚠️ ¿Está SEGURO? Esta opción borrará sus datos actuales para poner los del respaldo.")) {
                    setIsActionPending(false);
                    return;
                }
                await api.importFullBackup({ mode: 'replace' })
            } else {
                const result = await api.importFullBackup({ mode: 'preview' })
                if (result && result.conflicts.length > 0) {
                    setImportConflictData({ conflicts: result.conflicts, filePath: result.filePath })
                    setShowConflictModal(true)
                } else if (result) {
                    await api.importFullBackup({ mode: 'merge' })
                    showNotification("Fusión completada sin conflictos.", "success")
                    loadExams()
                }
            }
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error')
        } finally {
            setIsActionPending(false)
        }
    }

    const handleWipeData = async () => {
        if (confirm("⚠️ ATENCIÓN: Esta acción eliminará permanentemente TODOS los pacientes, órdenes y resultados del sistema. El catálogo de estudios y la configuración se mantendrán. ¿Está ABSOLUTAMENTE SEGURO?")) {
            const secondConfirm = prompt("Para confirmar la eliminación total, escriba 'BORRAR TODO' en el siguiente cuadro:")
            if (secondConfirm === 'BORRAR TODO') {
                try {
                    setIsActionPending(true)
                    await window.electronAPI.wipeData()
                    showNotification("Base de datos de pacientes limpiada con éxito.", "success")
                    window.location.reload();
                } catch (error: any) {
                    showNotification(`Error al limpiar: ${error.message}`, "error")
                } finally {
                    setIsActionPending(false)
                }
            } else {
                if (secondConfirm !== null) showNotification("Acción cancelada. El texto de confirmación no coincide.", "error")
            }
        }
    }

    const handleUpdateLabConfig = async () => {
        try {
            setIsActionPending(true)
            await window.electronAPI.updateLabConfig(labConfig)
            showNotification("Datos del laboratorio actualizados con éxito.", "success")
        } catch (error) {
            showNotification("Error al guardar configuración.", "error")
        } finally {
            setIsActionPending(false)
        }
    }

    const handleUpdateExam = async (id: number) => {
        try {
            await window.electronAPI.updateExam({
                id,
                precio: parseFloat(editPrice) || 0,
                muestra: editMuestra
            })
            setEditingId(null)
            loadExams()
            showNotification("Estudio actualizado con éxito.", 'success')
        } catch (error) {
            showNotification("Error al actualizar estudio.", 'error')
        }
    }

    const handleAddExam = async () => {
        if (!newExam.nombre) return showNotification("El nombre del estudio no puede estar vacío", 'error')

        setIsActionPending(true)
        try {
            const precioNum = parseFloat(newExam.precio);
            if (isNaN(precioNum)) {
                showNotification("El costo debe ser un número válido", "error");
                return;
            }

            const response = await window.electronAPI.addExam({
                nombre: newExam.nombre,
                categoria: newExam.categoria,
                muestra: newExam.muestra,
                precio: precioNum
            })

            if (response) {
                setNewExam({ nombre: '', categoria: 'Hematología', precio: '0', muestra: 'Sangre' })
                loadExams()
                showNotification("Estudio registrado correctamente en el sistema.", 'success')
            }
        } catch (error: any) {
            console.error("Error en handleAddExam:", error);
            showNotification(`Error al registrar estudio: ${error.message || 'Error de base de datos'}`, 'error')
        } finally {
            setIsActionPending(false)
        }
    }

    const handleDeleteExam = async (id: number, nombre: string) => {
        if (confirm(`¿Eliminar "${nombre}"? Esta acción ocultará el estudio pero no borrará resultados previos.`)) {
            try {
                await window.electronAPI.deleteExam(id)
                loadExams()
                showNotification("Estudio desactivado.", 'success')
            } catch (error) {
                showNotification("Error al eliminar.", 'error')
            }
        }
    }

    const handleAddParam = async () => {
        if (!selectedExamForParams || !newParam.nombre) return showNotification("Nombre de parámetro requerido", 'error')
        setIsActionPending(true)
        try {
            const examIdNumber = typeof selectedExamForParams.id === 'string'
                ? parseInt(selectedExamForParams.id)
                : selectedExamForParams.id;

            await window.electronAPI.addParam({
                examId: examIdNumber,
                nombre: newParam.nombre,
                unidad: newParam.unidad,
                min: newParam.min ? parseFloat(newParam.min) : undefined,
                max: newParam.max ? parseFloat(newParam.max) : undefined,
                sexo: newParam.sexo,
                edad_min: parseInt(newParam.edad_min),
                edad_max: parseInt(newParam.edad_max)
            })
            setNewParam({ nombre: '', unidad: '', min: '', max: '', sexo: 'Ambos', edad_min: '0', edad_max: '120' })
            loadParams(examIdNumber)
            showNotification("Parámetro añadido.", 'success')
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error')
        } finally {
            setIsActionPending(false)
        }
    }

    const handleDeleteParam = async (id: number) => {
        if (confirm("¿Eliminar este parámetro?")) {
            try {
                await window.electronAPI.deleteParam(id)
                loadParams(selectedExamForParams.id)
                showNotification("Parámetro removido.", 'success')
            } catch (error) {
                showNotification("Error al eliminar.", 'error')
            }
        }
    }

    const [viewingExam, setViewingExam] = useState<any | null>(null)

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }} className="fade-in">

            {/* Modal de Vista Rápida */}
            {viewingExam && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
                    <div className="card fade-in" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--accent)' }}>
                        <div className="flex-between mb-8">
                            <h3 style={{ margin: 0 }}>Estructura: {viewingExam.nombre}</h3>
                            <button className="btn btn-ghost" onClick={() => setViewingExam(null)} style={{ background: 'var(--bg-main)', borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}><X size={18} /></button>
                        </div>
                        <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                                    <tr>
                                        <th style={{ fontSize: '0.7rem', padding: '0.5rem' }}>PARÁMETRO</th>
                                        <th style={{ fontSize: '0.7rem', padding: '0.5rem', textAlign: 'center' }}>RANGO / INFO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentParams.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ fontWeight: 600, padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{p.nombre}</td>
                                            <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>
                                                {p.valor_min !== null ? (
                                                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{p.valor_min} - {p.valor_max} {p.unidad || ''}</span>
                                                ) : (
                                                    <span style={{ opacity: 0.6 }}>Cualitativo / Texto</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {currentParams.length === 0 && <tr><td colSpan={2} className="text-center py-8 opacity-40">Cargando parámetros...</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '2rem', textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                onClick={() => {
                                    setSelectedExamForParams(viewingExam);
                                    setViewingExam(null);
                                    loadParams(viewingExam.id);
                                }}
                            >
                                <Edit size={14} /> Gestionar Parámetros
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => setShowLabConfig(!showLabConfig)}
                    style={{ fontSize: '0.8rem', opacity: 0.6, gap: '0.5rem' }}
                >
                    <Settings size={14} /> {showLabConfig ? 'Ocultar Configuración de Reportes' : 'Mostrar Configuración de Reportes'}
                </button>
            </div>

            {/* Configuración de Laboratorio y Profesional */}
            {showLabConfig && (
                <div className="card" style={{ border: '2px solid var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <Building2 className="text-accent" size={24} />
                        <h2 style={{ margin: 0 }}>Configuración de Reportes y Laboratorio</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Datos del Laboratorio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <MapPin size={18} className="text-accent" />
                                <h4 style={{ margin: 0 }}>Identificación del Laboratorio</h4>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Nombre Comercial del Laboratorio</label>
                                <input
                                    className="input"
                                    value={labConfig.lab_nombre}
                                    onChange={e => setLabConfig({ ...labConfig, lab_nombre: e.target.value })}
                                    placeholder="NOMBRE DEL LABORATORIO"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Dirección Principal</label>
                                <input
                                    className="input"
                                    value={labConfig.lab_direccion}
                                    onChange={e => setLabConfig({ ...labConfig, lab_direccion: e.target.value })}
                                    placeholder="Calle, Edificio, Ciudad"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Sedes / Ubicaciones adicionales</label>
                                <input
                                    className="input"
                                    value={labConfig.lab_sedes}
                                    onChange={e => setLabConfig({ ...labConfig, lab_sedes: e.target.value })}
                                    placeholder="Sede A - Sede B - Sede C"
                                />
                            </div>
                        </div>

                        {/* Datos del Bioanalista / Profesional */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <UserCircle2 size={18} className="text-accent" />
                                <h4 style={{ margin: 0 }}>Datos del Profesional (Firma)</h4>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Nombre del Bioanalista</label>
                                <input
                                    className="input"
                                    value={labConfig.prof_nombre}
                                    onChange={e => setLabConfig({ ...labConfig, prof_nombre: e.target.value })}
                                    placeholder="Dr/MSc. Nombre Apellido"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Títulos / Grados</label>
                                    <input
                                        className="input"
                                        value={labConfig.prof_titulo}
                                        onChange={e => setLabConfig({ ...labConfig, prof_titulo: e.target.value })}
                                        placeholder="Lic. en Bioanálisis"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Cédula ID</label>
                                    <input
                                        className="input"
                                        value={labConfig.prof_cedula}
                                        onChange={e => setLabConfig({ ...labConfig, prof_cedula: e.target.value })}
                                        placeholder="V-00.000.000"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Especialidad</label>
                                    <input
                                        className="input"
                                        value={labConfig.prof_especialidad}
                                        onChange={e => setLabConfig({ ...labConfig, prof_especialidad: e.target.value })}
                                        placeholder="MICROBIOLOGO"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Credenciales (MSDS / CBZ)</label>
                                    <input
                                        className="input"
                                        value={labConfig.prof_creds}
                                        onChange={e => setLabConfig({ ...labConfig, prof_creds: e.target.value })}
                                        placeholder="MSDS: 000 / CBZ: 000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleUpdateLabConfig} disabled={isActionPending} style={{ padding: '0.75rem 2rem' }}>
                            <Save size={20} /> Guardar Cambios en Reporte
                        </button>
                    </div>
                </div>
            )}

            <div className="grid-cols-2" style={{ gap: '2.5rem' }}>
                {/* Catálogo */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Database className="text-accent" size={22} />
                            <h3 style={{ margin: 0 }}>Estudios Disponibles</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={loadExams}
                                title="Actualizar Lista"
                                style={{ padding: '8px', borderRadius: '10px' }}
                            >
                                <RefreshCw size={18} className={isActionPending ? 'animate-spin' : ''} />
                            </button>
                            <div style={{ width: '1px', background: 'var(--border)', height: '24px', margin: '0 4px' }} />
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    if (confirm("¿Estás seguro de restaurar el catálogo predeterminado? Los estudios actuales se mantendrán, pero se añadirán los faltantes o se actualizarán los existentes.")) {
                                        setIsActionPending(true);
                                        try {
                                            await window.electronAPI.seedCatalog();
                                            showNotification("Catálogo restaurado correctamente.", "success");
                                            await loadExams();
                                        } catch (e) {
                                            console.error(e);
                                            showNotification("Error al restaurar catálogo.", "error");
                                        } finally {
                                            setIsActionPending(false);
                                        }
                                    }
                                }}
                                title="Añadir estudios predeterminados del sistema"
                                style={{ padding: '0 12px', fontSize: '0.8rem', height: '36px', gap: '0.5rem', borderRadius: '10px' }}
                            >
                                <FlaskConical size={16} /> Restaurar Base
                            </button>
                        </div>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'scroll', padding: '1rem' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Estudio</th>
                                    <th>Muestra</th>
                                    <th>Costo</th>
                                    <th style={{ textAlign: 'right' }}>Gestión</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map(exam => (
                                    <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)', background: selectedExamForParams?.id === exam.id ? 'var(--accent-soft)' : 'transparent' }}>
                                        <td style={{ fontWeight: 600 }}>{exam.nombre}</td>
                                        <td>
                                            {editingId === exam.id ? (
                                                <select
                                                    className="input"
                                                    style={{ width: '120px', padding: '4px', fontSize: '0.75rem' }}
                                                    value={editMuestra}
                                                    onChange={(e) => setEditMuestra(e.target.value)}
                                                >
                                                    <option value="Sangre">Sangre</option>
                                                    <option value="Orina">Orina</option>
                                                    <option value="Heces">Heces</option>
                                                    <option value="Plasma">Plasma</option>
                                                    <option value="Suero">Suero</option>
                                                    <option value="Sangre/Suero">Sangre/Suero</option>
                                                    <option value="Esputo">Esputo</option>
                                                    <option value="Semen">Semen</option>
                                                    <option value="LCR">LCR</option>
                                                    <option value="Líquido Pleural">Líquido Pleural</option>
                                                    <option value="Hisopado">Hisopado</option>
                                                    <option value="Otros">Otros</option>
                                                </select>
                                            ) : (
                                                <span className="badge" style={{ fontSize: '0.7rem', opacity: 0.8 }}>{exam.muestra || 'S/M'}</span>
                                            )}
                                        </td>
                                        <td>
                                            {editingId === exam.id ? (
                                                <input
                                                    type="text"
                                                    className="input"
                                                    style={{ width: '70px', padding: '6px', fontSize: '0.75rem' }}
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                />
                                            ) : (
                                                <span className="text-accent" style={{ fontWeight: 800 }}>${exam.precio.toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '8px', color: 'var(--text-muted)' }}
                                                    onClick={() => { setViewingExam(exam); loadParams(exam.id); }}
                                                    title="Ver Parámetros"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button className="btn btn-ghost" onClick={() => { setSelectedExamForParams(exam); loadParams(exam.id); }} title="Editar Estructura">
                                                    <List size={18} />
                                                </button>
                                                {editingId === exam.id ? (
                                                    <button className="btn btn-ghost text-success" onClick={() => handleUpdateExam(exam.id)}>
                                                        <Save size={18} />
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-ghost" onClick={() => {
                                                        setEditingId(exam.id);
                                                        setEditPrice(exam.precio.toString());
                                                        setEditMuestra(exam.muestra || 'Sangre');
                                                    }}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                <button className="btn btn-ghost text-danger" onClick={() => handleDeleteExam(exam.id, exam.nombre)} title="Eliminar Estudio">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Respaldo y Nuevo Estudio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ border: '2px solid var(--accent)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <ShieldCheck className="text-accent" size={24} />
                            <h3 style={{ margin: 0 }}>Mantenimiento</h3>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            Gestione copias de seguridad. Si los botones no responden, reinicie el programa desde el icono de escritorio.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={handleExport} style={{ flex: 1 }} disabled={isActionPending}>
                                <Download size={18} /> Exportar
                            </button>
                            <button className="btn btn-primary" onClick={() => handleImport()} style={{ flex: 1 }} disabled={isActionPending}>
                                <Upload size={18} /> Importar
                            </button>
                        </div>

                        {showImportOptions && (
                            <div className="fade-in" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--accent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)' }}>ELIJA MODO DE IMPORTACIÓN</span>
                                    <button className="btn-close" onClick={() => setShowImportOptions(false)} style={{ padding: '4px' }}><X size={14} /></button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handleImport('replace')}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', height: 'auto', gap: '4px' }}
                                    >
                                        <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.8rem' }}>REEMPLAZAR</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'center' }}>Borra actual (Destructivo)</div>
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handleImport('preview')}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', height: 'auto', gap: '4px' }}
                                    >
                                        <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.8rem' }}>FUSIONAR</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'center' }}>Une datos (Seguro)</div>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: '1rem', fontSize: '0.75rem', gap: '0.4rem', opacity: 0.6 }}
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw size={12} /> Refrescar Interfaz
                        </button>

                        <button
                            className="btn btn-ghost text-danger"
                            style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.75rem', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)' }}
                            onClick={handleWipeData}
                            disabled={isActionPending}
                        >
                            <Trash2 size={12} /> Limpiar Registros Clínicos
                        </button>
                    </div>

                    <div className="card shadow-lg">
                        <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Estudio</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Nombre del Estudio de Laboratorio</label>
                                <input
                                    className="input"
                                    placeholder="Ej: Perfil Hormonal"
                                    value={newExam.nombre}
                                    onChange={(e) => setNewExam({ ...newExam, nombre: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Categoría</label>
                                    <select className="input" value={newExam.categoria} onChange={e => setNewExam({ ...newExam, categoria: e.target.value })}>
                                        <option value="Hematología">Hematología</option>
                                        <option value="Química Sanguínea">Química Sanguínea</option>
                                        <option value="Uroanálisis">Uroanálisis</option>
                                        <option value="Coproanálisis">Coproanálisis</option>
                                        <option value="Inmunología">Inmunología</option>
                                        <option value="Bacteriología">Bacteriología</option>
                                        <option value="Hormonas">Hormonas</option>
                                        <option value="Serología">Serología</option>
                                        <option value="Coagulación">Coagulación</option>
                                        <option value="Marcadores Tumorales">Marcadores Tumorales</option>
                                        <option value="Electrolitos">Electrolitos</option>
                                        <option value="Perfil Lipídico">Perfil Lipídico</option>
                                        <option value="Perfil Hepático">Perfil Hepático</option>
                                        <option value="Perfil Tiroideo">Perfil Tiroideo</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Tipo de Muestra</label>
                                    <select className="input" value={newExam.muestra} onChange={e => setNewExam({ ...newExam, muestra: e.target.value })}>
                                        <option value="Sangre">Sangre</option>
                                        <option value="Orina">Orina</option>
                                        <option value="Heces">Heces</option>
                                        <option value="Plasma">Plasma</option>
                                        <option value="Suero">Suero</option>
                                        <option value="Sangre/Suero">Sangre/Suero</option>
                                        <option value="Esputo">Esputo</option>
                                        <option value="Semen">Semen</option>
                                        <option value="LCR">Líquido Cefalorraquídeo</option>
                                        <option value="Líquido Pleural">Líquido Pleural</option>
                                        <option value="Hisopado">Hisopado</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Costo ($)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="0.00"
                                        value={newExam.precio}
                                        onChange={(e) => setNewExam({ ...newExam, precio: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ padding: '1rem' }} onClick={handleAddExam} disabled={isActionPending}>
                                <Plus size={20} /> {isActionPending ? 'Registrando...' : 'Registrar Estudio'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedExamForParams && (
                <div className="card fade-in" style={{ border: '2px solid var(--accent)', background: 'var(--bg-card)' }}>
                    <div className="flex-between mb-8">
                        <div>
                            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Configuración de Parámetros</span>
                            <h2 style={{ margin: 0, marginTop: '4px' }}>{selectedExamForParams.nombre}</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="btn btn-ghost text-danger"
                                onClick={() => handleDeleteExam(selectedExamForParams.id, selectedExamForParams.nombre)}
                                title="Eliminar este Estudio Completo"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}
                            >
                                <Trash2 size={20} />
                            </button>
                            <button className="btn btn-ghost" onClick={() => setSelectedExamForParams(null)} style={{ background: 'var(--bg-main)', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Parámetro</th>
                                    <th>Unidad</th>
                                    <th>Rango Normal</th>
                                    <th style={{ textAlign: 'right' }}>Eliminar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentParams.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                        <td className="text-muted">{p.unidad || '-'}</td>
                                        <td>
                                            {p.valor_min !== null ? (
                                                <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.75rem' }}>
                                                    {p.valor_min} - {p.valor_max}
                                                </span>
                                            ) : (
                                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cualitativo</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost text-danger"
                                                onClick={() => handleDeleteParam(p.id)}
                                                style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.05)' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--accent)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Añadir Nuevo Parámetro</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', gap: '1rem', alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>PARÁMETRO</label>
                                <input className="input" style={{ fontSize: '0.8rem' }} value={newParam.nombre} onChange={e => setNewParam({ ...newParam, nombre: e.target.value })} placeholder="Ej: Glucosa" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>UNIDAD</label>
                                <input className="input" style={{ fontSize: '0.8rem' }} value={newParam.unidad} onChange={e => setNewParam({ ...newParam, unidad: e.target.value })} placeholder="mg/dL" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>VALOR MÍN</label>
                                <input className="input" style={{ fontSize: '0.8rem' }} type="number" step="any" value={newParam.min} onChange={e => setNewParam({ ...newParam, min: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>VALOR MÁX</label>
                                <input className="input" style={{ fontSize: '0.8rem' }} type="number" step="any" value={newParam.max} onChange={e => setNewParam({ ...newParam, max: e.target.value })} placeholder="0.00" />
                            </div>
                            <button className="btn btn-primary" style={{ height: '38px', borderRadius: '8px' }} onClick={handleAddParam}>
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConflictModal && importConflictData && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
                        <div className="modal-header">
                            <h3><RefreshCw size={20} /> Resolución de Conflictos de Pacientes</h3>
                            <button className="btn-close" onClick={() => setShowConflictModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <p className="text-muted">Se encontraron {importConflictData.conflicts.length} pacientes con datos diferentes. Elija qué versión conservar para cada uno:</p>

                            {importConflictData.conflicts.map((c, idx) => (
                                <div key={idx} className="card" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-main)' }}>
                                    <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        Cédula: {c.local.cedula}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Versión en mi PC</div>
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <strong>{c.local.nombres} {c.local.apellidos}</strong><br />
                                                <small>{c.local.email || 'Sin correo'}</small><br />
                                                <small>{c.local.direccion}</small>
                                            </div>
                                            <button className="btn btn-primary w-full" style={{ marginTop: '1rem', fontSize: '0.8rem' }}
                                                onClick={() => {
                                                    const newConflicts = [...importConflictData.conflicts];
                                                    newConflicts.splice(idx, 1);
                                                    setImportConflictData({ ...importConflictData, conflicts: newConflicts });
                                                    if (newConflicts.length === 0) setShowConflictModal(false);
                                                }}>
                                                Conservar Míos
                                            </button>
                                        </div>
                                        <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'rgba(16, 185, 129, 0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700 }}>Versión del Respaldo</div>
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <strong>{c.incoming.nombres} {c.incoming.apellidos}</strong><br />
                                                <small>{c.incoming.email || 'Sin correo'}</small><br />
                                                <small>{c.incoming.direccion}</small>
                                            </div>
                                            <button className="btn btn-success w-full" style={{ marginTop: '1rem', fontSize: '0.8rem' }}
                                                onClick={async () => {
                                                    try {
                                                        await window.electronAPI.savePatient(c.incoming);
                                                        const newConflicts = [...importConflictData.conflicts];
                                                        newConflicts.splice(idx, 1);
                                                        setImportConflictData({ ...importConflictData, conflicts: newConflicts });
                                                        showNotification("Datos actualizados con la versión del respaldo.", "success");
                                                        if (newConflicts.length === 0) setShowConflictModal(false);
                                                    } catch (e) {
                                                        showNotification("Error al actualizar.", "error");
                                                    }
                                                }}>
                                                Sobrescribir con estos
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowConflictModal(false)}>Cerrar y conservar el resto</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
