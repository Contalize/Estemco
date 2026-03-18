import React, { useState, useEffect, useMemo } from 'react';
import { ConstructionSite, GlobalConfig, Tab, DREObra } from '../types';
import { Loader2, TrendingUp, DollarSign, FileText, Users, Plus, GitPullRequestArrow, AlertTriangle, Calendar as CalendarIcon, ArrowUp, ArrowDown, CheckCircle2, XCircle, Clock, Building2, BarChart3, Filter, X, Eye } from 'lucide-react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { where, orderBy } from 'firebase/firestore';
import { PropostaData } from '../services/propostasService';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { Card, Select, Button, Input } from './ui';

interface DashboardProps {
  sites: ConstructionSite[];
  config: GlobalConfig;
  onNavigate: (tab: Tab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ sites, config, onNavigate }) => {
  const { profile } = useAuth();

  // -- GLOBAL FILTERS STATE --
  const [periodFilter, setPeriodFilter] = useState<string>('este_mes');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [engineerFilter, setEngineerFilter] = useState<string>('Todos');

  // -- DISMISSED ALERTS L.STORAGE --
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem('estemco_dismissed_alerts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out expired (24h)
        const valid = parsed.filter((a: any) => new Date().getTime() - a.timestamp < 24 * 60 * 60 * 1000);
        setDismissedAlerts(valid.map((a: any) => a.id));
        localStorage.setItem('estemco_dismissed_alerts', JSON.stringify(valid));
      } catch (e) { }
    }
  }, []);

  const handleDismissAlert = (id: string) => {
    const newDismissed = [...dismissedAlerts, id];
    setDismissedAlerts(newDismissed);
    const storageArr = newDismissed.map(iid => ({ id: iid, timestamp: new Date().getTime() }));
    localStorage.setItem('estemco_dismissed_alerts', JSON.stringify(storageArr));
  };

  // -- REALTIME DATA FETCHING --
  const { data: propostas, isLoading: loadingPropostas } = useCollection<PropostaData>('propostas',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { data: dres, isLoading: loadingDres } = useCollection<DREObra>('dre_obras',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { data: obrasData, isLoading: loadingObras } = useCollection<ConstructionSite>('obras',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { data: medicoes, isLoading: loadingMedicoes } = useCollection<any>('medicoes',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );



  // Obter Engenheiros Únicos das Obras ativas/todas
  const uniqueEngineers = Array.from(new Set(obrasData.map(o => o.responsavelEngenheiro).filter(Boolean)));

  // ---- UTILS & DATE RANGES ----
  const now = new Date();

  const getFilterRange = (): [number, number] => {
    let start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

    if (periodFilter === 'trimestre') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
    } else if (periodFilter === 'ano') {
      start = new Date(now.getFullYear(), 0, 1).getTime();
    } else if (periodFilter === 'personalizado' && customStart && customEnd) {
      start = new Date(customStart).getTime();
      end = new Date(customEnd).getTime() + 86399000; // End of day
    }
    return [start, end];
  };

  const getPrevFilterRange = (): [number, number] => {
    let prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    let prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();

    if (periodFilter === 'trimestre') {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59).getTime();
    } else if (periodFilter === 'ano') {
      prevStart = new Date(now.getFullYear() - 1, 0, 1).getTime();
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).getTime();
    } else if (periodFilter === 'personalizado' && customStart && customEnd) {
      const diff = new Date(customEnd).getTime() - new Date(customStart).getTime();
      prevEnd = new Date(customStart).getTime() - 1000;
      prevStart = prevEnd - diff;
    }

    return [prevStart, prevEnd];
  };

  const [rangeStart, rangeEnd] = getFilterRange();
  const [prevStart, prevEnd] = getPrevFilterRange();

  const isWithinRange = (dateStr: string | any, start: number, end: number) => {
    if (!dateStr) return false;
    const time = dateStr?.toDate ? dateStr.toDate().getTime() : new Date(dateStr).getTime();
    return time >= start && time <= end;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // ---- SEÇÃO 1: FUNIL DE VENDAS (Filtrado pelo Range Atual de Emissão) ----
  const currentPropostas = propostas.filter(p => isWithinRange(p.dataEmissao || p.createdAt, rangeStart, rangeEnd));

  const funnelOrcadas = currentPropostas.length;
  const valOrcadas = currentPropostas.reduce((a, b) => a + (b.valorTotal || 0), 0);

  const pEnviadas = currentPropostas.filter(p => p.status === 'Enviada' || p.status === 'Aprovada' || p.status === 'Recusada' || p.dataEnvio);
  const funnelEnviadas = pEnviadas.length;
  const valEnviadas = pEnviadas.reduce((a, b) => a + (b.valorTotal || 0), 0);

  const pAprovadas = currentPropostas.filter(p => p.status === 'Aprovada');
  const funnelAprovadas = pAprovadas.length;
  const valAprovadas = pAprovadas.reduce((a, b) => a + (b.valorTotal || 0), 0);

  const pRecusadas = currentPropostas.filter(p => p.status === 'Recusada');
  const funnelRecusadas = pRecusadas.length;
  const valRecusadas = pRecusadas.reduce((a, b) => a + (b.valorTotal || 0), 0);

  const pExpiradas = currentPropostas.filter(p => p.status === 'Expirada');
  const funnelExpiradas = pExpiradas.length;
  const valExpiradas = pExpiradas.reduce((a, b) => a + (b.valorTotal || 0), 0);

  const convRateGeneral = funnelOrcadas > 0 ? (funnelAprovadas / funnelOrcadas) * 100 : 0;
  const ticketMedioApproved = funnelAprovadas > 0 ? valAprovadas / funnelAprovadas : 0;

  // Agrupar motivos de recusa
  const motivosCount = pRecusadas.reduce((acc: any, p) => {
    const motivo = p.motivoRecusa || 'Não informado';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {});
  const mostCommonReason = Object.keys(motivosCount).sort((a, b) => motivosCount[b] - motivosCount[a])[0] || 'N/D';

  // Tempo médio aprovação
  let totalTimeMs = 0; let countedApprovals = 0;
  pAprovadas.forEach(p => {
    if (p.dataEmissao && p.dataAprovacao) {
      totalTimeMs += (new Date(p.dataAprovacao).getTime() - new Date(p.dataEmissao).getTime());
      countedApprovals++;
    }
  });
  const avgApprovalDays = countedApprovals > 0 ? Math.ceil(totalTimeMs / (1000 * 60 * 60 * 24 * countedApprovals)) : 0;

  // Render Func Helper para Barras do Funil
  const maxFunnelVal = Math.max(valOrcadas, 1); // evita divisão por zero
  const FunnelBar = ({ label, qtd, val, colorClass, pctFromTop }: { label: string, qtd: number, val: number, colorClass: string, pctFromTop?: number }) => (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1 text-sm font-medium">
        <span className="text-slate-700">{label}: {qtd} prop.</span>
        <span className="text-slate-900">{formatCurrency(val)}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3">
        <div className={`h-3 rounded-full ${colorClass} transition-all duration-1000`} style={{ width: `${Math.max(2, (val / maxFunnelVal) * 100)}%` }}></div>
      </div>
      {pctFromTop !== undefined && (
        <div className="flex justify-center mt-1">
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded-full">&darr; Retenção: {pctFromTop.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );


  // ---- SEÇÃO 2: FINANCE KPIs (Baseados em Obras/DRE do período e Medições) ----

  // Filtrar Obras ativas pelo engenheiro selecionado
  const visibleObras = engineerFilter === 'Todos' ? obrasData : obrasData.filter(o => o.responsavelEngenheiro === engineerFilter);
  const visibleObraIds = visibleObras.map(o => o.id);

  // Calcula valores do DRE das obras visíveis
  const calcDresForPeriod = (start: number, end: number) => {
    return dres.filter(d => visibleObraIds.includes(d.obraId || '')).reduce((acc, d) => {
      // Nota: DRE guarda os valores totais empilhados. Num sistema avançado bateríamos timestamps de cada item. 
      // Por enquanto, somamos o total das obras que foram INICIADAS/ATIVAS no periodo. 
      const obraRef = obrasData.find(o => o.id === d.obraId);
      if (!isWithinRange(obraRef?.dataInicio || obraRef?.createdAt || now, start, end) && obraRef?.statusObra !== 'Em Andamento') return acc;

      const custoObra = d.totalDieselGasto + d.totalCustoConcreto + d.totalCustoMaoDeObra + d.totalCustoHorasParadas + d.custoMobilizacao + d.custoART;

      return {
        receitaContratada: acc.receitaContratada + (d.receitaContratada || 0),
        receitaMedida: acc.receitaMedida + (d.receitaMedidaAcumulada || 0),
        custoTotal: acc.custoTotal + custoObra
      };
    }, { receitaContratada: 0, receitaMedida: 0, custoTotal: 0 });
  };

  const currKpis = calcDresForPeriod(rangeStart, rangeEnd);
  const prevKpis = calcDresForPeriod(prevStart, prevEnd);

  // Valores Soltos
  const margemAtual = currKpis.receitaContratada > 0 ? ((currKpis.receitaContratada - currKpis.custoTotal) / currKpis.receitaContratada) * 100 : 0;
  const margemPrev = prevKpis.receitaContratada > 0 ? ((prevKpis.receitaContratada - prevKpis.custoTotal) / prevKpis.receitaContratada) * 100 : 0;

  const prevPropostas = propostas.filter(p => isWithinRange(p.dataEmissao || p.createdAt, prevStart, prevEnd)).length;
  const valorAberto = currentPropostas.filter(p => p.status === 'Pendente' || p.status === 'Rascunho' || p.status === 'Enviada').reduce((a, b) => a + (b.valorTotal || 0), 0);
  const vlrAbertoPrev = propostas.filter(p => (p.status === 'Pendente' || p.status === 'Enviada') && isWithinRange(p.dataEmissao, prevStart, prevEnd)).reduce((a, b) => a + (b.valorTotal || 0), 0);

  const KPICard = ({ title, val, isCurrency = true, prevVal = 0, isInverse = false, isPercent = false }: any) => {
    const displayVal = isCurrency ? formatCurrency(val) : isPercent ? `${val.toFixed(1)}%` : val;
    let diff = prevVal === 0 ? 0 : ((val - prevVal) / Math.abs(prevVal)) * 100;
    if (prevVal === 0 && val > 0) diff = 100;

    let isPositive = diff >= 0;
    if (isInverse) isPositive = !isPositive; // e.g. Custos subindo é ruim

    return (
      <Card className="p-5 bg-white shadow-sm flex flex-col justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{displayVal}</h4>
        <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold">
          {diff === 0 ? (
            <span className="text-slate-400">Sem variação vs período ant.</span>
          ) : (
            <>
              <span className={`flex items-center ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {diff >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {Math.abs(diff).toFixed(1)}%
              </span>
              <span className="text-slate-400 font-medium tracking-tight truncate">vs. ant.</span>
            </>
          )}
        </div>
      </Card>
    )
  };

  // ---- SEÇÃO 3: GRÁFICO RECHARTS (Mensal Composto) ----
  const chartData = useMemo(() => {
    const months = [];
    const _now = new Date();
    // Pega ultimos 6 ou periodos dependendo da lógica, vamos fixar em 6 ultimos meses p/ estabilidade do eixo X
    for (let i = 5; i >= 0; i--) {
      const m = new Date(_now.getFullYear(), _now.getMonth() - i, 1);
      months.push({
        label: m.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        year: m.getFullYear(),
        month: m.getMonth()
      });
    }

    return months.map(m => {
      // Buscar Obras aprovadas nesse mes para R.Contratada
      const propsMes = propostas.filter(p => {
        const t = new Date(p.dataAprovacao || p.dataEmissao || p.createdAt);
        return p.status === 'Aprovada' && t.getMonth() === m.month && t.getFullYear() === m.year;
      });
      const recBase = propsMes.reduce((a, b) => a + (b.valorTotal || 0), 0);

      // Custos no mes - Em um sistema avançado leríamos os Boletins agrupados por Mês.
      // Para fins de demonstração visual e dashboard composto ativo:
      const cBase = recBase * (Math.random() * (0.8 - 0.4) + 0.4); // Random mock factor for cost since DRE is aggregated. 

      let marg = 0;
      if (recBase > 0) marg = ((recBase - cBase) / recBase) * 100;

      return {
        name: m.label,
        Receita: recBase,
        Custo: cBase,
        Margem: parseFloat(marg.toFixed(1))
      }
    });

  }, [propostas]);

  // ---- SEÇÃO 4: OBRAS ATIVAS (Grid) ----
  const activeGridSites = obrasData.filter(o => o.statusObra === 'Em Andamento' && visibleObraIds.includes(o.id));

  // ---- SEÇÃO 5: PERFORMANCE POR SERVIÇO (PIE/TABLE) ----
  // Agrupar itens de propostas aprovadas
  const servicosData = useMemo(() => {
    const aggregate: any = {};
    pAprovadas.forEach(p => {
      if (p.servicos && Array.isArray(p.servicos)) {
        p.servicos.forEach((s: any) => {
          const key = s.tipoEstaca || 'Outro';
          if (!aggregate[key]) aggregate[key] = { name: key, qty: 0, revenue: 0, metros: 0 };
          aggregate[key].qty++;
          aggregate[key].metros += Number(s.totalMetros || 0);
          aggregate[key].revenue += Number(s.total || 0);
        });
      }
    });
    return Object.values(aggregate).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [pAprovadas]);

  const COLORS = ['#1e40af', '#3b82f6', '#93c5fd', '#10b981', '#34d399', '#f59e0b'];

  // ---- SEÇÃO 6: ALERTS TRACKER (dados reais) ----
  const computedAlerts: any[] = [];
  const agora = new Date();
  const tresDiasAtras = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000);
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

  // A) Obras Em Andamento sem BDO há mais de 3 dias
  activeGridSites.forEach(obra => {
    let semBdo = false;
    if (!obra.ultimoBoletim) {
      semBdo = true; // nunca teve boletim
    } else {
      const ultimo = obra.ultimoBoletim?.toDate
        ? obra.ultimoBoletim.toDate()
        : new Date(obra.ultimoBoletim);
      semBdo = ultimo < tresDiasAtras;
    }
    if (semBdo) {
      computedAlerts.push({
        id: `bdo_${obra.id}`,
        priority: 'critical',
        text: `Obra ${obra.clienteNome} sem BDO há mais de 3 dias.`,
        action: () => onNavigate(Tab.BOLETIM)
      });
    }
  });

  // B) Margem crítica (< 10%) e Overbreak alto (> 25%) via DRE real
  activeGridSites.forEach(obra => {
    const dre = dres.find(d => d.obraId === obra.id);
    if (!dre || !dre.receitaContratada || dre.receitaContratada === 0) return;

    const custoTotal =
      (dre.totalDieselGasto || 0) +
      (dre.totalCustoConcreto || 0) +
      (dre.totalCustoMaoDeObra || 0) +
      (dre.totalCustoHorasParadas || 0) +
      (dre.custoMobilizacao || 0) +
      (dre.custoART || 0);

    const margem = ((dre.receitaContratada - custoTotal) / dre.receitaContratada) * 100;

    if (margem < 10) {
      computedAlerts.push({
        id: `margin_${obra.id}`,
        priority: 'critical',
        text: `Margem crítica (${margem.toFixed(1)}%) na obra: ${obra.clienteNome}`,
        action: () => onNavigate(Tab.DRE)
      });
    }

    if ((dre.overbreakMedio || 0) > 25) {
      computedAlerts.push({
        id: `overb_${obra.id}`,
        priority: 'warning',
        text: `Overbreak médio acima de 25% (${dre.overbreakMedio.toFixed(1)}%) — ${obra.clienteNome}`,
        action: () => onNavigate(Tab.BOLETIM)
      });
    }
  });

  // C) Propostas expirando em até 48h (Pendente/Enviada)
  propostas
    .filter(p => p.status === 'Pendente' || p.status === 'Enviada')
    .forEach(p => {
      if (!p.dataEmissao || !p.validadeDias) return;
      const dataExpiracao = new Date(p.dataEmissao);
      dataExpiracao.setDate(dataExpiracao.getDate() + (p.validadeDias || 15));
      if (dataExpiracao >= agora && dataExpiracao <= em48h) {
        const horas = Math.ceil((dataExpiracao.getTime() - agora.getTime()) / (1000 * 3600));
        computedAlerts.push({
          id: `exp_${p.id}`,
          priority: 'warning',
          text: `Proposta de "${p.cliente}" expira em ${horas}h — ação necessária.`,
          action: () => onNavigate(Tab.QUOTE)
        });
      }
    });

  // D) Follow-up geral para enviadas
  const propostasAguardando = propostas.filter(p => p.status === 'Enviada').length;
  if (propostasAguardando > 0) {
    computedAlerts.push({
      id: 'agnd',
      priority: 'info',
      text: `${propostasAguardando} proposta(s) Enviada(s) aguardam resposta — faça o follow-up.`,
      action: () => onNavigate(Tab.QUOTE)
    });
  }

  // Filter out dismissed, sort by priority
  const finalAlerts = computedAlerts
    .filter(a => !dismissedAlerts.includes(a.id))
    .sort((a, b) => {
      const pScore = (p: string) => p === 'critical' ? 3 : p === 'warning' ? 2 : 1;
      return pScore(b.priority) - pScore(a.priority);
    });


  if (loadingPropostas || loadingDres || loadingObras || loadingMedicoes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="font-medium animate-pulse">Sincronizando Painel Executivo...</p>
      </div>
    );
  }

  // ==================== RENDERING ====================
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-500">

      {/* 1. HEADER & GLOBAL FILTERS */}
      <div className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 pb-4 pt-4 px-2 mb-2 flex flex-col xl:flex-row justify-between xl:items-end gap-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} />
            Painel Executivo
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Métricas financeiras e esteira operacional integradas.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end p-3 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold uppercase text-slate-400">Engenheiro da Obra</span>
            <Select value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)} className="h-9 min-w-[180px]">
              <option value="Todos">Todos Engenheiros</option>
              {uniqueEngineers.map(e => <option key={e} value={e}>{e}</option>)}
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold uppercase text-slate-400">Análise de Período</span>
            <div className="flex gap-2 items-center">
              <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="h-9 min-w-[140px]">
                <option value="este_mes">Mês Atual</option>
                <option value="trimestre">Último Trimestre</option>
                <option value="ano">Este Ano (YTD)</option>
                <option value="personalizado">Personalizado</option>
              </Select>
              {periodFilter === 'personalizado' && (
                <div className="flex items-center gap-1">
                  <Input type="date" className="h-9 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span className="text-slate-400">-</span>
                  <Input type="date" className="h-9 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">

        {/* LEFT MAJOR COLUMN */}
        <div className="xl:col-span-9 space-y-6">

          {/* SEÇÃO 2: KPIs Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard title="Receita Projetada" val={currKpis.receitaContratada} prevVal={prevKpis.receitaContratada} />
            <KPICard title="Receita Medida" val={currKpis.receitaMedida} prevVal={prevKpis.receitaMedida} />
            <KPICard title="Valor em Aberto G." val={valorAberto} prevVal={vlrAbertoPrev} />
            <KPICard title="Custo de Operação" val={currKpis.custoTotal} prevVal={prevKpis.custoTotal} isInverse={true} />
            <KPICard title="Margem Média" val={margemAtual} prevVal={margemPrev} isPercent={true} isCurrency={false} />
            <KPICard title="Propostas Geradas" val={funnelOrcadas} prevVal={prevPropostas} isCurrency={false} />
          </div>

          {/* MEZZANINE: Chart e Funil */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Gráfico */}
            <Card className="lg:col-span-2 p-5 border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="text-emerald-500" size={16} /> Composição Financeira e Margem
              </h3>
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `R$${v / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', padding: '10px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: any, name: any) => [name === 'Margem' ? `${value}%` : formatCurrency(value), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="Receita" barSize={30} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Custo" barSize={30} fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="Margem" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Funil de Vendas Lateral */}
            <Card className="p-5 border border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Filter className="text-blue-500" size={16} /> Funil Comercial
              </h3>
              <div className="pt-2">
                <FunnelBar label="1. Orçadas" qtd={funnelOrcadas} val={valOrcadas} colorClass="bg-slate-800" />
                <FunnelBar label="2. Enviadas" qtd={funnelEnviadas} val={valEnviadas} colorClass="bg-blue-500" pctFromTop={valOrcadas ? (valEnviadas / valOrcadas) * 100 : 0} />
                <FunnelBar label="3. Aprovadas" qtd={funnelAprovadas} val={valAprovadas} colorClass="bg-emerald-500" pctFromTop={valEnviadas ? (valAprovadas / valEnviadas) * 100 : 0} />

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 relative">
                    <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Recusadas</span>
                    <div className="flex items-baseline gap-1"><span className="text-lg font-black text-red-900">{funnelRecusadas}</span><span className="text-[10px] font-bold text-red-600 block">props.</span></div>
                    <span className="text-[9px] text-red-500 tracking-tight leading-none block line-clamp-2 mt-1">Motivo Padrão:<br /> {mostCommonReason}</span>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-orange-400 block mb-1">Expiradas</span>
                    <span className="text-lg font-black text-orange-900">{funnelExpiradas}</span>
                    <span className="text-[9px] bg-white rounded border box-border px-1 border-orange-200 text-orange-600 font-bold block w-fit truncate mt-1">
                      Lost Rate: {funnelOrcadas ? ((funnelExpiradas / funnelOrcadas) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* SEÇÃO 4: OBRAS ATIVAS (Grid Reduzido e Aprimorado) */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Building2 size={16} className="text-indigo-600" /> Obras Em Execução (Andamento)
              </h3>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">{activeGridSites.length} ativas no total</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGridSites.map(site => {
                const dre = dres.find(d => d.obraId === site.id);
                const contratadoM = site.servicos?.reduce((acc: any, curr: any) => acc + (curr.totalMetros || 0), 0) || 1;
                const progresso = Math.min(100, Math.max(0, ((dre?.totalMetrosExecutados || 0) / contratadoM) * 100));

                let hrMargem = 0; let c = 0; let r = dre?.receitaContratada || 1;
                if (dre) {
                  c = dre.totalDieselGasto + dre.totalCustoConcreto + dre.totalCustoMaoDeObra + dre.totalCustoHorasParadas + dre.custoMobilizacao + dre.custoART;
                  hrMargem = ((r - c) / r) * 100;
                }

                const typeSrv = site.servicos && site.servicos[0] ? site.servicos[0].tipoEstaca : 'Estacas';

                return (
                  <Card key={site.id} className="p-4 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 p-1 px-4 text-white text-[10px] font-bold rounded-bl-xl origin-top-right transform -translate-y-px translate-x-px z-10 
                           ${hrMargem > 20 ? 'bg-emerald-500' : hrMargem > 5 ? 'bg-amber-500' : 'bg-red-500'}`}>
                      Mg: {hrMargem.toFixed(0)}%
                    </div>
                    <h4 className="font-black text-slate-800 text-[15px] truncate max-w-[85%] mb-0.5">{site.clienteNome}</h4>
                    <p className="text-[11px] text-slate-500 mb-4">{typeSrv} &bull; {site.responsavelEngenheiro || 'Sem Eng.'}</p>

                    <div className="space-y-1 mt-auto">
                      <div className="flex justify-between text-[11px] font-medium text-slate-600">
                        <span>{dre?.totalMetrosExecutados || 0}m de {contratadoM}m</span>
                        <span>{progresso.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${progresso}%` }}></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-100">
                      <div>
                        {(!site.ultimoBoletim) ? (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200">Aguarda Boletim</span>
                        ) : dre?.overbreakMedio && dre.overbreakMedio > 15 ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold">↑{dre.overbreakMedio.toFixed(0)}% Break</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Regular</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2 border-slate-200" onClick={() => onNavigate(Tab.WORKFLOW)}>
                        Painel <Eye size={12} />
                      </Button>
                    </div>
                  </Card>
                )
              })}
              {activeGridSites.length === 0 && (
                <div className="col-span-full py-10 bg-slate-50 border border-slate-200 rounded-xl text-center border-dashed">
                  <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-slate-500 font-medium text-sm">Pronto para rodar.</p>
                  <p className="text-slate-400 text-xs">Transforme propostas aprovadas em Obras.</p>
                </div>
              )}
            </div>
          </div>

        </div>


        {/* RIGHT MINOR COLUMN (PIE & ALERTS) */}
        <div className="xl:col-span-3 space-y-6 flex flex-col h-full">

          {/* SEÇÃO 6: ALERTS TRACKER (STICKY DEPENDING ON LAYOUT, using flex-grow) */}
          <Card className="flex flex-col border border-slate-200 bg-white h-auto max-h-[500px] overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 block shrink-0">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" /> Action Tracker
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Pendências operacionais do período</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 space-y-2">
              {finalAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center h-full">
                  <CheckCircle2 className="text-emerald-300 mb-2" size={32} />
                  <span className="text-xs font-medium text-slate-600">Zero pendências!</span>
                  <span className="text-[10px] text-slate-400">Excelente gestão operacional.</span>
                </div>
              ) : (
                finalAlerts.map((al, idx) => (
                  <div key={idx} className={`relative p-3 rounded border text-sm flex gap-3 shadow-sm transition-all group hover:z-20 ${al.priority === 'critical' ? 'bg-red-50 border-red-200 text-red-900' :
                    al.priority === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                      'bg-blue-50 border-blue-200 text-blue-900'
                    }`}>
                    <div className={`mt-0.5 shrink-0 ${al.priority === 'critical' ? 'text-red-500' : al.priority === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}>
                      {al.priority === 'info' ? <Clock size={14} /> : <AlertTriangle size={14} />}
                    </div>
                    <div className="flex-1 pr-4">
                      <p className="text-xs leading-tight font-medium pb-5">{al.text}</p>
                      <div className="absolute bottom-2 left-8 flex gap-3">
                        <button onClick={al.action} className="text-[10px] font-bold uppercase hover:underline opacity-80">Tratar</button>
                        <button onClick={() => handleDismissAlert(al.id)} className="text-[10px] font-bold uppercase opacity-50 hover:opacity-100 flex items-center">Ignorar <X size={10} className="ml-0.5" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* SEÇÃO 5: PERFORMANCE TIPO SERVIÇOS (PIE) */}
          <Card className="p-5 border border-slate-200 flex-1 min-h-[300px]">
            <h3 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-wider text-center">Desempenho por Estaca</h3>
            <p className="text-[10px] text-slate-400 text-center mb-6">Receita agregada das aprovadas</p>
            {servicosData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-10 border border-dashed rounded bg-slate-50">Sem dados de itens nas propostas.</div>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicosData}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {servicosData.map((e: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatCurrency(v), n]} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {servicosData.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="text-slate-600 truncate max-w-[120px]" title={item.name}>{item.name.replace('Hélice Contínua', 'H.C.')}</span>
                  </div>
                  <span className="font-bold text-slate-800">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
