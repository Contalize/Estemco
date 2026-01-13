import React, { useState, useMemo } from 'react';
import { usePhoenixData } from '../hooks/usePhoenixData';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Filter, Calendar, TrendingUp, DollarSign, Activity, Target, FileText } from 'lucide-react';
import { ConstructionSite } from '../types';

export const ReportsBI = () => {
    const { projects } = usePhoenixData();
    const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: new Date().toISOString().split('T')[0] });

    // Filter Data
    const filteredProjects = useMemo(() => {
        return (projects as ConstructionSite[]).filter(p => {
            const pDate = new Date(p.startDate);
            return pDate >= new Date(dateRange.start) && pDate <= new Date(dateRange.end);
        });
    }, [projects, dateRange]);

    // METRICS
    const totalRevenue = filteredProjects.reduce((acc, p) => acc + (p.revenue || p.totalBudget || 0), 0);
    const totalMeters = filteredProjects.reduce((acc, p) => acc + (p.contractMeters || 0), 0);
    const totalProposals = filteredProjects.length;
    const closedDeals = filteredProjects.filter(p => p.status === 'Ativa' || p.status === 'Concluída').length;
    const conversionRate = totalProposals > 0 ? (closedDeals / totalProposals) * 100 : 0;

    // CHART DATA GENERATORS

    // 1. Revenue Evolution (Monthly)
    const revenueByMonth = useMemo(() => {
        const data: Record<string, number> = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        filteredProjects.forEach(p => {
            const d = new Date(p.startDate);
            const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
            data[key] = (data[key] || 0) + (p.revenue || p.totalBudget || 0);
        });

        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [filteredProjects]);

    // 2. Machine Efficiency (Revenue Share)
    const machineShare = useMemo(() => {
        const data: Record<string, number> = {};
        filteredProjects.forEach(p => {
            const machineName = p.selectedAssetObj?.name || 'Não Alocada';
            data[machineName] = (data[machineName] || 0) + (p.revenue || p.totalBudget || 0);
        });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [filteredProjects]);

    // 3. Funnel (Simple Status Counter)
    const funnelData = useMemo(() => {
        const counts = { PROPOSTA: 0, ACEITE: 0, CONTRATO: 0, EXECUCAO: 0, CONCLUDED: 0 };
        filteredProjects.forEach(p => {
            if (p.stage === 'PROPOSTA') counts.PROPOSTA++;
            if (p.stage === 'ACEITE') counts.ACEITE++;
            if (p.stage === 'CONTRATO') counts.CONTRATO++;
            if (p.stage === 'EXECUCAO' || p.stage === 'MEDICAO') counts.EXECUCAO++;
            if (p.status === 'Concluída') counts.CONCLUDED++;
        });

        return [
            { name: 'Proposta', value: counts.PROPOSTA + counts.ACEITE + counts.CONTRATO + counts.EXECUCAO + counts.CONCLUDED },
            { name: 'Negociação', value: counts.ACEITE + counts.CONTRATO + counts.EXECUCAO + counts.CONCLUDED },
            { name: 'Fechado', value: counts.CONTRATO + counts.EXECUCAO + counts.CONCLUDED },
            { name: 'Execução', value: counts.EXECUCAO + counts.CONCLUDED },
            { name: 'Concluído', value: counts.CONCLUDED },
        ];
    }, [filteredProjects]);

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="p-8 bg-slate-50 min-h-screen space-y-8 animate-in fade-in duration-500">

            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <PieChart className="text-emerald-600" /> Inteligência de Obras
                    </h2>
                    <p className="text-slate-500 mt-1">Análise estratégica de vendas e produção.</p>
                </div>

                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="flex items-center gap-2 px-2 text-slate-400">
                        <Filter size={16} />
                        <span className="text-xs font-bold uppercase">Periodo:</span>
                    </div>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        className="p-1 border rounded text-xs font-bold text-slate-600"
                    />
                    <span className="text-slate-300">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        className="p-1 border rounded text-xs font-bold text-slate-600"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Faturamento Total" value={`R$ ${totalRevenue.toLocaleString()}`} icon={DollarSign} color="emerald" sub="No período" />
                <KPICard title="Metragem Perfurada" value={`${totalMeters.toLocaleString()} m`} icon={Activity} color="blue" sub="Produção Total" />
                <KPICard title="Propostas Emitidas" value={totalProposals} icon={FileText} color="indigo" sub="Volume Comercial" />
                <KPICard title="Taxa de Conversão" value={`${conversionRate.toFixed(1)}%`} icon={Target} color="amber" sub="Eficiência de Venda" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue Chart */}
                <ChartContainer title="Evolução de Faturamento">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={revenueByMonth}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: number) => [`R$ ${v.toLocaleString()}`, 'Faturamento']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* Machine Efficiency */}
                <ChartContainer title="Performance por Máquina (Receita Gerada)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={machineShare} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: '#F1F5F9' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: number) => [`R$ ${v.toLocaleString()}`, 'Receita']}
                            />
                            <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Funnel */}
                <div className="lg:col-span-1">
                    <ChartContainer title="Funil de Vendas">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={funnelData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={30}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Placeholder for future expansion */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 text-white flex flex-col justify-center items-center">
                    <Target size={48} className="text-emerald-400 mb-4" />
                    <h3 className="text-xl font-bold">Metas 2025</h3>
                    <p className="text-slate-400 text-center max-w-md mt-2">
                        O módulo de metas está sendo calibrado com base no histórico de dados importado. Em breve você poderá definir targets mensais de produção e faturamento.
                    </p>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, color, sub }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <h3 className={`text-2xl font-black text-slate-800 mt-1`}>{value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
                <Icon size={20} />
            </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded">
            <TrendingUp size={10} className="text-green-500" /> {sub}
        </div>
    </div>
);

const ChartContainer = ({ title, children }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-700 mb-6">{title}</h3>
        {children}
    </div>
);
