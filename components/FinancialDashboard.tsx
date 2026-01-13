// src/components/FinancialDashboard.tsx
import React, { useMemo } from 'react';
import { usePhoenixData } from '../hooks/usePhoenixData';
import { DollarSign, TrendingUp, AlertCircle, CalendarClock, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const FinancialDashboard = () => {
    // 1. Busca todas as obras (Propostas e Em Execução) instantaneamente da cache
    const { projects } = usePhoenixData();

    // 2. Processamento de Dados (Extração de Parcelas)
    const financialData = useMemo(() => {
        let totalReceivables = 0;
        let overdueValue = 0;
        let next30DaysValue = 0;

        const VALID_STATUSES = ['CONTRATO', 'EXECUCAO', 'MEDICAO', 'A_FATURAR', 'FINALIZADO'];

        const allInstallments: any[] = [];
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        projects.forEach((project: any) => {
            // REGRA DE OURO: Se for só Proposta, Negociação ou Cancelado, IGNORA no financeiro
            if (!VALID_STATUSES.includes(project.status)) return;

            // Processar Sinal
            if (project.sinalValue) {
                allInstallments.push({
                    client: project.clientName,
                    project: project.name,
                    type: 'SINAL',
                    value: project.sinalValue,
                    date: project.createdAt ? new Date(project.createdAt) : new Date(), // Sinal vence na criação
                    status: 'PENDENTE' // Poderia vir do banco se já pago
                });
            }

            // Processar Parcelas do Saldo
            if (project.installmentList && Array.isArray(project.installmentList)) {
                project.installmentList.forEach((inst: any) => {
                    // Se não tiver data definida, assumimos 30 dias após criação para projeção
                    let dueDate = inst.date ? new Date(inst.date) : null;

                    if (dueDate) {
                        allInstallments.push({
                            client: project.clientName,
                            project: project.name,
                            type: `Parc. ${inst.number}`,
                            value: inst.value,
                            date: dueDate,
                            status: 'PENDENTE'
                        });
                    }
                });
            }
        });

        // 3. Agregação e Métricas
        allInstallments.forEach(item => {
            totalReceivables += item.value;

            if (item.date < today) {
                overdueValue += item.value;
            } else if (item.date <= next30Days) {
                next30DaysValue += item.value;
            }
        });

        // Ordenar por data
        allInstallments.sort((a, b) => a.date.getTime() - b.date.getTime());

        return { totalReceivables, overdueValue, next30DaysValue, list: allInstallments };
    }, [projects]);

    // Dados para o Gráfico (Agrupado por Mês)
    const chartData = useMemo(() => {
        const groups: Record<string, number> = {};
        financialData.list.forEach(item => {
            const key = item.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            groups[key] = (groups[key] || 0) + item.value;
        });
        return Object.entries(groups).map(([name, value]) => ({ name, value })).slice(0, 6); // Próximos 6 meses
    }, [financialData]);

    const fmt = (v: number | undefined) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-emerald-600" /> Fluxo de Caixa (Previsão)
                    </h1>
                    <p className="text-sm text-slate-500">Baseado nas propostas emitidas e cronogramas de parcelamento.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><DollarSign size={64} /></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total a Receber (Geral)</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{fmt(financialData.totalReceivables)}</p>
                    <div className="mt-4 text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                        Todas as Obras
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><CalendarClock size={64} className="text-blue-500" /></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas Próx. 30 Dias</p>
                    <p className="text-3xl font-black text-blue-600 mt-2">{fmt(financialData.next30DaysValue)}</p>
                    <p className="text-xs text-slate-400 mt-2">Caixa de curto prazo</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><AlertCircle size={64} className="text-red-500" /></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencido / Atrasado</p>
                    <p className="text-3xl font-black text-red-500 mt-2">{fmt(financialData.overdueValue)}</p>
                    <p className="text-xs text-red-400 mt-2">Ação de cobrança necessária</p>
                </div>
            </div>

            {/* Gráfico e Lista */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico de Barras */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex gap-2 items-center"><TrendingUp size={18} /> Projeção de Recebimentos</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lista de Próximos Vencimentos */}
                <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-bold text-slate-700 text-sm">Próximos Vencimentos</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1">
                        {financialData.list.length === 0 ? (
                            <p className="text-center text-slate-400 text-xs py-8">Nenhuma previsão de entrada.</p>
                        ) : (
                            financialData.list.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">{item.client}</p>
                                        <p className="text-[10px] text-slate-400">{item.project} • {item.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-emerald-600">{fmt(item.value)}</p>
                                        <p className={`text-[10px] font-bold ${item.date < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                                            {item.date.toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
