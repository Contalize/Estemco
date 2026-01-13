import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ComposedChart, Line, Cell, PieChart, Pie
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Activity, Calendar, MapPin,
    Download, Filter, AlertTriangle, Briefcase, Zap, Droplets, Gauge
} from 'lucide-react';
import { usePhoenixData } from '../hooks/usePhoenixData';

// --- HELPER COMPONENTS ---

const KPICard = ({ title, value, subtext, trend, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={40} />
        </div>
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
        <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>
    </div>
);

export const Relatorios = () => {
    const { projects, allDailyLogs } = usePhoenixData();
    const [viewMode, setViewMode] = useState<'SYNTHETIC' | 'ANALYTICAL'>('SYNTHETIC');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // --- ANALYTICS ENGINE (BI 3.0) ---
    const analytics = useMemo(() => {
        // 1. FILTERING
        const filteredProjects = projects.filter(p =>
            p.createdAt >= dateRange.start && p.createdAt <= dateRange.end
        );
        const projectIds = new Set(filteredProjects.map(p => p.id));
        const relevantLogs = allDailyLogs.filter(log => projectIds.has(log.projetoId));

        // 2. FINANCIAL (UNIT ECONOMICS)
        const totalRevenue = filteredProjects.reduce((acc, p) => acc + (p.totalBudget || 0), 0);

        let totalConcreteCost = 0;
        let totalDieselCost = 0;
        let totalMachineHours = 0;
        let totalConcreteVol = 0;
        let totalMetersDrilled = 0;
        let totalIdleHours = 0;

        relevantLogs.forEach(log => {
            // Find linked project to get specific costs
            const proj = projects.find(p => p.id === log.projetoId);
            const concretePrice = proj?.costs?.concretePriceM3 || 450; // Fallback
            const dieselPrice = proj?.costs?.dieselPriceL || 6.50; // Fallback
            const consumption = 15; // Liters/hour fallback

            const hours = log.engineHours || 0;
            const concrete = log.concreteTotalVolume || 0;

            totalMachineHours += hours;
            totalConcreteVol += concrete;
            totalDieselCost += (hours * consumption * dieselPrice);
            totalConcreteCost += (concrete * concretePrice);
            totalMetersDrilled += log.totalMeters || 0;
            totalIdleHours += log.totalIdleHours || 0;
        });

        const totalCost = totalConcreteCost + totalDieselCost; // Simplified Ops Cost
        const grossMargin = totalRevenue - totalCost;
        const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

        // 3. EFFICIENCY (CITIES & MACHINES)
        const cityStats: Record<string, { revenue: number, meters: number }> = {};
        filteredProjects.forEach(p => {
            const city = p.address?.split('-')[1]?.trim() || p.clientName || 'Indefinido'; // Heuristic
            if (!cityStats[city]) cityStats[city] = { revenue: 0, meters: 0 };
            cityStats[city].revenue += (p.totalBudget || 0);
        });
        // Add meters from logs to cities (Approximate mapping)

        const topCities = Object.entries(cityStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 4. PIPELINE / SALES
        const pipelineValue = projects.filter(p => p.status === 'PROPOSTA' || p.status === 'NEGOCIACAO')
            .reduce((acc, p) => acc + (p.totalBudget || 0), 0);

        const conversionRate = (
            filteredProjects.filter(p => ['CONTRATO', 'EXECUCAO', 'FINALIZADO'].includes(p.status)).length /
            (filteredProjects.length || 1)
        ) * 100;

        // 5. CONCRETE AUDIT (OVERBREAK)
        // Hardcoded theoretical for demo if missing
        const theoreticalVol = totalMetersDrilled * (Math.PI * Math.pow(0.4 / 2, 2)); // 40cm diam msg
        const overbreak = theoreticalVol > 0 ? ((totalConcreteVol - theoreticalVol) / theoreticalVol) * 100 : 0;

        // 6. CHARTS DATA
        const financeOverTime = filteredProjects.reduce((acc: any[], p) => {
            const month = new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short' });
            const existing = acc.find(i => i.name === month);
            if (existing) {
                existing.receita += p.totalBudget || 0;
                existing.custo += (p.totalBudget || 0) * 0.6; // Mock cost curve for visualization if no specific date logs
            } else {
                acc.push({ name: month, receita: p.totalBudget || 0, custo: (p.totalBudget || 0) * 0.6 });
            }
            return acc;
        }, []);

        return {
            totalRevenue,
            grossMargin,
            marginPercent,
            pipelineValue,
            conversionRate,
            totalMetersDrilled,
            totalMachineHours,
            productivity: totalMachineHours > 0 ? (totalMetersDrilled / totalMachineHours) : 0,
            overbreak,
            topCities,
            financeOverTime,
            filteredProjects,
            relevantLogs
        };
    }, [projects, allDailyLogs, dateRange]);

    // CSV EXPORT
    const downloadCSV = () => {
        const headers = ["Data", "Cliente", "Obra", "Receita (R$)", "Metros (m)", "Concreto (m³)", "Status", "Eficiência"];
        const rows = analytics.filteredProjects.map(p => {
            // Find logs for this project
            const pLogs = allDailyLogs.filter(l => l.projetoId === p.id);
            const pMeters = pLogs.reduce((acc, l) => acc + (l.totalMeters || 0), 0);
            const pConcrete = pLogs.reduce((acc, l) => acc + (l.concreteTotalVolume || 0), 0);

            return [
                new Date(p.createdAt).toLocaleDateString('pt-BR'),
                p.clientName,
                p.name,
                (p.totalBudget || 0).toFixed(2),
                pMeters.toFixed(1),
                pConcrete.toFixed(1),
                p.status,
                "-"
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BI_Estemco_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Briefcase className="text-blue-900" /> Enterprise Intelligence
                    </h1>
                    <p className="text-slate-500 font-medium ml-1">Visão Estratégica & Operacional (SAP Level)</p>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Período</span>
                    </div>
                    <input
                        type="date" value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        className="text-xs font-bold bg-slate-50 border rounded p-1.5 text-slate-700"
                    />
                    <span className="text-slate-300">➜</span>
                    <input
                        type="date" value={dateRange.end}
                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        className="text-xs font-bold bg-slate-50 border rounded p-1.5 text-slate-700"
                    />
                    <div className="w-px h-6 bg-slate-100 mx-1"></div>
                    <div className="flex bg-slate-100 rounded p-1">
                        <button onClick={() => setViewMode('SYNTHETIC')} className={`p-1.5 rounded ${viewMode === 'SYNTHETIC' ? 'bg-white shadow text-blue-700' : 'text-slate-400'}`}>
                            <Activity size={16} />
                        </button>
                        <button onClick={() => setViewMode('ANALYTICAL')} className={`p-1.5 rounded ${viewMode === 'ANALYTICAL' ? 'bg-white shadow text-blue-700' : 'text-slate-400'}`}>
                            <Calendar size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI RIBBON (SPARKLINES CONCEPT) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KPICard
                    title="Fat. Realizado"
                    value={analytics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    subtext="Receita em Contratos"
                    icon={DollarSign}
                    color="bg-emerald-500"
                    trend={12}
                />
                <KPICard
                    title="VPL (Pipeline)"
                    value={analytics.pipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    subtext="Propostas em Aberto"
                    icon={Briefcase}
                    color="bg-blue-500"
                />
                <KPICard
                    title="Margem Contrib."
                    value={`${analytics.marginPercent.toFixed(1)}%`}
                    subtext={`Lucro Bruto: ${analytics.grossMargin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                    color="bg-indigo-500"
                    trend={5}
                />
                <KPICard
                    title="Overbreak (Concreto)"
                    value={`${analytics.overbreak.toFixed(1)}%`}
                    subtext="Desvio vs Teórico"
                    icon={Droplets}
                    color={analytics.overbreak > 15 ? "bg-red-500" : "bg-emerald-500"}
                />
            </div>

            {viewMode === 'SYNTHETIC' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - FINANCIALS */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <DollarSign size={18} className="text-emerald-500" /> Performance Financeira (Receita x Custos)
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.financeOverTime}>
                                        <defs>
                                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                        <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        />
                                        <Area type="monotone" dataKey="receita" stroke="#10b981" fillOpacity={1} fill="url(#colorReceita)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="custo" stroke="#ef4444" fillOpacity={1} fill="url(#colorCusto)" strokeWidth={2} />
                                        <Legend />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin size={18} className="text-blue-500" /> Top Cidades (Receita)
                                </h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={analytics.topCities}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={11} fontWeight={700} />
                                            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <Briefcase size={18} className="text-purple-500" /> Funil de Vendas
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Propostas Enviadas</span>
                                        <span className="font-black text-slate-800">{analytics.filteredProjects.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                                        <span className="text-xs font-bold text-purple-700 uppercase">Taxa Conversão</span>
                                        <span className="font-black text-purple-900">{analytics.conversionRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <span className="text-xs font-bold text-emerald-700 uppercase">Contratos Fechados</span>
                                        <span className="font-black text-emerald-900">
                                            {analytics.filteredProjects.filter(p => ['CONTRATO', 'EXECUCAO', 'FINALIZADO'].includes(p.status)).length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - OPERATIONAL */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Gauge size={18} className="text-orange-500" /> Eficiência Operacional
                            </h3>

                            <div className="space-y-8">
                                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Produtividade Média</p>
                                    <p className="text-3xl font-black text-slate-800">
                                        {analytics.productivity.toFixed(1)} <span className="text-sm font-medium text-slate-400">m/hora</span>
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Breakdown de Horas</h4>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div style={{ width: '85%' }} className="bg-emerald-500 h-full"></div>
                                            <div style={{ width: '15%' }} className="bg-orange-400 h-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 px-1">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Produtivo (85%)</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Parado (15%)</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Atenção (Overbreak &gt; 15%)</h4>
                                    <div className="space-y-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                                                <span className="text-xs font-bold text-red-800">Obra {String.fromCharCode(64 + i)}</span>
                                                <span className="text-xs font-black text-red-600">+22%</span>
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-slate-400 text-center mt-2">Simulação (Auditando 15 obras)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700">Detalhamento Analítico</h3>
                        <button onClick={downloadCSV} className="text-xs font-bold flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 text-slate-600">
                            <Download size={14} /> Exportar CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 text-left">Data</th>
                                    <th className="p-4 text-left">Cliente</th>
                                    <th className="p-4 text-left">Projeto</th>
                                    <th className="p-4 text-right">Receita Total</th>
                                    <th className="p-4 text-center">Metragem</th>
                                    <th className="p-4 text-center">Concreto (m³)</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {analytics.filteredProjects.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-slate-700">{p.clientName}</td>
                                        <td className="p-4 text-slate-600">{p.name}</td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-700">
                                            {(p.totalBudget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {allDailyLogs.filter(l => l.projetoId === p.id).reduce((acc, l) => acc + (l.totalMeters || 0), 0).toFixed(1)}m
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-500">
                                            {allDailyLogs.filter(l => l.projetoId === p.id).reduce((acc, l) => acc + (l.concreteTotalVolume || 0), 0).toFixed(1)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.status === 'CONTRATO' || p.status === 'EXECUCAO' ? 'bg-blue-100 text-blue-700' :
                                                p.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
