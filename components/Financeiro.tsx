import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, Timestamp, runTransaction, orderBy } from 'firebase/firestore';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { ConstructionSite, Medicao, Recebimento, DREObra } from '../types';
import { formatCurrency, formatShortDate } from '../src/utils/formatters';
import { Download, Plus, DollarSign, Wallet2, FileCheck, Search, FileText, MoreHorizontal } from 'lucide-react';
import { Card, Input, Select, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const Financeiro: React.FC = () => {
    const { profile, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'medicoes' | 'recebimentos' | 'fluxo'>('medicoes');
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [medicoes, setMedicoes] = useState<Medicao[]>([]);
    const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
    const [dres, setDres] = useState<DREObra[]>([]);

    // Obras selection
    const { data: obrasData } = useCollection<ConstructionSite>('obras',
        profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
    );
    const activeObras = obrasData.filter(o => o.statusObra === 'Em Andamento');

    // Filter State
    const [filtroObra, setFiltroObra] = useState<string>('all');
    const [filtroStatus, setFiltroStatus] = useState<string>('all');
    const [periodFilter, setPeriodFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isMedicaoModalOpen, setIsMedicaoModalOpen] = useState(false);
    const [isRecebimentoModalOpen, setIsRecebimentoModalOpen] = useState(false);
    const [selectedMedicao, setSelectedMedicao] = useState<Medicao | null>(null);

    // Pagamento State
    const [pagamentoForm, setPagamentoForm] = useState<{
        valor: number;
        data: string;
        formaPagamento: Recebimento['formaPagamento'];
        observacao: string;
    }>({ valor: 0, data: formatShortDate(new Date()), formaPagamento: 'PIX', observacao: '' });

    // Nova Medição State
    const [novaMedicaoForm, setNovaMedicaoForm] = useState<{
        obraId: string;
        valor: number;
        dataEmissao: string;
        dataVencimento: string;
        nfNumero: string;
        observacoes: string;
    }>({
        obraId: '',
        valor: 0,
        dataEmissao: formatShortDate(new Date()),
        dataVencimento: formatShortDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        nfNumero: '',
        observacoes: ''
    });

    const handleSalvarNovaMedicao = async () => {
        if (!profile?.tenantId || !user?.uid) return;
        if (!novaMedicaoForm.obraId || novaMedicaoForm.valor <= 0) return alert('Preencha a obra e o valor corretamente.');

        setIsLoading(true);
        try {
            const obraSelecionada = activeObras.find(o => o.id === novaMedicaoForm.obraId);
            if (!obraSelecionada) throw new Error('Obra não encontrada');

            // Descobrir o próximo número para esta obra
            const medicoesDaObra = medicoes.filter(m => m.obraId === novaMedicaoForm.obraId);
            const proximoNumero = medicoesDaObra.length > 0
                ? Math.max(...medicoesDaObra.map(m => m.numero || 0)) + 1
                : 1;

            const novaMedicao: Omit<Medicao, 'id'> = {
                tenantId: profile.tenantId,
                obraId: novaMedicaoForm.obraId,
                clienteNome: obraSelecionada.clienteNome || 'Desconhecido',
                numero: proximoNumero,
                dataEmissao: novaMedicaoForm.dataEmissao,
                dataVencimento: novaMedicaoForm.dataVencimento,
                valorMedido: novaMedicaoForm.valor,
                status: 'Pendente',
                nfNumero: novaMedicaoForm.nfNumero,
                observacoes: novaMedicaoForm.observacoes,
                createdByUserId: user.uid,
                createdAt: Timestamp.now()
            };

            const docRef = doc(collection(db, 'medicoes'));
            await setDoc(docRef, novaMedicao);

            alert('Medição criada com sucesso!');
            setIsMedicaoModalOpen(false);
            loadData(); // Reload para atualizar localmente
        } catch (e) {
            console.error(e);
            alert('Erro ao criar medição');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegistrarPagamento = async () => {
        if (!profile?.tenantId || !selectedMedicao || !selectedMedicao.id) return;
        if (pagamentoForm.valor <= 0) return alert('Valor inválido');

        setIsLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const medicaoRef = doc(db, 'medicoes', selectedMedicao.id!);
                const dreRef = doc(db, 'dre_obras', selectedMedicao.obraId);
                const recebimentoRef = doc(collection(db, 'recebimentos'));

                // 1. Verificar DRE
                const dreSnap = await transaction.get(dreRef);

                // 2. Criar Recebimento
                const novoRecebimento: Omit<Recebimento, 'id'> = {
                    tenantId: profile.tenantId!,
                    obraId: selectedMedicao.obraId,
                    medicaoId: selectedMedicao.id!,
                    clienteNome: selectedMedicao.clienteNome,
                    valor: pagamentoForm.valor,
                    dataPagamento: pagamentoForm.data,
                    formaPagamento: pagamentoForm.formaPagamento,
                    observacao: pagamentoForm.observacao,
                    createdAt: Timestamp.now()
                };
                transaction.set(recebimentoRef, novoRecebimento);

                // 3. Atualizar Medição
                transaction.update(medicaoRef, { status: 'Paga' });

                // 4. Atualizar DRE Acumulado
                if (dreSnap.exists()) {
                    const dreAtual = dreSnap.data() as DREObra;
                    transaction.update(dreRef, {
                        receitaMedidaAcumulada: (dreAtual.receitaMedidaAcumulada || 0) + pagamentoForm.valor
                    });
                }
            });

            alert('Pagamento registrado e receita acumulada atualizada!');
            setIsRecebimentoModalOpen(false);
            setSelectedMedicao(null);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Falha ao registrar pagamento.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMudarStatusMedicao = async (medicaoId: string, novoStatus: Medicao['status']) => {
        try {
            await setDoc(doc(db, 'medicoes', medicaoId), { status: novoStatus }, { merge: true });
            loadData();
        } catch (e) {
            alert('Erro ao mudar status');
        }
    };

    useEffect(() => {
        if (profile?.tenantId) {
            loadData();
        }
    }, [profile?.tenantId]);

    const loadData = async () => {
        if (!profile?.tenantId) return;
        setIsLoading(true);
        try {
            const tenantId = profile.tenantId;

            const medSnap = await getDocs(query(collection(db, 'medicoes'), where('tenantId', '==', tenantId)));
            const recSnap = await getDocs(query(collection(db, 'recebimentos'), where('tenantId', '==', tenantId)));
            const dreSnap = await getDocs(query(collection(db, 'dre_obras'), where('tenantId', '==', tenantId)));

            setMedicoes(medSnap.docs.map(d => ({ id: d.id, ...d.data() } as Medicao)));
            setRecebimentos(recSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recebimento)));
            setDres(dreSnap.docs.map(d => ({ id: d.id, ...d.data() } as DREObra)));
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar dados financeiros.');
        } finally {
            setIsLoading(false);
        }
    };

    // KPIs
    const totalAReceber = medicoes.filter(m => m.status === 'Pendente' || m.status === 'Aprovada').reduce((acc, m) => acc + m.valorMedido, 0);

    const hoje = new Date();
    const recebidoMesAtual = recebimentos.filter(r => {
        const d = new Date(r.dataPagamento);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).reduce((acc, r) => acc + r.valor, 0);

    const totalEmAberto = medicoes.filter(m => {
        if (m.status === 'Paga') return false;
        const v = new Date(m.dataVencimento);
        return v < hoje;
    }).reduce((acc, m) => acc + m.valorMedido, 0);

    const devedores: Record<string, number> = {};
    medicoes.filter(m => m.status !== 'Paga').forEach(m => {
        devedores[m.clienteNome] = (devedores[m.clienteNome] || 0) + m.valorMedido;
    });
    let maiorDevedorNome = '-';
    let maiorDevedorValor = 0;
    Object.entries(devedores).forEach(([nome, valor]) => {
        if (valor > maiorDevedorValor) {
            maiorDevedorValor = valor;
            maiorDevedorNome = nome;
        }
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro e Faturamento</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestão de medições, notas fiscais e controle de recebimentos.</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-slate-200">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><Wallet2 size={16} /> Total a Receber</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">{formatCurrency(totalAReceber)}</p>
                </Card>
                <Card className="p-4 bg-white border-slate-200">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><DollarSign size={16} /> Recebido no Mês</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(recebidoMesAtual)}</p>
                </Card>
                <Card className="p-4 bg-white border-slate-200">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><FileCheck size={16} /> Vencido / Em Aberto</p>
                    <p className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(totalEmAberto)}</p>
                </Card>
                <Card className="p-4 bg-white border-slate-200">
                    <p className="text-sm font-medium text-slate-500">Maior Devedor</p>
                    <div className="mt-2 text-sm">
                        <p className="font-bold text-slate-900 truncate">{maiorDevedorNome}</p>
                        <p className="text-rose-600 font-medium">{formatCurrency(maiorDevedorValor)}</p>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-max">
                <button onClick={() => setActiveTab('medicoes')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'medicoes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    Medições
                </button>
                <button onClick={() => setActiveTab('recebimentos')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'recebimentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    Recebimentos
                </button>
                <button onClick={() => setActiveTab('fluxo')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'fluxo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    Fluxo de Caixa
                </button>
            </div>

            <Card className="overflow-hidden bg-white min-h-[400px]">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                ) : activeTab === 'medicoes' ? (
                    <MedicoesTab />
                ) : activeTab === 'recebimentos' ? (
                    <RecebimentosTab />
                ) : (
                    <FluxoCaixaTab />
                )}
            </Card>
        </div>
    );

    function MedicoesTab() {
        let filtradas = medicoes;
        if (filtroObra !== 'all') filtradas = filtradas.filter(m => m.obraId === filtroObra);
        if (filtroStatus !== 'all') filtradas = filtradas.filter(m => m.status === filtroStatus);
        if (searchQuery) filtradas = filtradas.filter(m => m.clienteNome.toLowerCase().includes(searchQuery.toLowerCase()));

        filtradas.sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime());

        return (
            <div className="p-0">
                <div className="p-4 border-b border-slate-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex flex-1 gap-4 max-w-2xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Buscar por cliente..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <Select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className="w-48">
                                <option value="all">Todas as Obras</option>
                                {activeObras.map(o => <option key={o.id} value={o.id}>{o.clienteNome}</option>)}
                            </Select>
                            <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-48">
                                <option value="all">Todos os Status</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Enviada ao Cliente">Enviada ao Cliente</option>
                                <option value="Aprovada">Aprovada</option>
                                <option value="Paga">Paga</option>
                            </Select>
                        </div>
                        <Button onClick={() => setIsMedicaoModalOpen(true)} className="bg-slate-900 text-white gap-2 mt-4 sm:mt-0">
                            <Plus size={16} /> Nova Medição
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">Obra / Cliente</th>
                                <th className="px-6 py-3 font-medium">Nº</th>
                                <th className="px-6 py-3 font-medium">Emissão</th>
                                <th className="px-6 py-3 font-medium">Vencimento</th>
                                <th className="px-6 py-3 font-medium text-right">Valor</th>
                                <th className="px-6 py-3 font-medium text-center">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filtradas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Nenhuma medição encontrada.</td>
                                </tr>
                            ) : (
                                filtradas.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50 cursor-pointer group">
                                        <td className="px-6 py-4 font-medium">{m.clienteNome}</td>
                                        <td className="px-6 py-4">#{m.numero}</td>
                                        <td className="px-6 py-4">{formatShortDate(m.dataEmissao)}</td>
                                        <td className="px-6 py-4 text-slate-500">{formatShortDate(m.dataVencimento)}</td>
                                        <td className="px-6 py-4 font-medium text-right">{formatCurrency(m.valorMedido)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full ${m.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' :
                                                m.status === 'Aprovada' ? 'bg-indigo-100 text-indigo-700' :
                                                    m.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>{m.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="action" className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {m.status === 'Pendente' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleMudarStatusMedicao(m.id!, 'Enviada ao Cliente')}>Enviar ao Cliente</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedMedicao(m);
                                                                setPagamentoForm(f => ({ ...f, valor: m.valorMedido }));
                                                                setIsRecebimentoModalOpen(true);
                                                            }}>Registrar Pagamento</DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {m.status === 'Enviada ao Cliente' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleMudarStatusMedicao(m.id!, 'Aprovada')}>Marcar Aprovada</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedMedicao(m);
                                                                setPagamentoForm(f => ({ ...f, valor: m.valorMedido }));
                                                                setIsRecebimentoModalOpen(true);
                                                            }}>Registrar Pagamento</DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {m.status === 'Aprovada' && (
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedMedicao(m);
                                                            setPagamentoForm(f => ({ ...f, valor: m.valorMedido }));
                                                            setIsRecebimentoModalOpen(true);
                                                        }}>Registrar Pagamento</DropdownMenuItem>
                                                    )}
                                                    {m.status === 'Paga' && (
                                                        <DropdownMenuItem disabled>Paga</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Nova Medição */}
                {isMedicaoModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="bg-white max-w-md w-full p-6 shadow-xl">
                            <h2 className="text-xl font-bold mb-4">Nova Medição</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Obra em Andamento</label>
                                    <Select value={novaMedicaoForm.obraId} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, obraId: e.target.value })} className="w-full">
                                        <option value="">Selecione a obra...</option>
                                        {activeObras.map(o => <option key={o.id} value={o.id}>{o.clienteNome}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Valor Medido</label>
                                    <Input type="number" step="0.01" value={novaMedicaoForm.valor || ''} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, valor: parseFloat(e.target.value) })} className="w-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Emissão</label>
                                        <Input type="date" value={novaMedicaoForm.dataEmissao} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, dataEmissao: e.target.value })} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Vencimento</label>
                                        <Input type="date" value={novaMedicaoForm.dataVencimento} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, dataVencimento: e.target.value })} className="w-full" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nº Nota Fiscal (Opcional)</label>
                                    <Input type="text" value={novaMedicaoForm.nfNumero} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, nfNumero: e.target.value })} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Observações</label>
                                    <Input type="text" value={novaMedicaoForm.observacoes} onChange={(e) => setNovaMedicaoForm({ ...novaMedicaoForm, observacoes: e.target.value })} className="w-full" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="outline" onClick={() => setIsMedicaoModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSalvarNovaMedicao} className="bg-slate-900 text-white">Criar Medição</Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Modal Registrar Pagamento */}
                {isRecebimentoModalOpen && selectedMedicao && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="bg-white max-w-sm w-full p-6 shadow-xl">
                            <h2 className="text-lg font-bold mb-4">Registrar Pagamento</h2>
                            <p className="text-sm text-slate-500 mb-4">Medição #{selectedMedicao.numero} - {selectedMedicao.clienteNome}</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data do Pagamento</label>
                                    <Input type="date" value={pagamentoForm.data} onChange={e => setPagamentoForm({ ...pagamentoForm, data: e.target.value })} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Valor Recebido</label>
                                    <Input type="number" step="0.01" value={pagamentoForm.valor || ''} onChange={e => setPagamentoForm({ ...pagamentoForm, valor: parseFloat(e.target.value) })} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                                    <Select value={pagamentoForm.formaPagamento} onChange={(e) => setPagamentoForm({ ...pagamentoForm, formaPagamento: e.target.value as any })} className="w-full">
                                        <option value="PIX">PIX</option>
                                        <option value="TED">TED</option>
                                        <option value="Boleto">Boleto</option>
                                        <option value="Cheque">Cheque</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="outline" onClick={() => { setIsRecebimentoModalOpen(false); setSelectedMedicao(null); }}>Cancelar</Button>
                                <Button onClick={handleRegistrarPagamento} className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirmar Recebimento</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    function RecebimentosTab() {
        // Agrupar ultimos 6 meses
        const chartData = useMemo(() => {
            const data = [];
            const hoje = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                const monthYear = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

                const medsMes = medicoes.filter(m => {
                    const mD = new Date(m.dataEmissao);
                    return mD.getMonth() === d.getMonth() && mD.getFullYear() === d.getFullYear();
                }).reduce((acc, m) => acc + m.valorMedido, 0);

                const recsMes = recebimentos.filter(r => {
                    const rD = new Date(r.dataPagamento);
                    return rD.getMonth() === d.getMonth() && rD.getFullYear() === d.getFullYear();
                }).reduce((acc, r) => acc + r.valor, 0);

                data.push({
                    name: monthYear,
                    Medido: medsMes,
                    Recebido: recsMes,
                    Inadimplência: medsMes - recsMes
                });
            }
            return data;
        }, [medicoes, recebimentos]);

        const sortedRecebimentos = [...recebimentos].sort((a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime());

        return (
            <div className="p-4 space-y-8">
                <div className="h-72 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                            <YAxis tickFormatter={(val) => `R$ ${val / 1000}k`} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} cursor={{ fill: '#F1F5F9' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="Medido" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Recebido" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Histórico de Recebimentos</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Data Recebimento</th>
                                    <th className="px-6 py-3 font-medium">Obra / Cliente</th>
                                    <th className="px-6 py-3 font-medium text-center">Forma Pagamento</th>
                                    <th className="px-6 py-3 font-medium text-right">Valor Pago</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {sortedRecebimentos.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum recebimento registrado.</td></tr>
                                )}
                                {sortedRecebimentos.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 bg-white">
                                        <td className="px-6 py-4">{formatShortDate(r.dataPagamento)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{r.clienteNome}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                {r.formaPagamento}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-emerald-600 font-bold text-right">{formatCurrency(r.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    function FluxoCaixaTab() {
        const handleExportCSV = () => {
            // Implement CSV Export Logic
            const headers = ['Data', 'Descrição', 'Tipo', 'Entrada (R$)', 'Saída (R$)', 'Saldo Acumulado (R$)'];
            const rows = recebimentos.map(r => [
                formatShortDate(r.dataPagamento),
                `Recebimento - ${r.clienteNome}`,
                'Entrada',
                r.valor.toFixed(2),
                '0.00',
                '...'
            ]);

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `FluxoCaixa_${formatShortDate(new Date())}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <p className="text-sm text-slate-500">Acompanhamento consolidado de entradas e saídas.</p>
                    <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                        <Download size={16} /> Exportar CSV
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">Data</th>
                                <th className="px-6 py-3 font-medium">Descrição</th>
                                <th className="px-6 py-3 font-medium text-center">Tipo</th>
                                <th className="px-6 py-3 font-medium text-right text-emerald-600">Entrada</th>
                                <th className="px-6 py-3 font-medium text-right text-rose-600">Saída</th>
                                <th className="px-6 py-3 font-medium text-right text-indigo-600">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">As saídas estão sendo processadas do DRE... (WIP)</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
};
