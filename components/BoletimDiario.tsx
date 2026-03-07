import React, { useState, useEffect, useMemo } from 'react';
import { logAudit } from '../src/utils/audit';
import { useForm, useFieldArray } from 'react-hook-form';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { where, collection, Timestamp, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Label, Input, Select, Button, Textarea, Toast } from './ui';
import { Plus, Trash2, Save, X, Search, Calendar as CalendarIcon, Drill, DollarSign, Users, Fuel, Activity, MapPin, Loader2, CloudRain, Sun, Cloud, Image as ImageIcon, FileText } from 'lucide-react';
import { GlobalConfig, ConstructionSite, Boletim, DREObra } from '../types';

interface BoletimDiarioProps {
  config: GlobalConfig;
}

type FormEquipe = { cargo: string; nome: string; custoDia: number };

type BoletimFormData = {
  obraId: string;
  data: string;
  equipamentoId: string;
  operadorNome: string;

  // Produção
  estacasExecutadas: number;
  metrosExecutados: number;

  // Horas
  horasProducao: number;
  horasParada: number;
  motivoParada: string;
  descricaoParada: string;

  // Consumos
  dieselConsumidoLitros: number;
  concretoConsumidoM3: number;

  // Equipe & Condições
  equipe: FormEquipe[];
  condicaoClima: string;
  condicaoSolo: string;

  // Obs
  observacoes: string;
};

export const BoletimDiario: React.FC<BoletimDiarioProps> = ({ config }) => {
  const { user, profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'obra' | 'producao' | 'consumos' | 'obs'>('obra');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // List Filters
  const [filtroObraId, setFiltroObraId] = useState<string>('');
  const [filtroDataInit, setFiltroDataInit] = useState<string>('');
  const [filtroDataEnd, setFiltroDataEnd] = useState<string>('');

  // Live Data
  const [companyData, setCompanyData] = useState<any>(null);

  const { data: obrasData, isLoading: loadingObras } = useCollection<ConstructionSite>('obras',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { data: bdosRaw, isLoading: loadingBdos } = useCollection<Boletim>('boletins',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  useEffect(() => {
    const fetchEmpr = async () => {
      if (!profile?.tenantId) return;
      const ref = doc(db, 'empresas', profile.tenantId);
      const snap = await getDoc(ref);
      if (snap.exists()) setCompanyData(snap.data());
    };
    fetchEmpr();
  }, [profile?.tenantId]);

  const obrasAtivas = obrasData.filter(o => o.statusObra === 'Em Andamento');

  // Filtra Boletins p/ Tabela
  const boletinsList = useMemo(() => {
    return bdosRaw.filter(b => {
      let pass = true;
      if (filtroObraId && b.obraId !== filtroObraId) pass = false;
      const ts = b.data?.toDate ? b.data.toDate().getTime() : new Date(b.data).getTime();
      if (filtroDataInit && ts < new Date(filtroDataInit).getTime()) pass = false;
      if (filtroDataEnd && ts > new Date(filtroDataEnd).getTime() + 86400000) pass = false;
      return pass;
    }).sort((a, b) => (b.data?.toDate?.() || new Date(b.data)).getTime() - (a.data?.toDate?.() || new Date(a.data)).getTime());
  }, [bdosRaw, filtroObraId, filtroDataInit, filtroDataEnd]);


  // -------- REACT-HOOK-FORM --------
  const { register, control, handleSubmit, watch, reset, setValue } = useForm<BoletimFormData>({
    mode: 'onBlur',
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      equipe: [],
      estacasExecutadas: 0,
      metrosExecutados: 0,
      horasProducao: 0,
      horasParada: 0,
      dieselConsumidoLitros: 0,
      concretoConsumidoM3: 0,
      condicaoClima: 'Ensolarado',
      condicaoSolo: 'Normal',
      motivoParada: '',
      descricaoParada: ''
    }
  });

  const { fields: equipeFields, append: appendEquipe, remove: removeEquipe } = useFieldArray({
    control, name: 'equipe'
  });

  // -------- WATCH & CALCULATIONS --------
  const wObraId = watch('obraId');
  const wMetros = watch('metrosExecutados') || 0;
  const wEstacas = watch('estacasExecutadas') || 0;
  const wConcretoM3 = watch('concretoConsumidoM3') || 0;
  const wDieselL = watch('dieselConsumidoLitros') || 0;
  const wHorasParada = watch('horasParada') || 0;
  const wEquipe = watch('equipe') || [];

  const obraSelecionadaForm = obrasAtivas.find(o => o.id === wObraId);
  const diamPrincipalM: number = (!obraSelecionadaForm?.servicos || obraSelecionadaForm.servicos.length === 0)
    ? 0.40 // Default se n tiver servico atrelado
    : parseFloat(obraSelecionadaForm.servicos[0].tipoEstaca.replace(/\D/g, '')) / 100 || 0.40; // Ex: Extrai "40" de "Ø40cm" -> 0.4m

  const profMedia = wEstacas > 0 ? (wMetros / wEstacas) : 0;

  const raio = diamPrincipalM / 2;
  const concretoTeoricoM3 = Math.PI * Math.pow(raio, 2) * wMetros;
  const overbreakPct = concretoTeoricoM3 > 0 ? ((wConcretoM3 - concretoTeoricoM3) / concretoTeoricoM3) * 100 : 0;

  const precoDiesel = config.dieselPrice || companyData?.precoDiesel || 5.50;
  const custoDiesel = wDieselL * precoDiesel;

  const taxaHoraParada = companyData?.taxaHoraParadaPadrao || 150;
  const custoHorasParadas = wHorasParada * taxaHoraParada;

  const custoEquipeForm = wEquipe.reduce((acc, curr) => acc + (Number(curr.custoDia) || 0), 0);
  const vlrConcreto = companyData?.precoConcreto || 400;
  const custoConcreto = wConcretoM3 * vlrConcreto;

  const totalDiaTracker = custoDiesel + custoHorasParadas + custoEquipeForm; // (Somados no banco)


  // -------- SAVE TRANSACTION --------
  const onSubmit = async (data: BoletimFormData) => {
    if (!profile?.tenantId || !user?.uid) return;
    if (new Date(data.data) > new Date()) return alert('Data do boletim não pode ser no futuro.');

    setIsSaving(true);
    try {
      const equipNome = companyData?.equipamentos?.find((e: any) => e.id === data.equipamentoId)?.nome || 'Sem Nome';

      const bdoDoc: Partial<Boletim> = {
        tenantId: profile.tenantId,
        obraId: data.obraId,
        clienteNome: obraSelecionadaForm?.clienteNome || 'Desconhecido',
        data: Timestamp.fromDate(new Date(data.data + 'T12:00:00')),

        equipamentoId: data.equipamentoId,
        equipamentoNome: equipNome,
        operador: data.operadorNome, // Match type operator mapping

        estacasExecutadas: data.estacasExecutadas,
        metrosExecutados: data.metrosExecutados,
        // profundidadeMedia,

        horasProducao: data.horasProducao,
        horasParada: data.horasParada,
        motivoParada: data.motivoParada,

        dieselConsumidoLitros: data.dieselConsumidoLitros,
        precoLitroDieselReferencia: precoDiesel,

        concretoConsumidoM3: data.concretoConsumidoM3,
        concretoTeoricoM3,
        overbreakPct,

        custoDiesel,
        custoHorasParadas,
        custoMaoDeObra: custoEquipeForm,

        equipe: data.equipe,
        condicaoClima: data.condicaoClima || 'Ensolarado',
        condicaoSolo: data.condicaoSolo || 'Normal',
        observacoes: data.observacoes,

        createdByUserId: user.uid,
        createdAt: Timestamp.now()
      };

      const calcularOverbreakMedioPonderado = (dreAtual: any, novosMetros: number, novoOverbreak: number) => {
        const d_metros = dreAtual.totalMetrosExecutados || 0;
        const d_ob = dreAtual.overbreakMedio || 0;
        if (d_metros + novosMetros === 0) return novoOverbreak;
        return (d_ob * d_metros + novoOverbreak * novosMetros) / (d_metros + novosMetros);
      };

      const dreRef = doc(db, 'dre_obras', data.obraId);
      const obraRef = doc(db, 'obras', data.obraId);
      const boletimRef = doc(collection(db, 'boletins'));

      await runTransaction(db, async (transaction) => {
        // 1. TODOS OS GETs PRIMEIRO
        const dreSnap = await transaction.get(dreRef);
        const obraSnapshot = await transaction.get(obraRef);

        // 2. TODOS OS SETs E UPDATEs DEPOIS
        transaction.set(boletimRef, bdoDoc as Boletim);

        if (dreSnap.exists()) {
          const dreAtual = dreSnap.data() as DREObra;
          const novosMetros = (dreAtual.totalMetrosExecutados || 0) + data.metrosExecutados;
          const novoOverbreak = calcularOverbreakMedioPonderado(dreAtual, data.metrosExecutados, overbreakPct);

          transaction.update(dreRef, {
            totalMetrosExecutados: novosMetros,
            totalDieselGasto: (dreAtual.totalDieselGasto || 0) + custoDiesel,
            totalHorasParadas: (dreAtual.totalHorasParadas || 0) + data.horasParada,
            totalCustoMaoDeObra: (dreAtual.totalCustoMaoDeObra || 0) + custoEquipeForm,
            totalBoletins: (dreAtual.totalBoletins || 0) + 1,
            totalHorasProducao: (dreAtual.totalHorasProducao || 0) + data.horasProducao,
            totalCustoHorasParadas: (dreAtual.totalCustoHorasParadas || 0) + custoHorasParadas,
            totalCustoConcreto: (dreAtual.totalCustoConcreto || 0) + custoConcreto,
            overbreakMedio: novoOverbreak,
            updatedAt: Timestamp.now()
          });
        } else {
          transaction.set(dreRef, {
            tenantId: profile.tenantId!,
            obraId: data.obraId,
            receitaContratada: obraSelecionadaForm?.totalBudget || 0,
            receitaMedidaAcumulada: 0,
            totalMetrosExecutados: data.metrosExecutados,
            totalDieselGasto: custoDiesel,
            totalHorasParadas: data.horasParada,
            totalHorasProducao: data.horasProducao,
            totalCustoHorasParadas: custoHorasParadas,
            totalCustoMaoDeObra: custoEquipeForm,
            totalCustoConcreto: custoConcreto,
            totalBoletins: 1,
            overbreakMedio: overbreakPct,
            custoMobilizacao: 0,
            custoART: 0,
            updatedAt: Timestamp.now()
          } as DREObra);
        }

        if (obraSnapshot.exists()) {
          const currO = obraSnapshot.data() as ConstructionSite;
          transaction.update(obraRef, {
            ultimoBoletim: Timestamp.now(),
            executedMeters: (currO.executedMeters || 0) + data.metrosExecutados
          });
        }
      });

      await logAudit(
        user.uid,
        'CRIADO',
        'boletim',
        `Novo BDO lançado em ${data.data} para estaca Ø${diamPrincipalM * 100}cm`,
        profile.tenantId
      );

      setToastMessage('BDO registrado com sucesso!');
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      console.error('Erro ao salvar boletim:', err);
      alert(`Erro ao salvar: ${err.message || 'Falha ao gravar no banco.'}`);
    } finally {
      setIsSaving(false);
    }
  };


  // -------- PRE-RENDER CALCS (List View) --------
  const sumMetros = boletinsList.reduce((acc, b) => acc + (b.metrosExecutados || 0), 0);
  const sumLitros = boletinsList.reduce((acc, b) => acc + (b.dieselConsumidoLitros || 0), 0);
  const avgOb = boletinsList.length > 0 ? boletinsList.reduce((acc, b) => acc + (b.overbreakPct || 0), 0) / boletinsList.length : 0;
  const sumCusto = boletinsList.reduce((acc, b) => acc + ((b.custoDiesel || 0) + (b.custoHorasParadas || 0) + (b.custoMaoDeObra || 0)), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="text-indigo-600" size={32} /> Diário de Obras (BDO)
          </h1>
          <p className="text-sm text-slate-500 mt-2">Apontamentos de campo, consumos e performance real.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
          <Plus size={18} className="mr-2" /> Lançar BDO
        </Button>
      </header>

      {/* KPIs MAIN FILTERED LIST */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 shadow-sm flex items-center gap-4 bg-white relative overflow-hidden">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl relative z-10"><Drill size={24} /></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Volumetria Executada</p>
            <h4 className="text-2xl font-black text-slate-800">{sumMetros.toFixed(1)} <span className="text-sm text-slate-500 font-medium">m</span></h4>
          </div>
          <Activity className="absolute -right-4 -bottom-4 text-blue-50 opacity-50" size={100} />
        </Card>
        <Card className="p-5 border-slate-200 shadow-sm flex items-center gap-4 bg-white relative overflow-hidden">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl relative z-10"><Fuel size={24} /></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Diesel Consumido</p>
            <h4 className="text-2xl font-black text-slate-800">{sumLitros.toFixed(1)} <span className="text-sm text-slate-500 font-medium">L</span></h4>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-sm flex items-center gap-4 bg-white relative overflow-hidden">
          <div className={`p-3 rounded-xl relative z-10 ${avgOb > 20 ? 'bg-red-50 text-red-600' : avgOb > 10 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Activity size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Média Overbreak</p>
            <h4 className="text-2xl font-black text-slate-800">{avgOb.toFixed(1)} <span className="text-sm text-slate-500 font-medium">%</span></h4>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 shadow-sm flex items-center gap-4 bg-white relative overflow-hidden">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl relative z-10"><DollarSign size={24} /></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Impacto Financeiro Dia</p>
            <h4 className="text-2xl font-black text-slate-800">{formatCurrency(sumCusto)}</h4>
          </div>
        </Card>
      </div>

      {/* TABLE & FILTERS */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full min-w-[200px]">
            <Select value={filtroObraId} onChange={e => setFiltroObraId(e.target.value)} className="bg-white">
              <option value="">Filtro: Todas as Obras</option>
              {obrasData.map(o => <option key={o.id} value={o.id}>{o.clienteNome}</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500">De:</span>
            <Input type="date" className="h-10 text-xs w-full sm:w-auto" value={filtroDataInit} onChange={e => setFiltroDataInit(e.target.value)} />
            <span className="text-xs font-medium text-slate-500">Até:</span>
            <Input type="date" className="h-10 text-xs w-full sm:w-auto" value={filtroDataEnd} onChange={e => setFiltroDataEnd(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] font-bold text-slate-500 uppercase bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data BDO</th>
                <th className="px-6 py-4">Obra Cliente</th>
                <th className="px-6 py-4">Equipe / Eqp</th>
                <th className="px-6 py-4 text-center">Furação</th>
                <th className="px-6 py-4 text-center">Consumo (L)</th>
                <th className="px-6 py-4 text-center">Overbreak</th>
                <th className="px-6 py-4 text-right">R$ Operação/Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boletinsList.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Nenhum diário registrado neste período.</td></tr>
              ) : (
                boletinsList.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 border-l-4 border-indigo-500">
                      {b.data?.toDate ? b.data.toDate().toLocaleDateString() : new Date(b.data).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold block">{b.clienteNome}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 block text-xs">{b.equipamentoNome}</span>
                      <span className="text-[10px] text-slate-500">Resp: {(b.operador || 'N/a')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-800">{b.metrosExecutados}m</span>
                      <span className="text-xs text-slate-400 block tracking-tight">({b.estacasExecutadas || 0} estacas)</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">
                      {b.dieselConsumidoLitros} L
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${b.overbreakPct > 25 ? 'bg-red-50 text-red-600 border border-red-200' : b.overbreakPct > 15 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                        {b.overbreakPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-600 tracking-tight">
                      {formatCurrency((b.custoDiesel || 0) + (b.custoHorasParadas || 0) + (b.custoMaoDeObra || 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {/* -------- SHEET MODAL BDO -------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-[650px] bg-slate-50 h-full shadow-2xl flex flex-col border-l border-slate-300" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="px-6 py-5 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FileText size={20} className="text-indigo-600" /> Lançamento de BDO</h2>
                <p className="text-xs text-slate-400 font-medium">Os dados alimentarão o DRE da obra em tempo real.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Form Tabs Wrapper */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 shrink-0">
                {[
                  { id: 'obra', l: '📍 Obra e Equipe' }, { id: 'producao', l: '⚙️ Produção' }, { id: 'consumos', l: '🧪 Volumetria e Insumos' }, { id: 'obs', l: '📸 Extras' }
                ].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    {tab.l}
                  </button>
                ))}
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 relative">
                <form id="bdo_form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                  {/* TAB 1 */}
                  <div className={`${activeTab === 'obra' ? 'block' : 'hidden'} space-y-6 animate-in fade-in`}>
                    <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-4">
                      <div>
                        <Label>Selecione a Obra *</Label>
                        <Select {...register('obraId', { required: true })} className="font-medium text-slate-800 border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                          <option value="">Buscar obra em andamento...</option>
                          {obrasAtivas.map(o => <option key={o.id} value={o.id}>{o.clienteNome} ({o.enderecoDaObra})</option>)}
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Data Ref. do Boletim *</Label>
                          <Input type="date" {...register('data', { required: true })} max={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                          <Label>Equipamento Bate-Estaca *</Label>
                          <Select {...register('equipamentoId', { required: true })}>
                            <option value="">Selec. máquina...</option>
                            {companyData?.equipamentos?.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Nome do Operador</Label>
                        <Input {...register('operadorNome')} placeholder="Resp. pela máquina..." />
                      </div>
                    </Card>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-4">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} /> Quadro da Equipe</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Informe os envolvidos e preencha as diárias.</p>
                        </div>
                        <Button type="button" size="sm" onClick={() => appendEquipe({ cargo: '', nome: '', custoDia: 0 })} className="bg-slate-800 text-white text-xs h-8 px-3 rounded-md">
                          + Adicionar Profissional
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {equipeFields.length === 0 ? (
                          <div className="text-center py-6 border border-dashed text-slate-400 text-xs rounded-lg">Insira o time utilizado no dia (Ajudante, Eng., Motorista).</div>
                        ) : equipeFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2">
                            <Select {...register(`equipe.${index}.cargo`)} className="w-1/3 text-xs h-8" onChange={(e) => {
                              const cost = config.employees.find(x => x.role === e.target.value)?.dailyCost || 0;
                              setValue(`equipe.${index}.custoDia`, cost);
                            }}>
                              <option value="">Função</option>
                              {config.employees.map(c => <option key={c.id} value={c.role}>{c.role}</option>)}
                            </Select>
                            <Input placeholder="Nome" {...register(`equipe.${index}.nome`)} className="flex-1 text-xs h-8" />
                            <div className="relative w-24">
                              <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                              <Input type="number" step="0.01" {...register(`equipe.${index}.custoDia`, { valueAsNumber: true })} className="pl-6 text-xs h-8 font-medium" />
                            </div>
                            <button type="button" onClick={() => removeEquipe(index)} className="w-8 shrink-0 flex justify-center items-center rounded bg-red-50 text-red-400 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <div className="pt-2 text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold mr-2">Custo Mão de Obra do Dia:</span>
                          <span className="text-lg font-black text-slate-800">{formatCurrency(custoEquipeForm)}</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* TAB 2 */}
                  <div className={`${activeTab === 'producao' ? 'block' : 'hidden'} space-y-6 animate-in fade-in`}>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Drill size={18} /> Quantitativo Físico</h4>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <Label>Estacas Executadas</Label>
                          <Input type="number" {...register('estacasExecutadas', { valueAsNumber: true })} className="font-bold text-lg h-12" />
                        </div>
                        <div>
                          <Label>Total de Metros Perfurados (M linear)</Label>
                          <Input type="number" step="0.01" {...register('metrosExecutados', { valueAsNumber: true })} className="font-bold text-lg h-12 border-indigo-300 ring-4 ring-indigo-50" />
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-slate-50 text-slate-600 text-xs rounded border border-slate-100 flex items-center justify-between">
                        <span>ℹ️ Profundidade Média (estatística):</span>
                        <span className="font-bold">{profMedia.toFixed(2)}m/estaca</span>
                      </div>
                    </Card>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Activity size={18} /> Tempos e Movimentos</h4>
                      <div className="grid grid-cols-2 gap-5 mb-4">
                        <div>
                          <Label>Horas Totais Produção</Label>
                          <div className="relative">
                            <Input type="number" step="0.1" {...register('horasProducao', { valueAsNumber: true })} />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-300">HRS</span>
                          </div>
                        </div>
                        <div>
                          <Label>Horas Parada (Improdutiva)</Label>
                          <div className="relative">
                            <Input type="number" step="0.1" {...register('horasParada', { valueAsNumber: true })} className={`${wHorasParada > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : ''}`} />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-300">HRS</span>
                          </div>
                        </div>
                      </div>

                      {wHorasParada > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                          <div>
                            <Label className="text-amber-900">Motivo da Paralisação</Label>
                            <Select {...register('motivoParada')} className="border-amber-300 bg-white shadow-sm text-sm">
                              <option value="">Classificação da quebra...</option>
                              <option value="Aguardando Concreto">Caminhão: Aguardando Concreto</option>
                              <option value="Chuva">Clima: Chuva Forte / Vento</option>
                              <option value="Manunteção Equipamento">Equipamento: Manutenção / Quebra</option>
                              <option value="Aguardando Liberação Cliente">Cliente: Aguardando Liberação Frente</option>
                              <option value="Outro">Outro (Descrever)</option>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-amber-900">Descreva o motivo</Label>
                            <Textarea {...register('descricaoParada')} className="bg-white min-h-[60px] text-xs" placeholder="Descreva pormenores do problema." />
                          </div>
                          <div className="text-right text-xs font-bold text-amber-700">
                            * Custo da hora Parada gerado no DRE: {formatCurrency(custoHorasParadas)}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* TAB 3 */}
                  <div className={`${activeTab === 'consumos' ? 'block' : 'hidden'} space-y-6 animate-in fade-in`}>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Fuel size={18} /> Consumo de Diesel</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Litros informados pela bomba</Label>
                          <Input type="number" step="0.1" {...register('dieselConsumidoLitros', { valueAsNumber: true })} className="h-12 font-bold text-lg" />
                        </div>
                        <div>
                          <Label>Custo Lançado no BDO</Label>
                          <div className="h-12 border border-slate-200 bg-slate-50 rounded flex items-center px-4 font-black text-rose-600 justify-between">
                            <span>{formatCurrency(custoDiesel)}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Ref: R$ {precoDiesel.toFixed(2)}/L</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <div className="flex justify-between border-b border-slate-100 pb-2 mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} /> Abastecimento de Concreto</h4>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">Furo Referência: Ø {(diamPrincipalM * 100).toFixed(0)}cm</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                          <Label>Concreto Recebido / Consumido M³</Label>
                          <Input type="number" step="0.1" {...register('concretoConsumidoM3', { valueAsNumber: true })} className="h-12 font-bold text-lg border-indigo-300 ring-4 ring-indigo-50" />
                        </div>
                        <div>
                          <Label>Matemática Teórica (Fórmula)</Label>
                          <div className="h-12 border border-slate-200 bg-slate-50 rounded flex items-center px-4 font-black text-slate-700 justify-between">
                            <span>{concretoTeoricoM3.toFixed(2)} <span className="text-xs">M³</span></span>
                            <span className="text-[10px] text-slate-400 font-bold tracking-tighter">π*r²*h</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border flex justify-between items-center bg-slate-50 border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Diagnóstico Perda Overbreak</span>
                          <p className="text-xs text-slate-600">Representa as perdas de desvios geológicos/perfuratriz relatadas no preenchimento.</p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-black text-lg ${overbreakPct > 20 ? 'bg-red-100 text-red-700' : overbreakPct > 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {overbreakPct.toFixed(1)}%
                        </div>
                      </div>
                    </Card>

                  </div>

                  {/* TAB 4 */}
                  <div className={`${activeTab === 'obs' ? 'block' : 'hidden'} space-y-6 animate-in fade-in`}>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><CloudRain size={18} /> Condições Locais</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Clima</Label>
                          <Select {...register('condicaoClima')}>
                            <option value="Ensolarado">☀️ Ensolarado / Bom</option>
                            <option value="Nublado">☁️ Nublado</option>
                            <option value="Chuva Fraca">🌧️ Chuva Fraca</option>
                            <option value="Chuva Forte">⛈️ Chuva Forte</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Identificação Solo</Label>
                          <Select {...register('condicaoSolo')}>
                            <option value="Normal">Normal</option>
                            <option value="Rocha/Pedras">Rocha/Pedras</option>
                            <option value="Nível D'água Elevado">Nível D'água Elevado</option>
                            <option value="Solo Mole">Solo Mole / Aterro</option>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 border-slate-200 bg-white shadow-sm">
                      <Label>Observações Gerais do Canteiro</Label>
                      <Textarea {...register('observacoes')} className="min-h-[120px] bg-slate-50 text-sm mt-1" placeholder="Adicione relatos atípicos, queixas de terceiros ou lembretes visuais..." />
                    </Card>

                    <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-sm font-bold text-slate-600 block">Anexos Fotográficos</span>
                      <span className="text-[10px] block mt-1">Este recurso do Firebase Storage virá em versão futura desta refatoração.</span>
                    </div>

                  </div>
                </form>
              </div>

              {/* Modal Footer (Sticky fixed at bottom of modal) */}
              <div className="bg-white border-t border-slate-200 p-5 shrink-0 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <div className="hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Prévia Operacional do Dia</span>
                  <span className="text-sm font-black text-rose-600">{formatCurrency(totalDiaTracker)} lançados (-)</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Descartar</Button>
                  <Button form="bdo_form" disabled={isSaving || !wObraId} className="bg-slate-900 border-none w-full sm:w-auto px-8 gap-2">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Publicar Diário
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} variant="success" />}
    </div>
  );
};
