import React, { useState } from 'react';
import { ConstructionSite, GlobalConfig, Tab } from '../types';
import { analyzeSiteHealth, analyzeLogistics, GroundingSource } from '../services/geminiService';
import { DonutChart } from './DonutChart';
import { BrainCircuit, Loader2, Droplets, BarChart3, Building2, MapPin, ExternalLink, Search, TrendingUp, DollarSign, FileText, Users, Plus, GitPullRequestArrow } from 'lucide-react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { where } from 'firebase/firestore';

interface DashboardProps {
  sites: ConstructionSite[];
  config: GlobalConfig;
  onNavigate: (tab: Tab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ sites, config, onNavigate }) => {
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, GroundingSource[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { user, profile } = useAuth();
  const { data: obras, isLoading: loadingObras } = useCollection<ConstructionSite>('obras', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const { data: propostas, isLoading: loadingPropostas } = useCollection<any>('propostas', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const { data: clientes, isLoading: loadingClientes } = useCollection<any>('clientes', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

  const handleAnalyzeHealth = async (site: ConstructionSite) => {
    setLoading(prev => ({ ...prev, [`health-${site.id}`]: true }));
    const result = await analyzeSiteHealth(site, config.dieselPrice);
    setAnalysis(prev => ({ ...prev, [site.id]: result.text }));
    setSources(prev => ({ ...prev, [site.id]: result.sources }));
    setLoading(prev => ({ ...prev, [`health-${site.id}`]: false }));
  };

  const handleAnalyzeLogistics = async (site: ConstructionSite) => {
    setLoading(prev => ({ ...prev, [`logistics-${site.id}`]: true }));
    const result = await analyzeLogistics(site);
    setAnalysis(prev => ({ ...prev, [`log-${site.id}`]: result.text }));
    setSources(prev => ({ ...prev, [`log-${site.id}`]: result.sources }));
    setLoading(prev => ({ ...prev, [`logistics-${site.id}`]: false }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativa': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pausada': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Concluída': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const consolidated = sites.reduce((acc, site) => ({
    revenue: acc.revenue + site.revenue,
    cost: acc.cost + site.totalCost,
    budget: acc.budget + site.totalBudget,
    stoppedHours: acc.stoppedHours + site.machineHoursStopped,
  }), { revenue: 0, cost: 0, budget: 0, stoppedHours: 0 });

  const grossMargin = consolidated.revenue > 0 
    ? ((consolidated.revenue - consolidated.cost) / consolidated.revenue) * 100 
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Painel Financeiro Estemco</h2>
            <p className="text-slate-500 mt-2">Visão consolidada de FP&A e Auditoria Inteligente com Gemini Grounding.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Diesel Ref.</p>
              <p className="text-sm font-bold text-slate-700">R$ {config.dieselPrice.toFixed(2)}</p>
           </div>
           <div className="flex items-center gap-2 text-sm text-slate-500 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Sincronizado
            </div>
        </div>
      </header>

      {/* AÇÕES RÁPIDAS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => onNavigate(Tab.QUOTE)}
          className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 hover:bg-amber-50 transition-all group"
        >
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <span className="font-bold text-slate-700 group-hover:text-amber-700">Nova Proposta</span>
        </button>

        <button 
          onClick={() => onNavigate(Tab.CLIENTS)}
          className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
        >
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <span className="font-bold text-slate-700 group-hover:text-indigo-700">Novo Cliente</span>
        </button>

        <button 
          onClick={() => onNavigate(Tab.WORKFLOW)}
          className="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 hover:bg-blue-50 transition-all group"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <GitPullRequestArrow size={24} />
          </div>
          <span className="font-bold text-slate-700 group-hover:text-blue-700">Ver Obras Ativas</span>
        </button>
      </section>

      {/* KPIS GERAIS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Obras Ativas</p>
                 <Building2 size={16} className="text-blue-500" />
              </div>
              <h4 className="text-3xl font-bold text-slate-800">
                {loadingObras ? <Loader2 size={24} className="animate-spin text-slate-300" /> : obras.length}
              </h4>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Propostas</p>
                 <FileText size={16} className="text-emerald-500" />
              </div>
              <h4 className="text-3xl font-bold text-slate-800">
                {loadingPropostas ? <Loader2 size={24} className="animate-spin text-slate-300" /> : propostas.length}
              </h4>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Clientes</p>
                 <Users size={16} className="text-indigo-500" />
              </div>
              <h4 className="text-3xl font-bold text-slate-800">
                {loadingClientes ? <Loader2 size={24} className="animate-spin text-slate-300" /> : clientes.length}
              </h4>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Receita Medida</p>
                 <DollarSign size={16} className="text-emerald-500" />
              </div>
              <h4 className="text-3xl font-bold text-emerald-600">R$ {(consolidated.revenue / 1000).toFixed(0)}k</h4>
          </div>
      </section>

      {/* CARDS DE OBRA - O "RAIO-X" */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500"/> Raio-X das Obras em Execução
        </h3>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {sites.map(site => {
                const overbreak = ((site.concreteRealVol - site.concreteTheoreticalVol) / Math.max(site.concreteTheoreticalVol, 1)) * 100;
                const progressPct = (site.executedMeters / Math.max(site.contractMeters, 1)) * 100;
                const margin = ((site.revenue - site.totalCost) / Math.max(site.revenue, 1)) * 100;

                return (
                <div key={site.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:border-blue-400 transition-all group">
                    <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border mb-2 inline-block ${getStatusColor(site.status)}`}>
                                {site.status}
                            </span>
                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{site.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Building2 size={14}/> {site.clientName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Budget Total</p>
                            <p className="text-xl font-bold text-slate-900">R$ {site.totalBudget.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Gráfico de Rosca - Raio-X de Custos */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Composição de Custos</h4>
                            <DonutChart data={site.data} />
                            <div className="flex justify-around pt-2">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Overbreak</p>
                                    <p className={`text-sm font-bold ${overbreak > 10 ? 'text-red-500' : 'text-emerald-500'}`}>{overbreak.toFixed(1)}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Margem</p>
                                    <p className={`text-sm font-bold ${margin > 20 ? 'text-emerald-600' : 'text-amber-500'}`}>{margin.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Métricas de Produção */}
                        <div className="flex flex-col justify-center space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span className="uppercase">Progresso de Perfuração</span>
                                    <span>{progressPct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 text-right">{site.executedMeters}m de {site.contractMeters}m</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Receita Medida</p>
                                    <p className="text-sm font-bold text-emerald-600">R$ {site.revenue.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Direto</p>
                                    <p className="text-sm font-bold text-red-500">R$ {site.totalCost.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <MapPin size={18} />
                                </div>
                                <div className="truncate">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase">Localização</p>
                                    <p className="text-xs font-medium text-blue-900 truncate">{site.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI INSIGHTS AREA */}
                    <div className="bg-slate-900 p-6 space-y-4">
                        {(analysis[site.id] || analysis[`log-${site.id}`]) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                                {analysis[site.id] && (
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs">
                                        <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold uppercase text-[10px] tracking-widest">
                                            <Search size={14} /> Auditoria Gemini Search
                                        </div>
                                        <div className="text-slate-300 leading-relaxed font-light">{analysis[site.id]}</div>
                                        {sources[site.id] && sources[site.id].length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                                                {sources[site.id].map((src, i) => (
                                                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] bg-white/10 px-2 py-1 rounded text-white hover:bg-white/20 transition-colors">
                                                        <ExternalLink size={10} /> {src.title.slice(0, 15)}...
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {analysis[`log-${site.id}`] && (
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs">
                                        <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold uppercase text-[10px] tracking-widest">
                                            <MapPin size={14} /> Logística Gemini Maps
                                        </div>
                                        <div className="text-slate-300 leading-relaxed font-light">{analysis[`log-${site.id}`]}</div>
                                        {sources[`log-${site.id}`] && sources[`log-${site.id}`].length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                                                {sources[`log-${site.id}`].map((src, i) => (
                                                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] bg-indigo-500/20 px-2 py-1 rounded text-indigo-300 hover:bg-indigo-500/30 transition-colors">
                                                        <MapPin size={10} /> {src.title}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => handleAnalyzeHealth(site)}
                                disabled={loading[`health-${site.id}`]}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all disabled:opacity-50 border border-white/5"
                            >
                                {loading[`health-${site.id}`] ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                Auditoria de Mercado
                            </button>
                            <button 
                                onClick={() => handleAnalyzeLogistics(site)}
                                disabled={loading[`logistics-${site.id}`]}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-blue-900/40"
                            >
                                {loading[`logistics-${site.id}`] ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                                Análise Logística
                            </button>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
      </section>
    </div>
  );
};