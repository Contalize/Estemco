import React, { useState, useEffect } from 'react';
import { GlobalConfig, EmployeeCost, ConfigHCM, ConfigESC, ConfigSPT, DiametroPreco, ParcelaConfig } from '../types';
import { Save, Plus, Trash2, Fuel, Users, HardHat, Settings2, Drill, FileText, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface CostConfigProps {
  config: GlobalConfig;
  onUpdate: (newConfig: GlobalConfig) => void;
}

const DEFAULT_HCM: ConfigHCM = {
  diametros: [
    { mm: 300, preco: 40 },
    { mm: 400, preco: 46 },
    { mm: 500, preco: 60 }
  ],
  faturamentoMinimoDiario: 8000,
  mobilizacaoPadrao: 4000,
  comprimentoMinimo: 5,
  acrescimoFimDeSemana: 30,
  horarioPadraoInicio: '07:00',
  horarioPadraoFim: '17:00',
  condicoesPagamento: [
    { nome: 'Sinal', percentual: 50, prazo: '3 dias após assinatura' },
    { nome: 'Saldo', percentual: 50, prazo: '7 dias após medição' }
  ],
  multaDesistencia: 8000,
  multaAtrasoContratante: 8000,
  multaInadimplencia: 5,
  jurosMensais: 1,
  multaDescumprimento: 2,
  indiceCorrecao: 'IGP-M/FGV',
  causasFaturamentoMinimo: [
    "Ineficiência no fornecimento de concreto",
    "Quebra de bomba de concreto / entupimento de mangotes",
    "Atraso por falta de locação correta",
    "Horários restritos em condomínios/fábricas",
    "Dificuldades de perfuração (entulho, matacões)",
    "Estacas em blocos (NBR 6122:2019 Anexo N.7)",
    "Falta de retroescavadeira para retirada de solo"
  ],
  causasIsencaoMinimo: [
    "Condições climáticas (decisão exclusiva da CONTRATADA)",
    "Quebra do equipamento de perfuração HCM"
  ]
};

const DEFAULT_ESC: ConfigESC = {
  diametros: [
    { mm: 250, preco: 12.50 },
    { mm: 300, preco: 15.00 },
    { mm: 400, preco: 20.00 }
  ],
  faturamentoMinimoObra: 3000,
  taxaHoraParada: 500,
  mobilizacaoPadrao: 500,
  acrescimoFimDeSemana: 30,
  condicoesPagamento: [
    { nome: 'Sinal', percentual: 50, prazo: 'na assinatura' },
    { nome: 'Saldo', percentual: 50, prazo: '3 dias após relatório' }
  ],
  contratoSaidaDiariaPadrao: {
    metrosContratadosPorDia: 70,
    precoExcedentePorMetro: 15
  }
};

const DEFAULT_SPT: ConfigSPT = {
  precoPorMetro: 75,
  mobilizacaoLaboratorio: 600,
  artPadrao: 108.39,
  metragemMinimaTotal: 40,
  metrosPorFuroEstimado: 13.33,
  prazoEntregaRelatorio: "5 dias úteis",
  aplicarFaturamentoMinimoAcima2Furos: true,
  sinalAgendamento: 1500,
  maximoParcelasCartao: 4
};

export const CostConfig: React.FC<CostConfigProps> = ({ config, onUpdate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'geral' | 'hcm' | 'esc' | 'spt'>('geral');
  const [loading, setLoading] = useState(true);

  // GERAL State
  const [dieselPrice, setDieselPrice] = useState(config.dieselPrice);
  const [employees, setEmployees] = useState<EmployeeCost[]>(config.employees);
  const [newRole, setNewRole] = useState('');
  const [newCost, setNewCost] = useState('');

  // HCM State
  const [hcm, setHcm] = useState<ConfigHCM>(DEFAULT_HCM);

  // ESC State
  const [esc, setEsc] = useState<ConfigESC>(DEFAULT_ESC);

  // SPT State
  const [spt, setSpt] = useState<ConfigSPT>(DEFAULT_SPT);

  useEffect(() => {
    const fetchConfigs = async () => {
      if (!profile?.tenantId) return;

      try {
        const empRef = doc(db, 'empresas', profile.tenantId);

        // Load Geral (From DB or Fallback to Props)
        const geralSnap = await getDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'GERAIS'));
        if (geralSnap.exists()) {
          const g = geralSnap.data();
          setDieselPrice(g.dieselPrice ?? config.dieselPrice);
          setEmployees(g.employees ?? config.employees);
        }

        // Load HCM
        const hcmSnap = await getDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'HCM'));
        if (hcmSnap.exists()) setHcm(hcmSnap.data() as ConfigHCM);

        // Load ESC
        const escSnap = await getDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'ESC'));
        if (escSnap.exists()) setEsc(escSnap.data() as ConfigESC);

        // Load SPT
        const sptSnap = await getDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'SPT'));
        if (sptSnap.exists()) setSpt(sptSnap.data() as ConfigSPT);

      } catch (err) {
        console.error("Erro ao puxar configs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [profile?.tenantId, config]);

  const handleSaveGeral = async () => {
    onUpdate({ dieselPrice, employees });
    if (profile?.tenantId) {
      await setDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'GERAIS'), {
        dieselPrice, employees
      });
    }
    alert('Custos gerais atualizados!');
  };

  const handleSaveHCM = async () => {
    if (profile?.tenantId) {
      await setDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'HCM'), hcm);
      alert('Configurações HCM atualizadas na nuvem!');
    }
  };

  const handleSaveESC = async () => {
    if (profile?.tenantId) {
      await setDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'ESC'), esc);
      alert('Configurações ESC atualizadas na nuvem!');
    }
  };

  const handleSaveSPT = async () => {
    if (profile?.tenantId) {
      await setDoc(doc(db, `empresas/${profile.tenantId}/configuracoes`, 'SPT'), spt);
      alert('Configurações SPT atualizadas na nuvem!');
    }
  };

  const addEmployee = () => {
    if (newRole && newCost) {
      setEmployees([...employees, { id: Date.now().toString(), role: newRole, dailyCost: parseFloat(newCost) }]);
      setNewRole(''); setNewCost('');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Parâmetros do Sistema</h2>
        <p className="text-slate-500 mt-2">Personalize os padrões de faturamento e operação de cada máquina e equipe.</p>
      </header>

      {/* TABS */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
            ${activeTab === 'geral' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Settings2 size={18} /> Equipe e Combustível
        </button>
        <button
          onClick={() => setActiveTab('hcm')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
            ${activeTab === 'hcm' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Drill size={18} /> Parâmetros HCM
        </button>
        <button
          onClick={() => setActiveTab('esc')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
            ${activeTab === 'esc' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <HardHat size={18} /> Parâmetros ESC
        </button>
        <button
          onClick={() => setActiveTab('spt')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
            ${activeTab === 'spt' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Activity size={18} /> Parâmetros SPT
        </button>
      </div>

      <div className="mt-6">
        {/* TELA GERAL (EXISTENTE REFATORADA) */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-amber-100 rounded-lg text-amber-600 shadow-sm"><Fuel size={28} /></div>
                  <div><h3 className="font-bold text-lg text-slate-800">Diesel S-10</h3><p className="text-sm text-slate-500">Insumo Variável Crítico</p></div>
                </div>
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Preço Médio do Litro (R$)</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-500 sm:text-sm font-bold">R$</span>
                    </div>
                    <input
                      type="number" step="0.01" value={dieselPrice} onChange={(e) => setDieselPrice(parseFloat(e.target.value))}
                      className="block w-full rounded-md border-slate-300 pl-10 focus:border-amber-500 focus:ring-amber-500 py-3 border text-lg font-mono text-slate-700"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600 shadow-sm"><Users size={28} /></div>
                  <div><h3 className="font-bold text-lg text-slate-800">Equipe de Campo</h3><p className="text-sm text-slate-500">Custos diários mapeados</p></div>
                </div>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Cargo" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border p-2 rounded flex-1" />
                  <input type="number" placeholder="R$/Dia" value={newCost} onChange={(e) => setNewCost(e.target.value)} className="border p-2 rounded w-28" />
                  <button onClick={addEmployee} className="bg-blue-600 text-white p-2 rounded"><Plus size={20} /></button>
                </div>
                <div className="overflow-y-auto max-h-48 border rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr><th className="p-3">Cargo</th><th className="p-3">Custo Dia</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} className="border-b">
                          <td className="p-3">{emp.role}</td><td className="p-3">R$ {emp.dailyCost.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} className="text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="flex justify-end pt-4"><button onClick={handleSaveGeral} className="bg-emerald-600 text-white flex gap-2 items-center px-6 py-2 rounded shadow"><Save size={18} /> Salvar Geral</button></div>
          </div>
        )}

        {/* TAB HCM */}
        {activeTab === 'hcm' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Regras de Negócio HCM</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Faturamento Mínimo Diário (R$)</label>
                  <input type="number" value={hcm.faturamentoMinimoDiario} onChange={e => setHcm({ ...hcm, faturamentoMinimoDiario: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Mobilização Padrão (R$)</label>
                  <input type="number" value={hcm.mobilizacaoPadrao} onChange={e => setHcm({ ...hcm, mobilizacaoPadrao: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Comprimento Mínimo p/ Estaca (m)</label>
                  <input type="number" value={hcm.comprimentoMinimo} onChange={e => setHcm({ ...hcm, comprimentoMinimo: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Acréscimo Fim de Semana (%)</label>
                  <input type="number" value={hcm.acrescimoFimDeSemana} onChange={e => setHcm({ ...hcm, acrescimoFimDeSemana: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Tabela de Preços por Diâmetro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {hcm.diametros.map((di, idx) => (
                  <div key={idx} className="bg-slate-50 border p-3 rounded-lg flex items-center justify-between">
                    <span className="font-bold">Ø{di.mm}mm</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">R$</span>
                      <input type="number" value={di.preco} onChange={e => {
                        const newD = [...hcm.diametros];
                        newD[idx].preco = Number(e.target.value);
                        setHcm({ ...hcm, diametros: newD });
                      }} className="w-20 p-1 border rounded text-right" />
                    </div>
                  </div>
                ))}
                <button className="border-dashed border-2 text-slate-500 hover:text-amber-600 hover:border-amber-600 rounded-lg p-3 flex items-center justify-center gap-2"
                  onClick={() => setHcm({ ...hcm, diametros: [...hcm.diametros, { mm: 600, preco: 0 }] })}>
                  <Plus size={16} /> Diâmetro
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4"><button onClick={handleSaveHCM} className="bg-emerald-600 text-white flex gap-2 items-center px-6 py-2 rounded shadow"><Save size={18} /> Salvar HCM</button></div>
          </div>
        )}

        {/* TAB ESC */}
        {activeTab === 'esc' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Regras de Negócio ESC</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Faturam. Mínimo DA OBRA (R$)</label>
                  <input type="number" value={esc.faturamentoMinimoObra} onChange={e => setEsc({ ...esc, faturamentoMinimoObra: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Taxa Hora Parada (R$/h)</label>
                  <input type="number" value={esc.taxaHoraParada} onChange={e => setEsc({ ...esc, taxaHoraParada: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Mobilização Padrão (R$)</label>
                  <input type="number" value={esc.mobilizacaoPadrao} onChange={e => setEsc({ ...esc, mobilizacaoPadrao: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Diária Excedente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Metros Contratados Por Dia</label>
                  <input type="number" value={esc.contratoSaidaDiariaPadrao.metrosContratadosPorDia} onChange={e => setEsc({ ...esc, contratoSaidaDiariaPadrao: { ...esc.contratoSaidaDiariaPadrao, metrosContratadosPorDia: Number(e.target.value) } })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Penalidade de Excedente (R$/m)</label>
                  <input type="number" value={esc.contratoSaidaDiariaPadrao.precoExcedentePorMetro} onChange={e => setEsc({ ...esc, contratoSaidaDiariaPadrao: { ...esc.contratoSaidaDiariaPadrao, precoExcedentePorMetro: Number(e.target.value) } })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Tabela de Preços por Diâmetro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {esc.diametros.map((di, idx) => (
                  <div key={idx} className="bg-slate-50 border p-3 rounded-lg flex items-center justify-between">
                    <span className="font-bold">Ø{di.mm}cm</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">R$</span>
                      <input type="number" value={di.preco} onChange={e => {
                        const newD = [...esc.diametros];
                        newD[idx].preco = Number(e.target.value);
                        setEsc({ ...esc, diametros: newD });
                      }} className="w-20 p-1 border rounded text-right" />
                    </div>
                  </div>
                ))}
                <button className="border-dashed border-2 text-slate-500 hover:text-amber-600 hover:border-amber-600 rounded-lg p-3 flex items-center justify-center gap-2"
                  onClick={() => setEsc({ ...esc, diametros: [...esc.diametros, { mm: 50, preco: 0 }] })}>
                  <Plus size={16} /> Diâmetro
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4"><button onClick={handleSaveESC} className="bg-emerald-600 text-white flex gap-2 items-center px-6 py-2 rounded shadow"><Save size={18} /> Salvar ESC</button></div>
          </div>
        )}

        {/* TAB SPT */}
        {activeTab === 'spt' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Regras de Negócio SPT</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Preço Por Metro (R$/m)</label>
                  <input type="number" value={spt.precoPorMetro} onChange={e => setSpt({ ...spt, precoPorMetro: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Mobilização + Lab (R$)</label>
                  <input type="number" value={spt.mobilizacaoLaboratorio} onChange={e => setSpt({ ...spt, mobilizacaoLaboratorio: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Taxa ART (R$)</label>
                  <input type="number" value={spt.artPadrao} onChange={e => setSpt({ ...spt, artPadrao: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Metragem Mínima Total OBRAGATÓRIA (m)</label>
                  <input type="number" value={spt.metragemMinimaTotal} onChange={e => setSpt({ ...spt, metragemMinimaTotal: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Medida Média por Furo Estimativo (m)</label>
                  <input type="number" value={spt.metrosPorFuroEstimado} onChange={e => setSpt({ ...spt, metrosPorFuroEstimado: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Sinal Agendamento (R$)</label>
                  <input type="number" value={spt.sinalAgendamento} onChange={e => setSpt({ ...spt, sinalAgendamento: Number(e.target.value) })} className="w-full p-2 border rounded" />
                </div>
                <div className="col-span-1 md:col-span-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-4 border rounded-lg">
                    <input type="checkbox" checked={spt.aplicarFaturamentoMinimoAcima2Furos} onChange={e => setSpt({ ...spt, aplicarFaturamentoMinimoAcima2Furos: e.target.checked })} className="w-5 h-5 accent-amber-600" />
                    <span className="font-semibold text-slate-700">Aplicar faturamento mínimo por diária caso os furos diários passem de 2.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4"><button onClick={handleSaveSPT} className="bg-emerald-600 text-white flex gap-2 items-center px-6 py-2 rounded shadow"><Save size={18} /> Salvar SPT</button></div>
          </div>
        )}
      </div>
    </div>
  );
};