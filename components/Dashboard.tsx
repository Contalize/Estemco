import React from 'react';
import {
    Users, FileText, CalendarDays, Wallet,
    TrendingUp, TrendingDown, ArrowRight,
    HardHat, Truck, Timer, DollarSign
} from 'lucide-react';
import { ConstructionSite, ProjectStage, Tab } from '../types';
import { usePhoenixData } from '../hooks/usePhoenixData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
    sites?: ConstructionSite[];
    config: any;
    setActiveTab: (tab: Tab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ sites = [], config, setActiveTab }) => {
    const { projects, loading } = usePhoenixData();
    const allProjects = projects as ConstructionSite[] || sites;

    // --- KPI CALCULATIONS ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // DEFINIÇÃO DE STATUS (Regra de Negócio v2.0)
    // DEAD_STATUSES: Não contam para métricas de venda ou execução.
    const DEAD_STATUSES = ['CANCELADO', 'PERDIDO'];
    // CLOSED_STATUSES: Considerados como "Venda Realizada".
    const CLOSED_STATUSES = ['ACEITE', 'CONTRATO', 'EXECUCAO', 'MEDICAO', 'A_FATURAR', 'FINALIZADO'];
    // ACTIVE_WORK_STATUSES: Obras que estão efetivamente em andamento (Equipe em campo ou gestão).
    const ACTIVE_WORK_STATUSES = ['EXECUCAO', 'MEDICAO', 'A_FATURAR'];

    // 1. Faturamento do Mês (Vendas Reais Fechadas este mês)
    // Consideramos "Venda" quando o projeto sai de PROPOSTA e entra em qualquer status de CLOSED_STATUSES.
    // Como simplificação (já que não temos data de fechamento), usamos createdAt se o status for CLOSED.
    // Idealmente, deveríamos ter 'closedAt', mas usaremos filtro de Status + createdAt do mês para "Novos Contratos".
    const currentMonthRevenue = allProjects
        .filter(p => {
            if (DEAD_STATUSES.includes(p.status)) return false; // Exclui cancelados
            if (!CLOSED_STATUSES.includes(p.status)) return false; // Exclui propostas abertas

            if (!p.createdAt) return false;
            const d = new Date(p.createdAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, curr) => acc + (curr.totalBudget || 0), 0);

    // 2. Funil de Vendas (Propostas em Aberto)
    // Somente status 'PROPOSTA' e que NÃO esteja perdido/cancelado
    const pipelineValue = allProjects
        .filter(p => p.status === 'PROPOSTA')
        .reduce((acc, curr) => acc + (curr.totalBudget || 0), 0);

    // 3. Obras Ativas (Em Execução no Campo)
    const activeSitesCount = allProjects
        .filter(p => ACTIVE_WORK_STATUSES.includes(p.status))
        .length;

    // 4. Taxa de Conversão
    // Conversão = (Ganhos) / (Ganhos + Perdidos) * 100
    // Propostas Abertas ignoradas no denominador para taxa de conversão "fechada", ou incluídas para "geral".
    // Usaremos: Ganhos / Total de Oportunidades Finalizadas (Ganhos + Perdidos)
    const wonDeals = allProjects.filter(p => CLOSED_STATUSES.includes(p.status)).length;
    const lostDeals = allProjects.filter(p => DEAD_STATUSES.includes(p.status)).length;
    const finishedOpportunities = wonDeals + lostDeals;

    // Evita divisão por zero
    const conversionRate = finishedOpportunities > 0
        ? Math.round((wonDeals / finishedOpportunities) * 100)
        : 0;

    // --- CHART DATA (Last 6 Months - Sales Trend) ---
    // Gráfico mostra VENDAS EFETIVAS (Contratos), não volume de Propostas.
    const getChartData = () => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });

            const monthRevenue = allProjects
                .filter(p => {
                    // Filtra apenas Vendas Reais (Closed)
                    if (!CLOSED_STATUSES.includes(p.status)) return false;
                    if (DEAD_STATUSES.includes(p.status)) return false;

                    if (!p.createdAt) return false;
                    const pd = new Date(p.createdAt);
                    return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
                })
                .reduce((acc, curr) => acc + (curr.totalBudget || 0), 0);

            data.push({ name: monthName.toUpperCase(), value: monthRevenue });
        }
        return data;
    };
    const chartData = getChartData();

    // --- RECENT ACTIVITY (Radar de Obras) ---
    // Deve mostrar obras recentes, mas IGNORAR canceladas/perdidas para não poluir
    const recentProjects = [...allProjects]
        .filter(p => !DEAD_STATUSES.includes(p.status)) // <--- FILTRO CRÍTICO AQUI
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 5);

    const getStatusColor = (stage: string) => {
        if (stage === 'PROPOSTA') return 'bg-yellow-100 text-yellow-700';
        if (ACTIVE_WORK_STATUSES.includes(stage)) return 'bg-blue-100 text-blue-700';
        if (stage === 'ACEITE' || stage === 'CONTRATO') return 'bg-purple-100 text-purple-700';
        if (stage === 'FINALIZADO') return 'bg-green-100 text-green-700';
        return 'bg-slate-100 text-slate-600';
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6 animate-pulse max-w-[1600px] mx-auto">
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="grid grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
                </div>
                <div className="h-20 bg-slate-200 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

            {/* 1. HEADER */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Bom dia, Estemco!</h1>
                    <p className="text-slate-500 font-medium">{today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-xs uppercase font-bold text-slate-400">Total em Propostas (Funil)</p>
                    <p className="text-2xl font-black text-blue-600">R$ {pipelineValue.toLocaleString('pt-BR')}</p>
                </div>
            </div>

            {/* 2. KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Vendas do Mês"
                    value={`R$ ${currentMonthRevenue.toLocaleString('pt-BR', { notation: 'compact' })}`}
                    icon={<DollarSign className="text-emerald-600" size={24} />}
                    subtext="Novos Contratos Fechados"
                    trend="+12%"
                    trendUp={true}
                />
                <KPICard
                    title="Propostas em Aberto"
                    value={`R$ ${pipelineValue.toLocaleString('pt-BR', { notation: 'compact' })}`}
                    icon={<FileText className="text-blue-600" size={24} />}
                    subtext={`${allProjects.filter(p => p.status === 'PROPOSTA').length} propostas ativas`}
                />
                <KPICard
                    title="Obras em Execução"
                    value={activeSitesCount.toString()}
                    icon={<HardHat className="text-orange-600" size={24} />}
                    subtext="Equipes em campo"
                />
                <KPICard
                    title="Taxa de Conversão"
                    value={`${conversionRate}%`}
                    icon={<TrendingUp className="text-purple-600" size={24} />}
                    subtext="Propostas -> Contratos"
                />
            </div>

            {/* 3. QUICK ACTIONS (SHORTCUTS) */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Acesso Rápido</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ShortcutButton
                        label="Nova Proposta"
                        icon={<FileText size={20} />}
                        color="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => setActiveTab(Tab.QUOTE)}
                    />
                    <ShortcutButton
                        label="Cadastrar Cliente"
                        icon={<Users size={20} />}
                        color="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setActiveTab(Tab.DASHBOARD)}
                    />
                    <ShortcutButton
                        label="Agenda de Frota"
                        icon={<CalendarDays size={20} />}
                        color="bg-orange-500 text-white hover:bg-orange-600"
                        onClick={() => setActiveTab(Tab.CALENDAR)}
                    />
                    <ShortcutButton
                        label="Financeiro"
                        icon={<Wallet size={20} />}
                        color="bg-purple-600 text-white hover:bg-purple-700"
                        onClick={() => setActiveTab(Tab.FINANCIAL)}
                    />
                </div>
            </div>

            {/* 4. RADAR & CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent Activity */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Timer size={18} className="text-slate-400" /> Radar de Obras</h3>
                        <button onClick={() => setActiveTab(Tab.WORKFLOW)} className="text-xs font-bold text-blue-600 hover:underline">Ver Todas</button>
                    </div>
                    <div className="space-y-4">
                        {recentProjects.map(project => (
                            <div key={project.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{project.clientName || project.name}</p>
                                    <p className="text-xs text-slate-400">{project.name} • {new Date(project.createdAt || '').toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-xs text-slate-600">R$ {(project.totalBudget || 0).toLocaleString('pt-BR', { notation: 'compact' })}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(project.status || 'PROPOSTA')}`}>
                                        {project.status || 'PROPOSTA'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {recentProjects.length === 0 && <p className="text-slate-400 text-sm italic py-4 text-center">Nenhuma atividade recente.</p>}
                    </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" /> Tendência de Vendas (6 Meses)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `R$${value / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Vendas']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

        </div>
    );
};

// --- SUBCOMPONENTS ---

const KPICard = ({ title, value, icon, subtext, trend, trendUp }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
        </div>
    </div>
);

const ShortcutButton = ({ label, icon, color, onClick }: any) => (
    <button onClick={onClick} className={`${color} p-4 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 group`}>
        <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
            {icon}
        </div>
        <span className="font-bold text-sm tracking-wide">{label}</span>
    </button>
);