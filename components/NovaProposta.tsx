// src/components/NovaProposta.tsx
import React, { useState, useMemo } from 'react';
import {
  Save, Truck, FileText, CheckCircle, MapPin,
  Receipt, ShieldCheck, Users, CreditCard, QrCode,
  Landmark, Wallet, Search, PlusCircle, Trash2, Calendar, Banknote
} from 'lucide-react';
import { ClientSearch } from './ClientSearch';
import { AddressInput } from './AddressInput';
import { MoneyInput, DecimalInput } from './Inputs';
import jsPDF from "jspdf";
import { NewClientModal } from './NewClientModal';
import { Cliente, FormaPagamento } from '../types';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { DEFAULT_TEMPLATES } from './Templates';
import { usePhoenixData } from '../hooks/usePhoenixData';

const CATEGORIES = [
  { id: 'HELICE', name: 'Hélice Contínua', icon: '🌀' },
  { id: 'ESCAVADA', name: 'Escavada Mec.', icon: '🚜' },
  { id: 'SONDAGEM', name: 'Sondagem SPT', icon: '🔍' }
];

const DIAMETERS = [30, 40, 50, 60];

const PIX_KEY_DEFAULT = "57.486.102/0001-86";
const BANK_DETAILS_DEFAULT = "Banco: Itaú (341) | Ag: 1234 | CC: 99999-9 | Estemco Eng.";

export const NovaProposta = () => {
  const { addProject } = usePhoenixData();
  const [selectedCategory, setSelectedCategory] = useState('HELICE');
  const [itens, setItens] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // --- CRM DATA ---
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [obraAddress, setObraAddress] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [responsavelObra, setResponsavelObra] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');

  // UI State for "Search Mode"
  const [isSearchingClient, setIsSearchingClient] = useState(true);

  // --- FINANCIALS ---
  const [config, setConfig] = useState<any>({ taxRateNF: 10, taxValueART: 99.96 });
  const [customTaxRateNF, setCustomTaxRateNF] = useState(10);
  const [customTaxValueART, setCustomTaxValueART] = useState(99.96);

  // Payment 2.0 State
  const [paymentMethod, setPaymentMethod] = useState<FormaPagamento>('BOLETO');
  const [pixKey, setPixKey] = useState(PIX_KEY_DEFAULT);
  const [boletoDays, setBoletoDays] = useState('15/30/45');
  const [cardBrand, setCardBrand] = useState('Mastercard');
  const [cardInstallments, setCardInstallments] = useState(3);
  const [bankDetails, setBankDetails] = useState(BANK_DETAILS_DEFAULT);

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'metadata', 'config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(data);
          if (data.taxRateNF) setCustomTaxRateNF(data.taxRateNF);
          if (data.taxValueART) setCustomTaxValueART(data.taxValueART);
        }
      } catch (err) { console.error("Error loading config", err); }
    };
    fetchConfig();
  }, []);

  const [sinalPerc, setSinalPerc] = useState(30);
  const [includeNF, setIncludeNF] = useState(false);
  const [includeART, setIncludeART] = useState(true);

  const taxRateNF = customTaxRateNF;
  const taxValueART = customTaxValueART;

  // --- SAFEGUARDS ---
  const [minBilling, setMinBilling] = useState(5000);
  const [waterFee, setWaterFee] = useState(3000);
  const [hourRate, setHourRate] = useState(500);

  const [lastGeneratedFile, setLastGeneratedFile] = useState('');
  const [diametroInput, setDiametroInput] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prazoDias, setPrazoDias] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Asset Integration
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // --- AVAILABILITY CHECK (SEMAFORO) ---
  const { projects, events } = usePhoenixData();
  const [availability, setAvailability] = useState<{ status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE', message: string }>({ status: 'AVAILABLE', message: 'Disponível' });

  React.useEffect(() => {
    if (!startDate || !selectedAssetId) {
      setAvailability({ status: 'AVAILABLE', message: 'Selecione data e máquina' });
      return;
    }

    const start = new Date(startDate);

    // Check Maintenance
    const maintenanceConflict = events.find((e: any) => {
      if (e.resourceId !== selectedAssetId) return false;
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end);
      return start >= eStart && start <= eEnd;
    });

    if (maintenanceConflict) {
      setAvailability({ status: 'MAINTENANCE', message: `Manutenção: ${(maintenanceConflict as any).title}` });
      return;
    }

    // Check Active Projects
    const projectConflict = projects.find((p: any) => {
      // Need to check which machine is assigned to the project. 
      // Currently 'projects' doesn't explicitly link 'selectedAssetId' in a top-level field easily accessible here without digging into proposal details?
      // Wait, 'selectedAssetObj' is saved in project data. Let's assume we can match by some ID or we just warn about overlapping dates for now if we don't have machine linkage strictly defined in top-level.
      // Actually, let's check if we save asset ID in the project. We do: `selectedAssetObj`.
      if (p.status === 'Concluída' || p.status === 'Perdida') return false;
      if (p.selectedAssetObj?.id !== selectedAssetId) return false;

      const pStart = new Date(p.startDate);
      const pEnd = new Date(p.endDate);
      return start >= pStart && start <= pEnd;
    });

    if (projectConflict) {
      setAvailability({ status: 'BUSY', message: `Ocupada: ${projectConflict.name}` });
      return;
    }

    setAvailability({ status: 'AVAILABLE', message: 'Máquina Disponível' });

  }, [startDate, selectedAssetId, projects, events]);

  const handleClientSave = (client: Cliente) => {
    setSelectedClient(client);
    setBillingEmail(client.email || '');
    if (!obraAddress) setObraAddress(client.enderecoFaturamento);
    setInscricaoEstadual(client.inscricaoEstadual || '');
    setIsSearchingClient(false); // Switch to card view
  };

  const addService = (diam: string | number) => {
    const newService = {
      id: Math.random(),
      type: selectedCategory,
      name: `${diam}`,
      qty: 0,
      depth: 0,
      price: 0,
      diametro: diam.toString()
    };
    setItens([...itens, newService]);
  };

  // Calculations
  const serviceTotal = useMemo(() => itens.reduce((acc, i) => acc + (i.qty * i.depth * i.price), 0), [itens]);
  const taxNF = useMemo(() => includeNF ? serviceTotal * (taxRateNF / 100) : 0, [includeNF, serviceTotal, taxRateNF]);
  const taxART = useMemo(() => includeART ? taxValueART : 0, [includeART, taxValueART]);
  const grandTotal = useMemo(() => serviceTotal + taxNF + taxART, [serviceTotal, taxNF, taxART]);
  const sinalValue = useMemo(() => grandTotal * (sinalPerc / 100), [grandTotal, sinalPerc]);

  const handleGenerate = async () => {
    if (!startDate) return alert("Data de Início é obrigatória.");

    setIsGenerating(true);

    const formData = {
      client: selectedClient?.razaoSocial || 'Cliente',
      billingAddress: selectedClient?.enderecoFaturamento,
      siteAddress: obraAddress,
      inscricaoEstadual,
      responsavel: responsavelObra,
      email: billingEmail,

      hourRate,
      waterFee,
      minBilling,

      startDate,
      prazo: prazoDias,
      sinalPerc,
      sinalValue,

      paymentMethod,
      pixKey,
      boletoDays,
      cardBrand,
      cardInstallments,
      bankDetails,

      grandTotal,
      includeNF,
      includeART,
      serviceTotal,
      selectedClientObj: selectedClient,
      selectedAssetObj: assets.find(a => a.id === selectedAssetId)
    };

    await handleGenerateProposal(
      formData,
      itens,
      setShowModal,
      selectedCategory,
      setLastGeneratedFile,
      addProject
    );

    setIsGenerating(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-32 font-sans">

      {/* 1. HEADER (COCKPIT STYLE) */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-xl tracking-tight">Nova Proposta</h1>
            <p className="text-xs text-slate-400 font-medium">Cockpit de Vendas</p>
          </div>
        </div>

        {/* BIG PRICE TAG */}
        <div className="text-right flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Valor Total da Proposta</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter transition-all duration-300">
              R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !startDate || itens.length === 0 || !selectedClient}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white" /> : <FileText size={18} />}
            EMITIR PDF
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: INPUTS (Lead, Scope, Payment) */}
        <div className="lg:col-span-2 space-y-6">

          {/* A. CLIENT CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={18} className="text-blue-600" /> Cliente & Obra</h3>
              {!isSearchingClient && (
                <button onClick={() => setIsSearchingClient(true)} className="text-xs text-blue-600 hover:underline font-bold">Alterar Cliente</button>
              )}
            </div>

            <div className="p-6">
              {isSearchingClient ? (
                <div className="max-w-xl mx-auto text-center space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <div className="text-left w-full pl-0">
                      <ClientSearch onSelect={handleClientSave} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">ou</p>
                  <button onClick={() => setShowClientModal(true)} className="text-blue-600 font-bold hover:underline text-sm">+ Cadastrar Novo Cliente</button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Selected Client Info Card */}
                  <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-blue-900">{selectedClient?.razaoSocial}</h4>
                        <p className="text-sm text-blue-600 font-mono">{selectedClient?.documento}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Cliente</span>
                    </div>
                    <div className="space-y-1 mt-4">
                      <p className="text-xs text-slate-500 flex items-start gap-2"><MapPin size={12} className="mt-0.5" /> {selectedClient?.enderecoFaturamento}</p>
                      {selectedClient?.email && <p className="text-xs text-slate-500 flex items-center gap-2"><Users size={12} /> {selectedClient?.email}</p>}
                    </div>
                  </div>

                  {/* Project Info Inputs */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Local da Obra</label>
                      <AddressInput onChange={setObraAddress} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Responsável</label>
                        <input value={responsavelObra} onChange={e => setResponsavelObra(e.target.value)} className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Eng. da Obra" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Inscrição Est.</label>
                        <input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Isento" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* B. SCOPE BUILDER & RESOURCES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><Truck size={18} /> Recursos & Escopo</h3>

              {/* Availability Badge */}
              {selectedAssetId && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${availability.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    availability.status === 'MAINTENANCE' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${availability.status === 'AVAILABLE' ? 'bg-emerald-500' :
                      availability.status === 'MAINTENANCE' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                  {availability.message}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* MACHINE SELECTOR */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Equipamento Alocado</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {assets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`min-w-[120px] p-3 rounded-lg border text-left transition-all ${selectedAssetId === asset.id
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md transform -translate-y-1'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                    >
                      <div className="font-bold text-sm truncate">{asset.name}</div>
                      <div className="text-[10px] opacity-70">{asset.plate || 'S/ Placa'}</div>
                    </button>
                  ))}
                  {assets.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma máquina cadastrada.</p>}
                </div>
              </div>
              {/* Categorias (Tabs) */}
              <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>

              {/* QUICK ADDER */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Adicionar Item Rápido (Selecione o Diâmetro)</label>
                <div className="flex flex-wrap gap-3">
                  {DIAMETERS.map(d => (
                    <button
                      key={d}
                      onClick={() => addService(d)}
                      className="w-16 h-16 rounded-xl border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex flex-col items-center justify-center transition-all active:scale-95"
                    >
                      <span className="text-lg font-black text-slate-700">{d}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">cm</span>
                    </button>
                  ))}

                  {/* Custom Input */}
                  <div className="w-24 h-16 relative">
                    <input
                      type="number"
                      placeholder="..."
                      className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 text-center font-bold text-slate-600 focus:border-blue-500 focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addService(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <span className="absolute bottom-1 w-full text-center text-[8px] text-slate-400 uppercase pointer-events-none">Outro e Enter</span>
                  </div>
                </div>
              </div>

              {/* ITEMS LIST (EDITABLE) */}
              {itens.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-dashed">
                  {itens.map((item, idx) => (
                    <div key={item.id} className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 group hover:border-blue-200 transition-colors">
                      <div className="w-40 shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">{item.type}</span>
                        <span className="font-bold text-slate-800">Estaca Ø {item.diametro}cm</span>
                      </div>

                      <div className="flex gap-4 flex-1">
                        <div className="w-24">
                          <DecimalInput label="Qtd" value={item.qty} onChange={(v) => { const n = [...itens]; n[idx].qty = v; setItens(n); }} />
                        </div>
                        <div className="w-24">
                          <DecimalInput label="Prof. (m)" value={item.depth} onChange={(v) => { const n = [...itens]; n[idx].depth = v; setItens(n); }} />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <MoneyInput label="R$/m" value={item.price} onChange={(v) => { const n = [...itens]; n[idx].price = v; setItens(n); }} />
                        </div>
                      </div>

                      <div className="text-right w-32 shrink-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Item</p>
                        <p className="font-bold text-emerald-600">R$ {(item.qty * item.depth * item.price).toLocaleString('pt-BR')}</p>
                      </div>

                      <button onClick={() => setItens(itens.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* C. PAYMENT & CONDITIONS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><Receipt size={18} /> Pagamento & Condições</h3>
            </div>

            <div className="p-6 space-y-8">

              {/* PAYMENT METHOD TABS */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Forma de Pagamento</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['BOLETO', 'PIX', 'TED', 'CARTAO_CREDITO', 'DINHEIRO'] as FormaPagamento[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${paymentMethod === m
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {m === 'BOLETO' && <FileText size={16} />}
                      {m === 'PIX' && <QrCode size={16} />}
                      {m === 'TED' && <Landmark size={16} />}
                      {m === 'CARTAO_CREDITO' && <CreditCard size={16} />}
                      {m === 'DINHEIRO' && <Banknote size={16} />}
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Dynamic Payment Fields */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  {paymentMethod === 'PIX' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Chave PIX (Para exibir no contrato)</label>
                      <div className="flex gap-2">
                        <div className="bg-white p-2 border rounded text-lg font-mono text-slate-700 w-full">{pixKey}</div>
                        <button onClick={() => setPixKey(PIX_KEY_DEFAULT)} className="text-xs text-blue-600 font-bold hover:underline whitespace-nowrap">Restaurar Padrão</button>
                      </div>
                    </div>
                  )}
                  {paymentMethod === 'BOLETO' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Vencimentos (Dias após medição)</label>
                      <input value={boletoDays} onChange={e => setBoletoDays(e.target.value)} className="w-full p-2 border rounded font-bold text-slate-700" placeholder="Ex: 15/30/45" />
                    </div>
                  )}
                  {paymentMethod === 'TED' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Dados Bancários Completos</label>
                      <textarea value={bankDetails} onChange={e => setBankDetails(e.target.value)} className="w-full p-2 border rounded font-bold text-slate-700 h-20 text-sm" />
                    </div>
                  )}
                  {paymentMethod === 'CARTAO_CREDITO' && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Bandeira</label>
                        <input value={cardBrand} onChange={e => setCardBrand(e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      <div className="w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Parcelas</label>
                        <input type="number" value={cardInstallments} onChange={e => setCardInstallments(Number(e.target.value))} className="w-full p-2 border rounded" />
                      </div>
                    </div>
                  )}
                  {paymentMethod === 'DINHEIRO' && (
                    <div className="p-2 text-center text-slate-500 italic text-sm">
                      Pagamento em espécie diretamente no escritório ou local da obra.
                    </div>
                  )}
                </div>
              </div>

              {/* SINAL / ENTRADA */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-dashed">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sinal / Entrada (%)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-24">
                      <input
                        type="number"
                        value={sinalPerc}
                        onChange={e => setSinalPerc(Number(e.target.value))}
                        className="w-full p-2 pl-3 border rounded-lg font-bold text-center text-lg focus:ring-2 ring-blue-500 outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-bold text-sm border border-emerald-100">
                      R$ {sinalValue.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Previsão Início</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full p-2 pl-10 border rounded-lg font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* SAFEGUARDS */}
              <div className="pt-4 border-t border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Parâmetros de Contrato (Blindagem)</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Fat. Mínimo</label>
                    <MoneyInput value={minBilling} onChange={setMinBilling} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Taxa Água/Rocha</label>
                    <MoneyInput value={waterFee} onChange={setWaterFee} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Hora Parada</label>
                    <MoneyInput value={hourRate} onChange={setHourRate} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY SUMMARY (RECEIPT STYLE) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 text-center">
                <h3 className="font-bold tracking-wide uppercase text-sm">Resumo da Proposta</h3>
                <p className="text-[10px] text-slate-400">Prévia Financeira</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Items List Mini */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {itens.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm italic">
                      Nenhum item adicionado.
                    </div>
                  ) : (
                    itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs border-b border-dashed border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-700">{item.qty}x</span> Estaca Ø{item.diametro}
                          <div className="text-[10px] text-slate-400">{item.depth}m prof.</div>
                        </div>
                        <span className="font-medium text-slate-600">
                          {(item.qty * item.depth * item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotals */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-700">R$ {serviceTotal.toLocaleString('pt-BR')}</span>
                  </div>

                  <div className="flex justify-between text-sm items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-blue-600 transition-colors">
                      <input type="checkbox" checked={includeNF} onChange={e => setIncludeNF(e.target.checked)} className="rounded border-slate-300" />
                      <span>Nota Fiscal</span>
                      {includeNF && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={customTaxRateNF}
                            onChange={e => setCustomTaxRateNF(Number(e.target.value))}
                            className="w-12 p-1 border rounded text-xs text-center font-bold"
                          />
                          <span className="text-xs">%</span>
                        </div>
                      )}
                      {!includeNF && <span className="text-xs text-slate-400">({customTaxRateNF}%)</span>}
                    </label>
                    <span className="font-medium text-slate-400">+ {taxNF.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>

                  <div className="flex justify-between text-sm items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-blue-600 transition-colors">
                      <input type="checkbox" checked={includeART} onChange={e => setIncludeART(e.target.checked)} className="rounded border-slate-300" />
                      <span>Taxa ART</span>
                      {includeART && (
                        <input
                          type="number"
                          value={customTaxValueART}
                          onChange={e => setCustomTaxValueART(Number(e.target.value))}
                          className="w-16 p-1 border rounded text-xs text-center font-bold"
                        />
                      )}
                    </label>
                    <span className="font-medium text-slate-400">+ {taxART.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                {/* Total Big */}
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Total Final</span>
                  <span className="text-3xl font-black text-emerald-700 block tracking-tighter">
                    R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Footer Info */}
                <div className="text-[10px] text-slate-400 text-center space-y-1">
                  <p>{paymentMethod === 'PIX' ? 'Pagamento via PIX' : paymentMethod === 'BOLETO' ? 'Pagamento via Boleto' : 'Pagamento a Combinar'}</p>
                  <p>Validade: 15 dias</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !startDate || itens.length === 0 || !selectedClient}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
            >
              <span className="flex items-center gap-2 text-lg">
                {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white" /> : <Save size={20} />}
                GERAR PROPOSTA
              </span>
              <span className="text-[10px] font-normal opacity-70">Salva no ERP & Baixa PDF</span>
            </button>

          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in fill-mode-forwards duration-300 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl transform scale-100 animate-in zoom-in-95 duration-300">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Sucesso!</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              A proposta para <strong>{selectedClient?.razaoSocial}</strong> foi gerada e salva com sucesso.
            </p>
            <div className="space-y-3">
              <button onClick={() => setShowModal(false)} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                Voltar para Propostas
              </button>
            </div>
          </div>
        </div>
      )}

      {showClientModal && <NewClientModal onClose={() => setShowClientModal(false)} onSave={handleClientSave} />}
    </div>
  );
};

// --- PDF ENGINE ---
const handleGenerateProposal = async (formData: any, itens: any[], setShowModal: Function, selectedCategory: string, setLastGeneratedFile: Function, addProject: any) => {

  const docPdf = new jsPDF();
  docPdf.setFont("helvetica", "normal");

  // Helpers
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const margin = 20;
  const pageWidth = docPdf.internal.pageSize.width;
  let cursorY = 20;

  const addLine = (text: string, fontSize = 10, fontStyle = 'normal', align: 'left' | 'center' | 'right' = 'left') => {
    docPdf.setFont("helvetica", fontStyle);
    docPdf.setFontSize(fontSize);

    const lines = docPdf.splitTextToSize(text, pageWidth - (margin * 2));

    lines.forEach((line: string) => {
      if (cursorY > 280) { docPdf.addPage(); cursorY = 20; }
      docPdf.text(line, align === 'center' ? pageWidth / 2 : (align === 'right' ? pageWidth - margin : margin), cursorY, { align });
      cursorY += (fontSize / 2) + 2;
    });
  };

  const addSpace = (h = 5) => cursorY += h;

  // 1. HEADER (Word Mirror)
  // LOGO PLACEHOLDER
  // docPdf.addImage(logo, 'PNG', margin, 10, 30, 15); // If logo available

  addLine("ESTEMCO ENGENHARIA E CONSTRUCOES LTDA", 12, 'bold', 'center');
  addLine("Rua Exemplo, 123 - São Paulo/SP - CNPJ: 57.486.102/0001-86", 8, 'normal', 'center');
  addLine(`PROPOSTA COMERCIAL: ORC-${Date.now().toString().slice(-6)}`, 10, 'bold', 'right');
  addLine(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 10, 'normal', 'right');

  addSpace(10);

  // CLIENT BOX
  docPdf.setDrawColor(200);
  docPdf.rect(margin, cursorY, pageWidth - (margin * 2), 35);
  cursorY += 5;
  addLine(`CLIENTE: ${formData.client.toUpperCase()}`, 10, 'bold');
  if (formData.selectedClientObj?.documento) addLine(`CNPJ/CPF: ${formData.selectedClientObj.documento}`);
  addLine(`OBRA: ${formData.siteAddress || 'Endereço não informado'}`);
  addLine(`A/C: ${formData.responsavel || 'Depto de Engenharia'}`);
  cursorY = Math.max(cursorY, margin + 45); // Ensure cursor moves past box
  addSpace(10);

  // 2. SCOPE (Dynamic Sentences)
  addLine("1. OBJETO DA PROPOSTA", 11, 'bold');
  addLine("Execução de serviços de engenharia de fundações, conforme escopo abaixo:");
  addSpace(3);

  // Logic: Group by description to mimic the Word doc style
  itens.forEach(item => {
    const txt = `• Estacas Escavadas/Hélice com diâmetro Ø ${item.diametro}cm. Quantidade prevista: ${item.qty} estacas de ${item.depth}m de profundidade. Totalizando ${item.qty * item.depth} metros lineares.`;
    addLine(txt);
  });
  addSpace(5);

  // 3. PRICING
  addLine("2. PREÇOS E SERVIÇOS", 11, 'bold');

  // Table Header
  let startParamsY = cursorY;
  docPdf.setFillColor(240, 240, 240);
  docPdf.rect(margin, cursorY, pageWidth - (margin * 2), 8, 'F');
  docPdf.setFont('helvetica', 'bold');
  docPdf.text("DESCRIÇÃO", margin + 2, cursorY + 5);
  docPdf.text("QTD", margin + 90, cursorY + 5);
  docPdf.text("UNIT.", margin + 110, cursorY + 5);
  docPdf.text("TOTAL", margin + 140, cursorY + 5);
  cursorY += 10;

  // Items
  itens.forEach(item => {
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Estaca Ø ${item.diametro}cm`, margin + 2, cursorY);
    docPdf.text(`${item.qty * item.depth} m`, margin + 90, cursorY);
    docPdf.text(fmt(Number(item.price)), margin + 110, cursorY);
    docPdf.text(fmt(Number(item.qty * item.depth * item.price)), margin + 140, cursorY);
    cursorY += 6;
  });

  // Mobilization (Mock logic: if separate, usually it's a fixed fee. Here using basic safeguards or empty for now as not in items array, but usually distinct)
  // addLine("Mobilização de Equipamentos: R$ X.XXX,XX (Incluso)"); // Example

  docPdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  if (formData.includeNF) addLine(`Impostos (NF): ${fmt(Number(formData.serviceTotal * 0.10))}`, 9, 'italic', 'right');
  if (formData.includeART) addLine(`Taxa ART: R$ 99,96`, 9, 'italic', 'right');

  addSpace(2);
  addLine(`TOTAL GERAL ESTIMADO: ${fmt(Number(formData.grandTotal))}`, 12, 'bold', 'right');
  addSpace(10);

  // 4. PAYMENT CONDITIONS (Dynamic)
  addLine("3. CONDIÇÕES DE PAGAMENTO", 11, 'bold');

  // Signal
  const sinalTxt = `Sinal de ${fmt(Number(formData.sinalValue))} (${formData.sinalPerc}%) a ser pago no aceite desta proposta.`;
  addLine(`• ${sinalTxt}`);

  // Balance
  let balanceTxt = "";
  const saldo = formData.grandTotal - formData.sinalValue;

  switch (formData.paymentMethod) {
    case 'PIX':
      balanceTxt = `Saldo de ${fmt(Number(saldo))} via PIX. Chave: ${formData.pixKey}.`;
      break;
    case 'BOLETO':
      balanceTxt = `Saldo de ${fmt(Number(saldo))} via Boleto Bancário. Vencimentos: ${formData.boletoDays} dias após medição.`;
      break;
    case 'TED':
      balanceTxt = `Saldo de ${fmt(Number(saldo))} via Transferência Bancária. Dados: ${formData.bankDetails}.`;
      break;
    case 'CARTAO_CREDITO':
      balanceTxt = `Saldo de ${fmt(Number(saldo))} no Cartão de Crédito (${formData.cardBrand}) em ${formData.cardInstallments}x.`;
      break;
    case 'DINHEIRO':
      balanceTxt = `Saldo de ${fmt(Number(saldo))} em Dinheiro (Espécie), a ser pago diretamente na data combinada.`;
      break;
    default:
      balanceTxt = `Saldo de ${fmt(Number(saldo))} a combinar.`;
  }
  addLine(`• ${balanceTxt}`);
  addSpace(8);

  // 5. SAFEGUARDS (Clause Injection)
  addLine("4. CONDIÇÕES GERAIS E SALVAGUARDAS", 11, 'bold');
  const clauses = [
    `Faturamento Mínimo: Caso a medição não atinja ${fmt(Number(formData.minBilling))}, será cobrado este valor mínimo por mobilização.`,
    `Água/Rocha: Ocorrências geológicas de água ou rocha implicam em taxa adicional de ${fmt(Number(formData.waterFee))} por dia ou evento.`,
    `Improdutividade: Horas paradas por responsabilidade do CONTRATANTE serão cobradas a ${fmt(Number(formData.hourRate))}/hora.`,
    `Concreto e Ferragem são de responsabilidade integral do CONTRATANTE, salvo estipulado em contrário.`,
    `O fornecimento de água e energia elétrica para a execução dos serviços corre por conta do CONTRATANTE.`
  ];

  clauses.forEach((c, i) => addLine(`4.${i+1} ${c}`, 9));

  // --- LAST PAGE: ACCEPTANCE ---
  docPdf.addPage();
  cursorY = 40;

  addLine("TERMO DE ACEITE", 14, 'bold', 'center');
  addSpace(10);
  addLine("Autorizo a execução dos serviços conforme as condições técnicas e comerciais descritas nesta proposta.", 10, 'normal', 'center');

  addSpace(30);

  // SIGNATURE LINES
  docPdf.setLineWidth(0.5);
  docPdf.line(margin + 20, cursorY, pageWidth - margin - 20, cursorY); // Line
  addSpace(5);
  addLine(formData.client.toUpperCase(), 10, 'bold', 'center');
  addLine(`CNPJ/CPF: ${formData.selectedClientObj?.documento || '_______________________'}`, 10, 'normal', 'center');

  addSpace(20);

  // FORM FIELDS MIRROR
  const fieldY = cursorY;
  const boxHeight = 8;

  const drawField = (label: string, value: string) => {
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(label, margin, cursorY);
    cursorY += 5;
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(value || "______________________________________________________", margin, cursorY);
    cursorY += 10;
  };

  drawField("Razão Social / Nome Completo:", formData.client);
  drawField("Endereço de Faturamento:", formData.billingAddress);
  drawField("Inscrição Estadual:", formData.inscricaoEstadual);
  drawField("Responsável Técnico / Financeiro:", formData.responsavel);

  // SAVE
  const fileName = `Proposta_${formData.client.trim()}.pdf`;
  docPdf.save(fileName);
  setLastGeneratedFile(fileName);

  // PERSISTENCE (ERP)
  try {
    let installmentList = [];
    if (formData.paymentMethod === 'BOLETO' && formData.boletoDays) {
      const days = formData.boletoDays.split('/').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
      const saldo = formData.grandTotal - formData.sinalValue;
      const parcelaValue = saldo / days.length;

      installmentList = days.map((day, idx) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + day);
        return {
          number: idx + 1,
          value: parcelaValue,
          date: dueDate.toISOString()
        };
      });
    }

    const newProject = {
      name: `Obra ${formData.client.split(' ')[0]} - ${selectedCategory}`,
      clientName: formData.client,
      clientId: formData.selectedClientObj?.id || 'GUEST',
      status: 'PROPOSTA',
      stage: 'PROPOSTA',
      createdAt: new Date().toISOString(),
      totalBudget: formData.grandTotal,
      sinalValue: formData.sinalValue,
      paymentMethod: formData.paymentMethod,
      paymentDetails: {
        pixKey: formData.paymentMethod === 'PIX' ? formData.pixKey : null,
        boletoDays: formData.paymentMethod === 'BOLETO' ? formData.boletoDays : null,
        bankDetails: formData.paymentMethod === 'TED' ? formData.bankDetails : null,
        cardInstallments: formData.paymentMethod === 'CARTAO_CREDITO' ? formData.cardInstallments : null
      },
      installmentList,
      siteAddress: formData.siteAddress,
      startDate: formData.startDate,
      prazoDias: formData.prazo,
      itens: itens
    };
    await addProject.mutateAsync(newProject);
    setShowModal(true);
  } catch (e) {
    console.error("Save error", e);
    alert("Erro ao salvar no ERP, mas PDF gerado.");
  }
};