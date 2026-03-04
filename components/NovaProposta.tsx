import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, FileText, X, Check, Search, Calendar as CalendarIcon, Building2, Drill, DollarSign, FileSignature, Loader2, Trash2, Scale, MoreVertical, Edit2, PlayCircle, CheckCircle2 } from 'lucide-react';
import { propostasService, PropostaData } from '../services/propostasService';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, where, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { Card, Label, Input, Select, Button, Textarea, Combobox, DropdownMenu, DropdownMenuItem } from './ui';
import { ClientForm, ClientFormData } from './ClientForm';

// --- TYPES ---
type ProposalFormData = {
  id?: string;
  // A. Dados Básicos
  clienteId: string;
  cliente: string;
  validadeDias: number;
  prazoExecucao: number;
  inicioPrevisto: string;
  
  // B. Escopo Técnico
  servicos: {
    tipoEstaca: string;
    diametro: string;
    quantidade: number;
    metragemPrevista: number;
    precoMetro: number;
  }[];
  
  // C. Valores
  mobilizacao: number;
  taxaAgua: number;
  horaParada: number;
  
  // D. Condições
  solicitaNF: boolean;
  impostoNF: number;
  solicitaART: boolean;
  valorART: number;
  sinalPercentual: number;
  prazoSaldoDias: string;
  parcelas: {
    dias: number;
    valor: number;
  }[];

  // E. Cláusulas e Termos
  textoObrigacoesContratante: string;
  textoObrigacoesContratada: string;
  textoCondicoesRisco: string;
  textoTermoAceite: string;
  clausulasExtras: { titulo: string; texto: string }[];

  // F. Local da Obra
  mesmoEnderecoCliente: boolean;
  obraCep?: string;
  obraEndereco?: string;
  obraNumero?: string;
  obraComplemento?: string;
  obraBairro?: string;
  obraCidade?: string;
  obraUf?: string;
};

// --- MAIN COMPONENT ---
export const NovaProposta: React.FC = () => {
  const { user, profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proposals, setProposals] = useState<PropostaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [activeTab, setActiveTab] = useState<'basicos' | 'escopo' | 'valores' | 'condicoes' | 'clausulas'>('basicos');
  const [equipamentosEmpresa, setEquipamentosEmpresa] = useState<any[]>([]);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Inline Client Creation State
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);

  const { data: clientes } = useCollection<any>('clientes', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

  useEffect(() => {
    if (profile?.tenantId) {
      carregarPropostas();
    }
  }, [profile?.tenantId]);

  const { register, handleSubmit, watch, reset, control, setValue, formState: { errors } } = useForm<ProposalFormData>({
    defaultValues: {
      inicioPrevisto: new Date().toISOString().split('T')[0],
      validadeDias: 15,
      prazoExecucao: 30,
      servicos: [{ tipoEstaca: '', diametro: '', quantidade: 1, metragemPrevista: 0, precoMetro: 0 }],
      mobilizacao: 0,
      taxaAgua: 0,
      horaParada: 500,
      solicitaNF: false,
      impostoNF: 10,
      solicitaART: false,
      valorART: 103.51,
      sinalPercentual: 50,
      prazoSaldoDias: '30',
      parcelas: [],
      textoObrigacoesContratante: '',
      textoObrigacoesContratada: '',
      textoCondicoesRisco: '',
      textoTermoAceite: '',
      clausulasExtras: [],
      mesmoEnderecoCliente: true
    }
  });

  const { fields: clausulasFields, append: appendClausula, remove: removeClausula } = useFieldArray({
    control,
    name: "clausulasExtras"
  });

  const { fields: servicosFields, append: appendServico, remove: removeServico } = useFieldArray({
    control,
    name: "servicos"
  });

  const { fields: parcelasFields, replace: replaceParcelas } = useFieldArray({
    control,
    name: "parcelas"
  });

  const handleOpenModal = async (proposalToEdit?: PropostaData) => {
    setIsModalOpen(true);
    setActiveTab('basicos');
    
    if (proposalToEdit) {
      setEditingProposalId(proposalToEdit.id || null);
      reset({
        ...proposalToEdit,
        inicioPrevisto: proposalToEdit.inicioPrevisto || new Date().toISOString().split('T')[0],
        servicos: proposalToEdit.servicos || [{ tipoEstaca: '', diametro: '', quantidade: 1, metragemPrevista: 0, precoMetro: 0 }],
        parcelas: proposalToEdit.parcelas || [],
        clausulasExtras: proposalToEdit.clausulasExtras || []
      } as ProposalFormData);
    } else {
      setEditingProposalId(null);
      reset({
        inicioPrevisto: new Date().toISOString().split('T')[0],
        validadeDias: 15,
        prazoExecucao: 30,
        servicos: [{ tipoEstaca: '', diametro: '', quantidade: 1, metragemPrevista: 0, precoMetro: 0 }],
        mobilizacao: 0,
        taxaAgua: 0,
        horaParada: 500,
        solicitaNF: false,
        impostoNF: 10,
        solicitaART: false,
        valorART: 103.51,
        sinalPercentual: 50,
        prazoSaldoDias: '30',
        parcelas: [],
        textoObrigacoesContratante: '',
        textoObrigacoesContratada: '',
        textoCondicoesRisco: '',
        textoTermoAceite: '',
        clausulasExtras: [],
        mesmoEnderecoCliente: true
      });
      
      // Load default texts from tenant settings
      if (profile?.tenantId) {
        try {
          const docRef = doc(db, 'empresas', profile.tenantId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEquipamentosEmpresa(data.equipamentos || []);
            reset(formValues => ({
              ...formValues,
              textoObrigacoesContratante: data.textoObrigacoesContratante || '',
              textoObrigacoesContratada: data.textoObrigacoesContratada || '',
              textoCondicoesRisco: data.textoCondicoesRisco || '',
              textoTermoAceite: data.textoTermoAceite || '',
              impostoNF: data.impostoPadraoNF || 10,
              valorART: data.valorPadraoART || 103.51,
              taxaAgua: data.taxaAguaPadrao || 0,
              horaParada: data.taxaHoraParadaPadrao || 500,
              validadeDias: data.validadePropostaDias || 15
            }));
          }
        } catch (err) {
          console.error("Erro ao carregar configurações da empresa", err);
        }
      }
    }
  };

  const handleSearchCepObra = async () => {
    const cepValue = watch('obraCep');
    if (!cepValue) return;
    
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
      if (!response.ok) throw new Error('CEP não encontrado');
      
      const data = await response.json();
      
      setValue('obraEndereco', data.street || '');
      setValue('obraBairro', data.neighborhood || '');
      setValue('obraCidade', data.city || '');
      setValue('obraUf', data.state || '');
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP. Verifique o número e tente novamente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const carregarPropostas = async () => {
    if (!profile?.tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await propostasService.listarPropostas(profile.tenantId);
      setProposals(data);
    } catch (error) {
      console.error("Erro ao carregar propostas", error);
      setError("Não foi possível carregar as propostas. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  // Watch values for live calculation
  const servicos = watch('servicos') || [];
  const mobilizacao = watch('mobilizacao') || 0;
  const solicitaNF = watch('solicitaNF');
  const impostoNF = watch('impostoNF') || 10;
  const solicitaART = watch('solicitaART');
  const valorART = watch('valorART') || 103.51;
  const sinalPercentual = watch('sinalPercentual') || 0;
  const prazoSaldoDias = watch('prazoSaldoDias') || '';
  const parcelas = watch('parcelas') || [];

  // Calculations
  const subtotalServico = servicos.reduce((acc, curr) => acc + ((curr.quantidade || 0) * (curr.metragemPrevista || 0) * (curr.precoMetro || 0)), 0);
  let totalGeral = subtotalServico + Number(mobilizacao);
  
  if (solicitaART) totalGeral += Number(valorART);
  if (solicitaNF) totalGeral = totalGeral * (1 + Number(impostoNF) / 100);

  const valorEntrada = totalGeral * (sinalPercentual / 100);
  const saldoRestante = totalGeral - valorEntrada;
  const totalParcelas = parcelas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const isParcelasValid = Math.abs(totalParcelas - saldoRestante) < 0.01;

  // Effect to generate parcelas when prazoSaldoDias changes
  useEffect(() => {
    if (!prazoSaldoDias) {
      replaceParcelas([]);
      return;
    }

    const diasArray = prazoSaldoDias.split(/[\s,]+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
    
    if (diasArray.length > 0) {
      const valorPorParcela = saldoRestante / diasArray.length;
      const newParcelas = diasArray.map(dias => ({
        dias,
        valor: Number(valorPorParcela.toFixed(2))
      }));
      
      // Adjust last installment to fix rounding issues
      if (newParcelas.length > 0) {
        const sumExceptLast = newParcelas.slice(0, -1).reduce((acc, curr) => acc + curr.valor, 0);
        newParcelas[newParcelas.length - 1].valor = Number((saldoRestante - sumExceptLast).toFixed(2));
      }
      
      replaceParcelas(newParcelas);
    } else {
      replaceParcelas([]);
    }
  }, [prazoSaldoDias, saldoRestante, replaceParcelas]);

  const onSubmit = async (data: ProposalFormData) => {
    if (!profile?.tenantId) return;
    setIsSaving(true);
    try {
      const proposalData = {
        cliente: data.cliente,
        clienteId: data.clienteId,
        valorTotal: totalGeral,
        servicos: data.servicos,
        prazoExecucao: data.prazoExecucao,
        mobilizacao: data.mobilizacao,
        faturamentoMinimo: 0,
        taxaAgua: data.taxaAgua,
        horaParada: data.horaParada,
        solicitaNF: data.solicitaNF,
        impostoNF: data.impostoNF,
        solicitaART: data.solicitaART,
        valorART: data.valorART,
        sinalPercentual: data.sinalPercentual,
        prazoSaldoDias: data.prazoSaldoDias,
        parcelas: data.parcelas,
        textoObrigacoesContratante: data.textoObrigacoesContratante || '',
        textoObrigacoesContratada: data.textoObrigacoesContratada || '',
        textoCondicoesRisco: data.textoCondicoesRisco || '',
        textoTermoAceite: data.textoTermoAceite || '',
        clausulasExtras: data.clausulasExtras || [],
        mesmoEnderecoCliente: data.mesmoEnderecoCliente,
        obraCep: data.obraCep || '',
        obraEndereco: data.obraEndereco || '',
        obraNumero: data.obraNumero || '',
        obraComplemento: data.obraComplemento || '',
        obraBairro: data.obraBairro || '',
        obraCidade: data.obraCidade || '',
        obraUf: data.obraUf || '',
        tenantId: profile.tenantId
      };

      if (editingProposalId) {
        await propostasService.atualizarProposta(editingProposalId, proposalData);
        setToastMessage('Proposta atualizada com sucesso!');
      } else {
        await propostasService.criarProposta({
          ...proposalData,
          dataEmissao: new Date().toISOString(),
          status: 'Pendente'
        });
        setToastMessage('Proposta salva com sucesso!');
      }
      
      await carregarPropostas(); // Recarrega a lista do Firebase
      
      setIsModalOpen(false);
      reset();
      setActiveTab('basicos');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      alert('Erro ao salvar proposta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAprovarEGerarObra = async (prop: PropostaData) => {
    if (!profile?.tenantId || !prop.id) return;
    
    try {
      // 1. Atualizar status da proposta
      await propostasService.atualizarProposta(prop.id, { status: 'Aprovada' });
      
      // 2. Criar nova obra
      const novaObra = {
        tenantId: profile.tenantId,
        createdByUserId: user?.uid || '',
        propostaId: prop.id,
        clienteId: prop.clienteId,
        clienteNome: prop.cliente,
        servicos: prop.servicos || [],
        enderecoDaObra: prop.mesmoEnderecoCliente ? 'Mesmo endereço do cliente' : `${prop.obraEndereco}, ${prop.obraNumero} - ${prop.obraBairro}, ${prop.obraCidade} - ${prop.obraUf}`,
        statusObra: 'Em Andamento',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'obras'), novaObra);
      
      setToastMessage('Proposta aprovada e Obra gerada com sucesso!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      await carregarPropostas();
    } catch (error) {
      console.error("Erro ao aprovar proposta e gerar obra:", error);
      alert("Erro ao aprovar proposta. Tente novamente.");
    }
  };

  const handleCreateClient = async (data: ClientFormData) => {
    if (!profile?.tenantId) return;
    setIsSavingClient(true);
    try {
      const newClient = {
        ...data,
        status: 'Ativo',
        tenantId: profile.tenantId,
        createdByUserId: user?.uid || '',
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'clientes'), newClient);
      
      // Auto-select the new client
      setValue('clienteId', docRef.id, { shouldValidate: true });
      setValue('cliente', data.nomeRazaoSocial);
      
      setIsNewClientModalOpen(false);
      setToastMessage('Cliente criado e selecionado com sucesso!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar o cliente.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovada': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Aprovada</span>;
      case 'Pendente': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pendente</span>;
      case 'Recusada': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Recusada</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Propostas Comerciais</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus orçamentos e contratos.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus size={16} /> Nova Proposta
        </Button>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar proposta..." className="pl-9 bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Nº Proposta</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Data Emissão</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Valor Total</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <X size={32} className="mb-2" />
                      <p className="font-medium">{error}</p>
                      <Button variant="outline" className="mt-4" onClick={carregarPropostas}>Tentar Novamente</Button>
                    </div>
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileText size={48} className="mb-4 text-slate-300" />
                      <h3 className="text-lg font-medium text-slate-900 mb-1">Ainda não existem propostas</h3>
                      <p className="text-sm mb-4">Crie sua primeira proposta comercial para começar a gerenciar seus orçamentos.</p>
                      <Button onClick={() => handleOpenModal()} className="gap-2">
                        <Plus size={16} /> Criar a primeira proposta
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                proposals.map((prop) => (
                  <tr key={prop.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      {prop.id?.substring(0, 8).toUpperCase() || 'NOVO'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{prop.cliente}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(prop.dataEmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(prop.status)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(prop.valorTotal)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
                          <MoreVertical size={16} />
                        </Button>
                      }>
                        <DropdownMenuItem onClick={() => handleOpenModal(prop)} className="flex items-center gap-2">
                          <Edit2 size={14} /> Editar Proposta
                        </DropdownMenuItem>
                        {(prop.status === 'Pendente' || prop.status === 'Enviada') && (
                          <DropdownMenuItem onClick={() => handleAprovarEGerarObra(prop)} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <PlayCircle size={14} /> Aprovar e Gerar Obra
                          </DropdownMenuItem>
                        )}
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL / SHEET (Simulated) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingProposalId ? 'Editar Proposta' : 'Criar Nova Proposta'}</h2>
                <p className="text-sm text-slate-500">Preencha os dados para gerar o orçamento.</p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>

            {/* Modal Body (Form) */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="proposal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* TABS NAVIGATION */}
                <div className="flex space-x-1 border-b border-slate-200 mb-6">
                  <button type="button" onClick={() => setActiveTab('basicos')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basicos' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2"><Building2 size={16}/> Básicos</div>
                  </button>
                  <button type="button" onClick={() => setActiveTab('escopo')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'escopo' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2"><Drill size={16}/> Escopo</div>
                  </button>
                  <button type="button" onClick={() => setActiveTab('valores')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'valores' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2"><DollarSign size={16}/> Valores</div>
                  </button>
                  <button type="button" onClick={() => setActiveTab('condicoes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'condicoes' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2"><FileSignature size={16}/> Condições</div>
                  </button>
                  <button type="button" onClick={() => setActiveTab('clausulas')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'clausulas' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2"><Scale size={16}/> Cláusulas e Termos</div>
                  </button>
                </div>

                {/* TAB CONTENT: BÁSICOS */}
                <div className={activeTab === 'basicos' ? 'block space-y-6' : 'hidden'}>
                  <div className="space-y-4">
                    <div>
                      <Label>Cliente</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Combobox
                            options={clientes.map(c => ({ label: c.nomeRazaoSocial, value: c.id }))}
                            value={watch('clienteId')}
                            onChange={(val) => {
                              setValue('clienteId', val, { shouldValidate: true });
                              const selectedCliente = clientes.find(c => c.id === val);
                              setValue('cliente', selectedCliente ? selectedCliente.nomeRazaoSocial : '');
                            }}
                            placeholder="Selecione um cliente..."
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsNewClientModalOpen(true)}
                          className="gap-2 whitespace-nowrap"
                        >
                          <Plus size={16} /> Novo
                        </Button>
                      </div>
                      <input type="hidden" {...register('clienteId', { required: true })} />
                      <input type="hidden" {...register('cliente')} />
                      {errors.clienteId && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Validade (dias)</Label>
                        <Input type="number" min="1" {...register('validadeDias', { required: true, valueAsNumber: true })} />
                      </div>
                      <div>
                        <Label>Prazo Execução (dias)</Label>
                        <Input type="number" min="1" {...register('prazoExecucao', { required: true, valueAsNumber: true })} />
                      </div>
                      <div>
                        <Label>Início Previsto</Label>
                        <Input type="date" {...register('inicioPrevisto', { required: true })} />
                      </div>
                    </div>
                  </div>

                  {/* NOVA SEÇÃO: LOCAL DA OBRA */}
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Local da Obra</h3>
                    
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900" {...register('mesmoEnderecoCliente')} />
                      <span className="text-sm font-medium text-slate-700">O endereço da obra é o mesmo do cliente?</span>
                    </label>

                    {!watch('mesmoEnderecoCliente') && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                        {isSearchingCep && (
                          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                          </div>
                        )}
                        <div>
                          <Label>CEP</Label>
                          <Input placeholder="00000-000" {...register('obraCep')} onBlur={handleSearchCepObra} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Logradouro / Endereço</Label>
                          <Input placeholder="Rua, Avenida..." {...register('obraEndereco')} />
                        </div>
                        <div>
                          <Label>Número</Label>
                          <Input placeholder="123" {...register('obraNumero')} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Complemento</Label>
                          <Input placeholder="Lote, Quadra..." {...register('obraComplemento')} />
                        </div>
                        <div>
                          <Label>Bairro</Label>
                          <Input placeholder="Bairro" {...register('obraBairro')} />
                        </div>
                        <div>
                          <Label>Cidade</Label>
                          <Input placeholder="Cidade" {...register('obraCidade')} />
                        </div>
                        <div>
                          <Label>UF</Label>
                          <Input placeholder="SP" {...register('obraUf')} maxLength={2} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TAB CONTENT: ESCOPO */}
                <div className={activeTab === 'escopo' ? 'block space-y-4' : 'hidden'}>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="mb-0">Itens de Serviço</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1"
                      onClick={() => appendServico({ tipoEstaca: '', diametro: '', quantidade: 1, metragemPrevista: 0, precoMetro: 0 })}
                    >
                      <Plus size={14} /> Adicionar Tipo de Estaca
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {servicosFields.map((field, index) => (
                      <Card key={field.id} className="p-4 bg-slate-50 border-slate-200 relative">
                        {index > 0 && (
                          <button 
                            type="button" 
                            onClick={() => removeServico(index)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Serviço {index + 1}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div>
                            <Label>Tipo de Estaca</Label>
                            <Select {...register(`servicos.${index}.tipoEstaca` as const, { required: true })}>
                              <option value="">Selecione...</option>
                              {equipamentosEmpresa.length > 0 && (
                                <optgroup label="Meus Equipamentos">
                                  {equipamentosEmpresa.map((eq: any) => (
                                    <option key={eq.id} value={eq.nome}>{eq.nome}</option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Terceirizados">
                                <option value="Hélice Contínua">Hélice Contínua</option>
                                <option value="Strauss">Strauss</option>
                                <option value="Cravada">Cravada</option>
                                <option value="Raiz">Raiz</option>
                                <option value="Escavada">Escavada</option>
                              </optgroup>
                            </Select>
                          </div>
                          <div>
                            <Label>Diâmetro</Label>
                            <Input placeholder="Ex: Ø40" {...register(`servicos.${index}.diametro` as const, { required: true })} />
                          </div>
                          <div>
                            <Label>Qtd. Estacas</Label>
                            <Input type="number" min="1" {...register(`servicos.${index}.quantidade` as const, { required: true, valueAsNumber: true })} />
                          </div>
                          <div>
                            <Label>Metragem/Estaca (m)</Label>
                            <Input type="number" step="0.01" min="0" {...register(`servicos.${index}.metragemPrevista` as const, { required: true, valueAsNumber: true })} />
                          </div>
                          <div>
                            <Label>Preço por Metro (R$)</Label>
                            <Input type="number" step="0.01" min="0" {...register(`servicos.${index}.precoMetro` as const, { required: true, valueAsNumber: true })} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* TAB CONTENT: VALORES */}
                <div className={activeTab === 'valores' ? 'block space-y-4' : 'hidden'}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mobilização (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('mobilizacao', { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Taxa Água (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('taxaAgua', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Hora Parada (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('horaParada', { valueAsNumber: true })} />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <Label>Taxas e Impostos</Label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900" {...register('solicitaNF')} />
                        <span className="text-sm font-medium text-slate-700">Solicita Nota Fiscal</span>
                      </label>
                      {watch('solicitaNF') && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Label className="mb-0 whitespace-nowrap text-xs">Imposto (%):</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 w-24" {...register('impostoNF', { valueAsNumber: true })} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900" {...register('solicitaART')} />
                        <span className="text-sm font-medium text-slate-700">Solicita ART</span>
                      </label>
                      {watch('solicitaART') && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Label className="mb-0 whitespace-nowrap text-xs">Valor (R$):</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 w-24" {...register('valorART', { valueAsNumber: true })} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAB CONTENT: CONDIÇÕES */}
                <div className={activeTab === 'condicoes' ? 'block space-y-4' : 'hidden'}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sinal / Entrada (%)</Label>
                      <div className="relative">
                        <Input type="number" min="0" max="100" {...register('sinalPercentual', { required: true, valueAsNumber: true })} />
                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <Label>Prazo do Saldo (dias)</Label>
                      <Input type="text" placeholder="Ex: 30, 60 e 90" {...register('prazoSaldoDias', { required: true })} />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-slate-700">Resumo do Pagamento</h4>
                      <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-1 rounded">Total: {formatCurrency(totalGeral)}</span>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                      {/* Entrada */}
                      <div className="flex justify-between items-center p-3 bg-white rounded border border-slate-200">
                        <span className="font-medium text-slate-700">Entrada ({sinalPercentual || 0}%):</span>
                        <span className="font-bold text-slate-900">{formatCurrency(valorEntrada)}</span>
                      </div>
                      
                      {/* Saldo Restante */}
                      <div className="flex justify-between items-center px-3">
                        <span className="font-medium text-slate-700">Saldo Restante:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(saldoRestante)}</span>
                      </div>

                      {/* Parcelas Geradas */}
                      {parcelasFields.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {parcelasFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-4 p-2 bg-white rounded border border-slate-200">
                              <span className="w-24 text-slate-600 font-medium">{watch(`parcelas.${index}.dias`)} dias</span>
                              <div className="flex-1">
                                <div className="relative">
                                  <span className="absolute left-3 top-2 text-slate-500">R$</span>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    className="pl-8 h-9" 
                                    {...register(`parcelas.${index}.valor` as const, { valueAsNumber: true })} 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <div className={`flex justify-between items-center p-2 mt-2 rounded text-xs font-medium ${isParcelasValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            <span>Soma das parcelas: {formatCurrency(totalParcelas)}</span>
                            <span>{isParcelasValid ? '✓ Valores conferem' : '⚠ Valores não batem com o saldo'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAB CONTENT: CLÁUSULAS E TERMOS */}
                <div className={activeTab === 'clausulas' ? 'block space-y-6' : 'hidden'}>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <p className="text-sm text-slate-600">
                      Estes textos foram carregados das suas Configurações. Pode editá-los livremente apenas para esta proposta específica sem afetar o padrão da empresa.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Obrigações da Contratante</Label>
                      <Textarea 
                        {...register('textoObrigacoesContratante')} 
                        className="min-h-[120px]"
                        placeholder="Descreva as obrigações do cliente..."
                      />
                    </div>
                    
                    <div>
                      <Label>Obrigações da Contratada</Label>
                      <Textarea 
                        {...register('textoObrigacoesContratada')} 
                        className="min-h-[120px]"
                        placeholder="Descreva as suas obrigações..."
                      />
                    </div>

                    <div>
                      <Label>Condições de Risco Geotécnico</Label>
                      <Textarea 
                        {...register('textoCondicoesRisco')} 
                        className="min-h-[120px]"
                        placeholder="Descreva as condições de risco..."
                      />
                    </div>

                    <div>
                      <Label>Termo de Aceite</Label>
                      <Textarea 
                        {...register('textoTermoAceite')} 
                        className="min-h-[80px]"
                        placeholder="Texto de encerramento e aceite..."
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="mb-0">Cláusulas Adicionais (Específicas desta Proposta)</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs gap-1"
                        onClick={() => appendClausula({ titulo: '', texto: '' })}
                      >
                        <Plus size={14} /> Adicionar Cláusula
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {clausulasFields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-slate-50 border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-medium text-slate-700">Cláusula Extra {index + 1}</h4>
                            <button 
                              type="button" 
                              onClick={() => removeClausula(index)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Input 
                                placeholder="Título da Cláusula (ex: Condições de Acesso)" 
                                {...register(`clausulasExtras.${index}.titulo` as const, { required: true })} 
                              />
                            </div>
                            <div>
                              <Textarea 
                                placeholder="Texto da cláusula..." 
                                className="min-h-[80px]"
                                {...register(`clausulasExtras.${index}.texto` as const, { required: true })} 
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      {clausulasFields.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
                          Nenhuma cláusula extra adicionada.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer (Calculations & Submit) */}
            <div className="border-t border-slate-200 p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-auto">
                <div className="flex justify-between sm:justify-start sm:gap-8 text-sm mb-1">
                  <span className="text-slate-500">Subtotal Serviço:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(subtotalServico)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-8 text-base">
                  <span className="text-slate-700 font-medium">Valor Total:</span>
                  <span className="font-bold text-emerald-600 text-lg">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" form="proposal-form" className="w-full sm:w-auto gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} 
                  {isSaving ? 'Salvando...' : (editingProposalId ? 'Atualizar Proposta' : 'Salvar Proposta')}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL NOVO CLIENTE INLINE */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Novo Cliente</h2>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsNewClientModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            
            <ClientForm 
              onSubmit={handleCreateClient}
              onCancel={() => setIsNewClientModalOpen(false)}
              isSaving={isSavingClient}
            />
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[70]">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
