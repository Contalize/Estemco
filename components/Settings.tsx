import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Building2, Settings as SettingsIcon, Save, Loader2, CheckCircle2, FileText, Drill, Plus, Trash2, X } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Label, Input, Button, Skeleton, Textarea, Select } from './ui';
import { useAuth } from '../contexts/AuthContext';

type Equipment = {
  id: string;
  nome: string;
  diametros: string;
  custoHora: number;
  status: 'Ativo' | 'Inativo';
};

type CompanySettings = {
  // Dados da Empresa
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  
  // Predefinições Comerciais
  taxaAguaPadrao: number;
  taxaHoraParadaPadrao: number;
  validadePropostaDias: number;
  impostoPadraoNF: number;
  valorPadraoART: number;

  // Equipamentos
  equipamentos: Equipment[];

  // Textos da Proposta
  textoObrigacoesContratante: string;
  textoObrigacoesContratada: string;
  textoRiscoGeotecnico: string;
  textoTermoAceite: string;
};

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dados' | 'equipamentos' | 'textos'>('dados');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const { user, profile } = useAuth();

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<CompanySettings>({
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      taxaAguaPadrao: 0,
      taxaHoraParadaPadrao: 0,
      validadePropostaDias: 15,
      impostoPadraoNF: 10,
      valorPadraoART: 103.51,
      equipamentos: [],
      textoObrigacoesContratante: '1. Fornecer água e energia elétrica no local da obra.\n2. Garantir acesso livre e desimpedido aos equipamentos.',
      textoObrigacoesContratada: '1. Executar os serviços de acordo com as normas técnicas vigentes (NBR 6122).\n2. Fornecer mão de obra qualificada e equipamentos em bom estado.',
      textoRiscoGeotecnico: 'Em caso de encontrar matacões, rochas ou interferências não previstas na sondagem, as horas paradas e custos de perfuração especial serão repassados à Contratante.',
      textoTermoAceite: 'De acordo com os termos e condições descritos nesta proposta comercial.'
    }
  });

  const { fields: equipamentos, append: appendEquipamento, remove: removeEquipamento } = useFieldArray({
    control,
    name: "equipamentos"
  });

  const { register: registerEq, handleSubmit: handleSubmitEq, reset: resetEq } = useForm<Equipment>();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user || !profile?.tenantId) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'empresas', profile.tenantId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          reset(docSnap.data() as CompanySettings);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [reset, user, profile?.tenantId]);

  const handleSearchCnpj = async () => {
    const cnpjValue = watch('cnpj');
    if (!cnpjValue) return;
    
    const cleanCnpj = cnpjValue.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setIsSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      
      const data = await response.json();
      
      setValue('razaoSocial', data.razao_social || '');
      setValue('nomeFantasia', data.nome_fantasia || data.razao_social || '');
      setValue('telefone', data.ddd_telefone_1 || '');
      setValue('email', data.email || '');
      
      const enderecoCompleto = `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}, ${data.cep}`;
      setValue('endereco', enderecoCompleto);
      
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      alert('Erro ao buscar CNPJ. Verifique o número e tente novamente.');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const onSubmit = async (data: CompanySettings) => {
    if (!user || !profile?.tenantId) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'empresas', profile.tenantId);
      // Using setDoc with merge: true to update or create if it doesn't exist
      await setDoc(docRef, data, { merge: true });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const onAddEquipment = (data: Equipment) => {
    appendEquipamento({
      ...data,
      id: Math.random().toString(36).substr(2, 9)
    });
    setIsEquipmentModalOpen(false);
    resetEq();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações da Empresa</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie os dados e predefinições do seu negócio.</p>
      </div>

      <Card className="overflow-hidden">
        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === 'dados' 
                ? 'border-slate-900 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2"><Building2 size={16}/> Dados da Empresa</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipamentos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === 'equipamentos' 
                ? 'border-slate-900 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2"><Drill size={16}/> Equipamentos e Custos</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('textos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === 'textos' 
                ? 'border-slate-900 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2"><FileText size={16}/> Textos da Proposta</div>
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /></div>
              </div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
            </div>
          ) : (
            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* TAB: DADOS DA EMPRESA */}
              <div className={activeTab === 'dados' ? 'block space-y-6' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Razão Social</Label>
                    <Input placeholder="Sua Empresa LTDA" {...register('razaoSocial', { required: true })} />
                    {errors.razaoSocial && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <Label>Nome Fantasia</Label>
                    <Input placeholder="Sua Empresa" {...register('nomeFantasia', { required: true })} />
                    {errors.nomeFantasia && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <Label>NIF / CNPJ</Label>
                    <div className="relative">
                      <Input placeholder="00.000.000/0001-00" {...register('cnpj', { required: true })} onBlur={handleSearchCnpj} />
                      {isSearchingCnpj && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="animate-spin text-slate-400" size={16} />
                        </div>
                      )}
                    </div>
                    {errors.cnpj && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <Label>Email de Contacto</Label>
                    <Input type="email" placeholder="contato@empresa.com" {...register('email', { required: true })} />
                    {errors.email && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input placeholder="(00) 0000-0000" {...register('telefone')} />
                  </div>
                </div>
                <div>
                  <Label>Endereço Completo</Label>
                  <Input placeholder="Rua, Número, Bairro, Cidade - Estado" {...register('endereco')} />
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Predefinições Comerciais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label>Imposto Padrão de NF (%)</Label>
                      <Input type="number" step="0.01" min="0" {...register('impostoPadraoNF', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Valor Padrão da ART (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('valorPadraoART', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Validade Padrão Propostas (Dias)</Label>
                      <Input type="number" min="1" {...register('validadePropostaDias', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Taxa de Água Padrão (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('taxaAguaPadrao', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label>Taxa de Hora Parada (R$)</Label>
                      <Input type="number" step="0.01" min="0" {...register('taxaHoraParadaPadrao', { valueAsNumber: true })} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Estes valores serão carregados automaticamente ao criar uma nova proposta.
                  </p>
                </div>
              </div>

              {/* TAB: EQUIPAMENTOS E CUSTOS */}
              <div className={activeTab === 'equipamentos' ? 'block space-y-6' : 'hidden'}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">Equipamentos Cadastrados</h3>
                    <p className="text-sm text-slate-500">Gerencie a frota e os custos operacionais para cálculo do DRE.</p>
                  </div>
                  <Button type="button" onClick={() => setIsEquipmentModalOpen(true)} className="gap-2">
                    <Plus size={16} /> Adicionar Equipamento
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Equipamento</th>
                        <th className="px-4 py-3 font-medium">Diâmetros Suportados</th>
                        <th className="px-4 py-3 font-medium">Custo Médio/Hora</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {equipamentos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            Nenhum equipamento cadastrado.
                          </td>
                        </tr>
                      ) : (
                        equipamentos.map((eq, index) => (
                          <tr key={eq.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{eq.nome}</td>
                            <td className="px-4 py-3 text-slate-600">{eq.diametros}</td>
                            <td className="px-4 py-3 text-slate-600">R$ {eq.custoHora?.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${eq.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                {eq.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => removeEquipamento(index)} className="text-red-500 hover:text-red-700 p-1">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TAB: TEXTOS DA PROPOSTA */}
              <div className={activeTab === 'textos' ? 'block space-y-6' : 'hidden'}>
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Personalização Jurídica</h3>
                  <p className="text-sm text-slate-500 mb-4">Defina os textos padrão que serão impressos no PDF das propostas.</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <Label>Obrigações da Contratante</Label>
                    <Textarea 
                      className="min-h-[120px]" 
                      placeholder="1. Fornecer água e energia elétrica...&#10;2. Garantir acesso livre..."
                      {...register('textoObrigacoesContratante')} 
                    />
                  </div>
                  <div>
                    <Label>Obrigações da Contratada</Label>
                    <Textarea 
                      className="min-h-[120px]" 
                      placeholder="1. Executar os serviços de acordo com as normas (NBR 6122)..."
                      {...register('textoObrigacoesContratada')} 
                    />
                  </div>
                  <div>
                    <Label>Condições de Risco Geotécnico</Label>
                    <Textarea 
                      className="min-h-[100px]" 
                      placeholder="Em caso de encontrar matacões, rochas ou interferências não previstas..."
                      {...register('textoRiscoGeotecnico')} 
                    />
                  </div>
                  <div>
                    <Label>Termo de Aceite</Label>
                    <Textarea 
                      className="min-h-[80px]" 
                      placeholder="De acordo com os termos e condições descritos nesta proposta comercial."
                      {...register('textoTermoAceite')} 
                    />
                  </div>
                </div>
              </div>

            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
          <Button type="submit" form="settings-form" disabled={isLoading || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Configurações'}
          </Button>
        </div>
      </Card>

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-sm font-medium">Configurações guardadas com sucesso!</span>
        </div>
      )}

      {/* EQUIPMENT MODAL */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Novo Equipamento</h2>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsEquipmentModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="p-6">
              <form id="equipment-form" onSubmit={handleSubmitEq(onAddEquipment)} className="space-y-4">
                <div>
                  <Label>Nome / Tipo</Label>
                  <Input placeholder="Ex: Perfuratriz Hélice Contínua" {...registerEq('nome', { required: true })} />
                </div>
                <div>
                  <Label>Diâmetros Suportados</Label>
                  <Input placeholder="Ex: 30, 40, 50" {...registerEq('diametros', { required: true })} />
                </div>
                <div>
                  <Label>Custo Médio por Hora (R$)</Label>
                  <Input type="number" step="0.01" min="0" {...registerEq('custoHora', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select {...registerEq('status', { required: true })}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </Select>
                </div>
              </form>
            </div>
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setIsEquipmentModalOpen(false)}>Cancelar</Button>
              <Button type="submit" form="equipment-form">Adicionar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
