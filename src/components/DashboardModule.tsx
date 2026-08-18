import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, Activity, AlertCircle } from 'lucide-react'

const GLUCOSE_DATA = [
    { date: '2023-08-10', value: 95 },
    { date: '2023-09-12', value: 105 },
    { date: '2023-10-15', value: 115 },
    { date: '2023-11-20', value: 102 },
    { date: '2023-12-22', value: 98 },
]

const HEMOGLOBIN_DATA = [
    { date: '2023-08-10', value: 14.2 },
    { date: '2023-09-12', value: 13.8 },
    { date: '2023-10-15', value: 14.5 },
    { date: '2023-11-20', value: 14.1 },
    { date: '2023-12-22', value: 14.4 },
]

export default function DashboardModule() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Quick Stats */}
            <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <div className="card">
                    <div className="flex-between mb-2">
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>Glucosa Promedio</span>
                        <div style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px', borderRadius: '4px' }}>
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>103 mg/dL</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>↓ 4% vs mes anterior</p>
                </div>

                <div className="card">
                    <div className="flex-between mb-2">
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>Hematíes</span>
                        <Activity size={16} className="text-info" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>4.8 M/µL</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rango estable</p>
                </div>

                <div className="card">
                    <div className="flex-between mb-2">
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>Alertas Clínicas</span>
                        <AlertCircle size={16} className="text-danger" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--danger)' }}>2</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Críticos este mes</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Tendencia de Glucosa (Basal)</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={GLUCOSE_DATA}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="var(--accent)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Tendencia de Hemoglobina</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={HEMOGLOBIN_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                                <Line type="monotone" dataKey="value" stroke="var(--info)" strokeWidth={3} dot={{ r: 4, fill: 'var(--info)' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
