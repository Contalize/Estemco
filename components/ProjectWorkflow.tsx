import React, { useState, useEffect } from 'react';
import { ConstructionSite, Tab } from '../types';
import { Building2, FileText, MapPin, Hash, Activity, Search, Plus, X, AlertTriangle, LayoutGrid, List, ChevronRight, CheckCircle2, DollarSign, Calendar as CalendarIcon, Clock, MoreVertical, MessageSquare, Briefcase, Ruler } from 'lucide-react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../src/firebase/config';
import { collection, query, where, orderBy, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, Button, Input, Select, Textarea, Label, Toast } from './ui';

interface ProjectWorkflowProps {
  onNavigate?: (tab: string, state?: any) => void;
}

export const ProjectWorkflow: React.FC<ProjectWorkflowProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [engineerFilter, setEngineerFilter] = useState<string>('Todos');

  // Sheet State
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'boletins' | 'medicoes' | 'anotacoes'>('resumo');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('Problemas Técnicos');
  const [statusObs, setStatusObs] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Collections
  const { data: obras, isLoading, error } = useCollection<ConstructionSite>('obras', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const { data: dres } = useCollection<any>('dre_obras', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

  // Derived state
  const selectedObra = obras.find(o => o.id === selectedObraId) || null;
  const dreObra = dres.find(d => d.obraId === selectedObraId) || null;

  // Filters
  const uniqueEngineers = Array.from(new Set(obras.map(o => o.responsavelEngenheiro).filter(Boolean)));

  const filteredObras = obras.filter(obra => {
    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = (obra.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.enderecoDaObra?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    let matchesStatus = statusFilter === 'Todos' || obra.statusObra === statusFilter;
    let matchesEngineer = engineerFilter === 'Todos' || obra.responsavelEngenheiro === engineerFilter;

    return matchesSearch && matchesStatus && matchesEngineer;
  });

  const obrasEmAndamento = filteredObras.filter(o => o.statusObra === 'Em Andamento' || !o.statusObra);
  const obrasParalisadas = filteredObras.filter(o => o.statusObra === 'Paralisada');
  const obrasConcluidas = filteredObras.filter(o => o.statusObra === 'Concluída');
  const obrasCanceladas = filteredObras.filter(o => o.statusObra === 'Cancelada');

  // Alerts
  const obrasSemBoletim = obrasEmAndamento.filter(obra => {
    if (!obra.ultimoBoletim) return true;
    const diffTime = Math.abs(new Date().getTime() - new Date(obra.ultimoBoletim).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  });

  // Utils
  const notify = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getDREData = (obraId: string) => dres.find(d => d.obraId === obraId) || null;

  const handleUpdateStatus = async () => {
    if (!selectedObraId) return;
    setIsUpdatingStatus(true);
    try {
      const updateData: any = { statusObra: targetStatus };
      if (targetStatus === 'Paralisada') {
        updateData.motivoParalisacao = statusReason === 'Outro' ? statusObs : statusReason;
      }
      if (targetStatus === 'Concluída' || targetStatus === 'Cancelada') {
        updateData.dataFimReal = new Date().toISOString();
      }

      const obraRef = doc(db, 'obras', selectedObraId);
      await updateDoc(obraRef, updateData);

      notify(`Status atualizado para ${targetStatus}`);
      setIsStatusModalOpen(false);
    } catch (e) {
      alert('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const KanbanColumn = ({ title, obras, colorClass }: { title: string, obras: ConstructionSite[], colorClass: string }) => (
    <div className={`flex flex-col bg-slate-50/50 rounded-lg border border-slate-200 min-h-[500px] w-[320px] shrink-0`}>
      <div className={`p-4 font-semibold text-slate-800 border-b border-slate-200 flex justify-between items-center ${colorClass}`}>
        <span>{title}</span>
        <span className="bg-white/50 px-2 py-0.5 rounded text-xs">{obras.length}</span>
      </div>
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {obras.map(obra => {
          const dre = getDREData(obra.id);
          const executed = dre?.totalMetrosExecutados || 0;
          const contrated = (obra.servicos || []).reduce((acc: number, curr: any) => acc + (curr.totalMetros || 0), 0) || 1; // avoid / 0
          const progress = Math.min(100, Math.max(0, (executed / contrated) * 100));

          let alertNoBdo = false;
          if (obra.statusObra === 'Em Andamento' || !obra.statusObra) {
            if (!obra.ultimoBoletim) alertNoBdo = true;
            else {
              const diffTime = Math.abs(new Date().getTime() - new Date(obra.ultimoBoletim).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              alertNoBdo = diffDays > 3;
            }
          }

          return (
            <Card key={obra.id} className="p-4 bg-white border-slate-200 cursor-pointer hover:shadow-md transition-shadow relative" onClick={() => setSelectedObraId(obra.id)}>
              {alertNoBdo && (
                <div className="absolute top-0 right-0 p-1">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
              <h4 className="font-bold text-slate-900 text-sm mb-1">{obra.clienteNome}</h4>
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{obra.enderecoDaObra}</span>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Progresso: {executed}m / {contrated}m</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                  <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CalendarIcon size={12} />
                  {obra.dataInicio ? new Date(obra.dataInicio).toLocaleDateString() : 'Não iniciada'}
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-indigo-600 px-2 flex items-center gap-1">
                  Ver <ChevronRight size={12} />
                </Button>
              </div>
            </Card>
          )
        })}
        {obras.length === 0 && (
          <div className="h-full flex items-center justify-center p-6 text-center text-slate-400 text-sm">
            Nenhuma obra nesta coluna
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Obras</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie a execução através de um Kanban produtivo.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <LayoutGrid size={16} /> Kanban
          </button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <List size={16} /> Lista
          </button>
        </div>
      </div>

      {/* ALERT BANNER */}
      {obrasSemBoletim.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-amber-800 font-medium text-sm">Obra sem atualização de boletim</h4>
            <p className="text-amber-700 text-xs mt-0.5">
              Existem {obrasSemBoletim.length} obra(s) Em Andamento sem envio de BDO há mais de 3 dias. Verifique com a equipe de campo.
            </p>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Status:</span>
            {['Todos', 'Em Andamento', 'Paralisada', 'Concluída', 'Cancelada'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex w-full md:w-auto gap-3 items-center">
            <Select value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)} className="w-full md:w-48 text-sm">
              <option value="Todos">Todos os Engenheiros</option>
              {uniqueEngineers.map(e => <option key={e} value={e}>{e}</option>)}
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente ou endereço"
                className="pl-9 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* MAIN VIEW (KANBAN OR LIST) */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
          <KanbanColumn title="Em Andamento" obras={obrasEmAndamento} colorClass="bg-blue-50/50" />
          <KanbanColumn title="Paralisada" obras={obrasParalisadas} colorClass="bg-amber-50/50" />
          <KanbanColumn title="Concluída" obras={obrasConcluidas} colorClass="bg-emerald-50/50" />
          <KanbanColumn title="Cancelada" obras={obrasCanceladas} colorClass="bg-red-50/50" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Obra / Cliente</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-center">Progresso</th>
                <th className="px-6 py-3 font-medium">Eng. Responsável</th>
                <th className="px-6 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredObras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Nenhuma obra encontrada.</td>
                </tr>
              ) : (
                filteredObras.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{o.clienteNome}</td>
                    <td className="px-6 py-4">{o.statusObra || 'Em Andamento'}</td>
                    <td className="px-6 py-4 text-center">N/A</td>
                    <td className="px-6 py-4">{o.responsavelEngenheiro || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedObraId(o.id)}>Ver Detalhes</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* SIDE PANEL (SHEET) */}
      {selectedObra && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setSelectedObraId(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedObra.clienteNome}</h2>
                <div className="flex items-center gap-3 mt-1.5 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                        ${selectedObra.statusObra === 'Concluída' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      selectedObra.statusObra === 'Paralisada' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        selectedObra.statusObra === 'Cancelada' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-blue-100 text-blue-800 border-blue-200'}`}
                  >
                    {selectedObra.statusObra || 'Em Andamento'}
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin size={14} /> {selectedObra.enderecoDaObra}
                  </span>
                </div>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setSelectedObraId(null)}>
                <X size={20} className="text-slate-400" />
              </Button>
            </div>

            {/* Sheet Content container with fixed height flex */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sheet Tabs */}
              <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white pt-2">
                {[
                  { id: 'resumo', label: 'Resumo da Obra', icon: <Activity size={16} /> },
                  { id: 'boletins', label: 'Boletins Diários', icon: <FileText size={16} /> },
                  { id: 'medicoes', label: 'Medições (Faturamento)', icon: <DollarSign size={16} /> },
                  { id: 'anotacoes', label: 'Anotações', icon: <MessageSquare size={16} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT AREAS */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                {/* RESUMO TAB */}
                {activeTab === 'resumo' && (
                  <div className="space-y-6">

                    {/* Ações de Status */}
                    <Card className="p-5 bg-white border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Ações de Status</h3>
                      <div className="flex flex-wrap gap-3">
                        {(selectedObra.statusObra === 'Em Andamento' || !selectedObra.statusObra) && (
                          <>
                            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setTargetStatus('Paralisada'); setIsStatusModalOpen(true); }}>Paralisar Obra</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setTargetStatus('Concluída'); setIsStatusModalOpen(true); }}>Concluir Obra</Button>
                          </>
                        )}
                        {selectedObra.statusObra === 'Paralisada' && (
                          <>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setTargetStatus('Em Andamento'); setIsStatusModalOpen(true); }}>Retomar Obra</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { setTargetStatus('Cancelada'); setIsStatusModalOpen(true); }}>Cancelar Obra</Button>
                          </>
                        )}
                        {selectedObra.statusObra === 'Concluída' && (
                          <Button className="bg-slate-800 hover:bg-slate-900 text-white" onClick={() => { setTargetStatus('Em Andamento'); setIsStatusModalOpen(true); }}>Reabrir Obra (Retrabalho)</Button>
                        )}
                      </div>
                      {selectedObra.statusObra === 'Paralisada' && selectedObra.motivoParalisacao && (
                        <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-sm rounded border border-amber-200 flex items-start gap-2">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          <div>
                            <strong>Obra paralisada:</strong> {selectedObra.motivoParalisacao}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* KPIs Financeiros */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">KPIs Financeiros & Produção</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-white">
                          <p className="text-xs text-slate-500 font-medium">Receita Contratada</p>
                          <p className="text-xl font-bold text-slate-900 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreObra?.receitaContratada || 0)}
                          </p>
                        </Card>
                        <Card className="p-4 bg-white">
                          <p className="text-xs text-slate-500 font-medium">Receita Faturada (Medida)</p>
                          <p className="text-xl font-bold text-emerald-600 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreObra?.receitaMedidaAcumulada || 0)}
                          </p>
                        </Card>
                        <Card className="p-4 bg-white">
                          <p className="text-xs text-slate-500 font-medium">Metros Executados Pelo BDO</p>
                          <p className="text-xl font-bold text-slate-900 mt-1">{dreObra?.totalMetrosExecutados || 0}m</p>
                        </Card>
                        <Card className="p-4 bg-white">
                          <p className="text-xs text-slate-500 font-medium">Custos Reais de Produção</p>
                          <p className="text-xl font-bold text-red-600 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((dreObra?.totalCustoConcreto || 0) + (dreObra?.totalCustoMaoDeObra || 0) + (dreObra?.totalHorasParadas || 0))}
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'boletins' && (
                  <ProjectSheetBoletins obraId={selectedObra.id} />
                )}
                {activeTab === 'medicoes' && (
                  <ProjectSheetMedicoes obra={selectedObra} />
                )}
                {activeTab === 'anotacoes' && (
                  <ProjectSheetAnotacoes obraId={selectedObra.id} />
                )}

              </div>
            </div>
          </div>

          {/* INTERNAL STATUS MODAL DENTRO DO PROJECTWORKFLOW */}
          {isStatusModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 relative">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Confirmar: {targetStatus}</h2>

                {targetStatus === 'Paralisada' ? (
                  <div className="space-y-4 mb-6">
                    <p className="text-sm border-s border-s-1">Por favor informe por que a obra está sendo paralisada. Isso irá congelar os indicadores.</p>
                    <div>
                      <Label>Motivo Principal</Label>
                      <Select value={statusReason} onChange={e => setStatusReason(e.target.value)}>
                        <option value="Problemas Técnicos">Problemas Técnicos na Obra</option>
                        <option value="Aguardando Materiais">Aguardando Materiais (Concreto, Ferragem)</option>
                        <option value="Atraso Pagamento">Atraso no Pagamento</option>
                        <option value="Chuvas / Clima">Chuvas / Clima</option>
                        <option value="Cliente Solicitou">Cliente Solicitou Paralisação</option>
                        <option value="Outro">Outro Motivo</option>
                      </Select>
                    </div>
                    {statusReason === 'Outro' && (
                      <div>
                        <Label>Descreva o Motivo</Label>
                        <Textarea value={statusObs} onChange={e => setStatusObs(e.target.value)} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 mb-6">
                    Tem certeza de que deseja atualizar esta obra para "<strong className="text-slate-900">{targetStatus}</strong>"?
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleUpdateStatus} disabled={isUpdatingStatus}>Confirmar Mudança</Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} variant="success" />}
    </div>
  );
};

// --------------------------------------------------------------------------------------
// SUB COMPONENTES DE ABAS DO SHEEET
// --------------------------------------------------------------------------------------

const ProjectSheetBoletins = ({ obraId }: { obraId: string }) => {
  const { data: bdos, isLoading } = useCollection<any>('boletins', [where('obraId', '==', obraId)]);
  const bdosOrdenados = [...bdos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (isLoading) return <div className="p-12 text-center text-slate-500">Carregando boletins...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Histórico de BDOs</h3>
          <p className="text-xs text-slate-500">Boletins diários enviados pelo campo.</p>
        </div>
        <Button size="sm" onClick={() => (window as any).dispatchEvent(new CustomEvent('NAVIGATE_TO', { detail: 'boletim' }))} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={14} /> Lançar Novo
        </Button>
      </div>

      {bdosOrdenados.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-dashed border-slate-300">
          <FileText size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-medium">Nenhum boletim nesta obra.</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">A equipe deve registrar boletins pelo Gestão de BDOs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bdosOrdenados.map(b => (
            <Card key={b.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><CalendarIcon size={12} /> {new Date(b.data).toLocaleDateString()}</span>
                <p className="font-bold text-slate-900 mt-1">{b.metrosExecutados}m executados</p>
                <span className="text-xs text-slate-600 block mt-0.5">Op: {b.operador || '-'} &bull; {b.dieselConsumidoLitros}L consumidos</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600">R$ {(b.custoDiesel + b.custoMaoDeObra + b.custoHorasParadas).toFixed(2)} custo</p>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Overbreak: {b.overbreakPct?.toFixed(1) || 0}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectSheetMedicoes = ({ obra }: { obra: ConstructionSite }) => {
  const { data: medicoes, isLoading } = useCollection<any>('medicoes', [where('obraId', '==', obra.id)]);
  const [val, setVal] = useState('');
  const [dataVenc, setDataVenc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!val || !dataVenc) return alert('Prencha os dados da medição');
    try {
      await addDoc(collection(db, 'medicoes'), {
        obraId: obra.id,
        tenantId: obra.tenantId,
        valor: parseFloat(val),
        status: 'A Receber',
        dataVencimento: new Date(dataVenc).toISOString(),
        createdAt: serverTimestamp()
      });
      setVal(''); setDataVenc(''); setIsAdding(false);
    } catch (e) { alert('Erro ao registrar'); }
  };

  if (isLoading) return <div className="text-center p-8">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Medições de Faturamento</h3>
          <p className="text-xs text-slate-500">Valores a receber e faturas geradas geridas com o financeiro.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}><Plus size={14} className="mr-1" /> Nova Medição</Button>
      </div>

      {isAdding && (
        <Card className="p-4 bg-emerald-50/50 border-emerald-100 flex flex-wrap gap-4 items-end">
          <div>
            <Label>Valor cobrado (R$)</Label>
            <Input type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)} />
          </div>
          <div>
            <Label>Data de Vencimento</Label>
            <Input type="date" value={dataVenc} onChange={e => setDataVenc(e.target.value)} />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAdd}>Registrar</Button>
        </Card>
      )}

      <div className="space-y-3">
        {medicoes.map(m => (
          <Card key={m.id} className="p-4 bg-white flex justify-between items-center border-l-4 border-l-emerald-500">
            <div>
              <p className="font-bold text-slate-900">R$ {Number(m.valor).toFixed(2)}</p>
              <span className="text-xs text-slate-500">Vence em: {new Date(m.dataVencimento).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {m.status}
            </span>
          </Card>
        ))}
        {medicoes.length === 0 && !isAdding && (
          <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200">Sem medições registradas.</div>
        )}
      </div>
    </div>
  )
};

const ProjectSheetAnotacoes = ({ obraId }: { obraId: string }) => {
  const { profile } = useAuth();
  const { data: notas } = useCollection<any>('anotacoes_obra', [where('obraId', '==', obraId)]);
  const [texto, setTexto] = useState('');

  const handleAdd = async () => {
    if (!texto.trim()) return;
    try {
      await addDoc(collection(db, 'anotacoes_obra'), {
        obraId,
        tenantId: profile?.tenantId,
        texto,
        autorNome: profile?.name || 'Corpo Técnico',
        createdAt: serverTimestamp()
      });
      setTexto('');
    } catch (e) { }
  };

  const handleDel = async (id: string) => {
    try { await deleteDoc(doc(db, 'anotacoes_obra', id)); } catch (e) { }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-4 p-2">
        {notas.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)).map(n => (
          <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
            <span className="text-xs font-bold text-slate-800">{n.autorNome}</span>
            <span className="text-[10px] text-slate-400 ml-2">{n.createdAt ? new Date(n.createdAt.toDate?.() || n.createdAt).toLocaleString() : 'agora'}</span>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{n.texto}</p>
            <button onClick={() => handleDel(n.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        ))}
        {notas.length === 0 && <div className="text-center text-slate-400 mt-10 text-sm">Nenhuma anotação nesta obra...</div>}
      </div>
      <div className="pt-4 mt-2 border-t border-slate-300 shrink-0">
        <Textarea
          placeholder="Nova anotação..."
          className="min-h-[60px] resize-none mb-2 bg-white"
          value={texto}
          onChange={e => setTexto(e.target.value)}
        />
        <Button className="w-full text-xs h-8" onClick={handleAdd}>Salvar Anotação</Button>
      </div>
    </div>
  )
};