// src/pages/Medicoes.tsx
// Gestão de Contratos de Medição

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { db } from '../../lib/firebase';
import {
    collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
    serverTimestamp, where
} from 'firebase/firestore';
import { Medicao } from '../../types';
import { Button, Input, Select } from '../../components/ui';
import {
    Ruler, Plus, FileDown, Trash2, CheckCircle2, Eye, Search,
    ClipboardList, X, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { generateMedicaoBlob, downloadMedicaoBlob, ItemMedicao } from '../services/medicaoPdfService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicoesProps {
    onNavigate: (tab: any) => void;
}

const STATUS_LABELS: Record<string, string> = {
    'Pendente': 'Pendente',
    'Enviada ao Cliente': 'Enviada ao Cliente',
    'Aprovada': 'Aprovada',
    'Paga': 'Paga',
};

const STATUS_COLORS: Record<string, string> = {
    'Pendente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Enviada ao Cliente': 'bg-blue-100 text-blue-700 border-blue-200',
    'Aprovada': 'bg-green-100 text-green-700 border-green-200',
    'Paga': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const EMPTY_MEDICAO = {
    clienteNome: '',
    obraId: '',
    dataEmissao: format(new Date(), 'yyyy-MM-dd'),
    dataVencimento: '',
    valorMedido: 0,
    status: 'Pendente' as Medicao['status'],
    observacoes: '',
    nfNumero: '',
};

const EMPTY_ITEM: ItemMedicao = {
    descricao: '',
    unidade: 'm',
    quantidade: 0,
    precoUnitario: 0,
    total: 0,
};

export const Medicoes: React.FC<MedicoesProps> = ({ onNavigate }) => {
    const { profile } = useAuth();
    const { empresa } = useEmpresa();
    const [medicoes, setMedicoes] = useState<Medicao[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('Todos');

    // Modal nova medição
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_MEDICAO });
    const [itens, setItens] = useState<ItemMedicao[]>([]);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!profile?.tenantId) return;
        const q = query(
            collection(db, 'empresas', profile.tenantId, 'medicoes'),
            orderBy('dataEmissao', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            setMedicoes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicao)));
            setLoading(false);
        });
        return () => unsub();
    }, [profile]);

    const proximoNumero = () => {
        if (medicoes.length === 0) return 1;
        return Math.max(...medicoes.map(m => m.numero || 0)) + 1;
    };

    const abrirNova = () => {
        setEditId(null);
        setForm({ ...EMPTY_MEDICAO });
        setItens([]);
        setShowModal(true);
    };

    const abrirEditar = (m: Medicao) => {
        setEditId(m.id || null);
        setForm({
            clienteNome: m.clienteNome || '',
            obraId: m.obraId || '',
            dataEmissao: m.dataEmissao || format(new Date(), 'yyyy-MM-dd'),
            dataVencimento: m.dataVencimento || '',
            valorMedido: m.valorMedido || 0,
            status: m.status || 'Pendente',
            observacoes: m.observacoes || '',
            nfNumero: m.nfNumero || '',
        });
        setItens((m as any).itens || []);
        setShowModal(true);
    };

    const updateItem = (idx: number, field: keyof ItemMedicao, val: any) => {
        setItens(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            if (field === 'quantidade' || field === 'precoUnitario') {
                next[idx].total = (next[idx].quantidade || 0) * (next[idx].precoUnitario || 0);
            }
            return next;
        });
    };

    const totalItens = itens.reduce((a, i) => a + (i.total || 0), 0);

    const handleSalvar = async () => {
        if (!profile?.tenantId) return;
        if (!form.clienteNome.trim()) { toast.error('Informe o nome do cliente.'); return; }
        if (!form.dataEmissao) { toast.error('Informe a data de emissão.'); return; }
        setSalvando(true);
        try {
            const valorFinal = itens.length > 0 ? totalItens : form.valorMedido;
            const payload: any = {
                ...form,
                valorMedido: valorFinal,
                itens,
                tenantId: profile.tenantId,
            };
            if (editId) {
                await updateDoc(doc(db, 'empresas', profile.tenantId, 'medicoes', editId), {
                    ...payload,
                    atualizadoEm: serverTimestamp(),
                });
                toast.success('Medição atualizada!');
            } else {
                await addDoc(collection(db, 'empresas', profile.tenantId, 'medicoes'), {
                    ...payload,
                    numero: proximoNumero(),
                    createdByUserId: profile.uid || '',
                    createdAt: serverTimestamp(),
                });
                toast.success('Medição criada com sucesso!');
            }
            setShowModal(false);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao salvar medição.');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async (id: string, numero: number) => {
        if (!window.confirm(`Excluir Medição MED-${String(numero).padStart(4, '0')}? Ação irreversível.`)) return;
        try {
            await deleteDoc(doc(db, 'empresas', profile!.tenantId, 'medicoes', id));
            toast.success('Medição excluída.');
        } catch { toast.error('Erro ao excluir.'); }
    };

    const handleMarcarPaga = async (id: string) => {
        try {
            await updateDoc(doc(db, 'empresas', profile!.tenantId, 'medicoes', id), { status: 'Paga' });
            toast.success('Medição marcada como Paga!');
        } catch { toast.error('Erro ao atualizar.'); }
    };

    const handleDownloadPDF = async (m: Medicao) => {
        const toastId = toast.loading('Gerando PDF...');
        try {
            const blob = await generateMedicaoBlob(m, (m as any).itens || [], empresa || undefined);
            downloadMedicaoBlob(blob, m.numero, m.clienteNome);
            toast.success('PDF gerado!', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar PDF.', { id: toastId });
        }
    };

    const filtered = medicoes.filter(m => {
        const mStatus = filtroStatus === 'Todos' || m.status === filtroStatus;
        const mBusca = busca === '' || m.clienteNome.toLowerCase().includes(busca.toLowerCase()) || String(m.numero).includes(busca);
        return mStatus && mBusca;
    });

    const totalPendente = medicoes.filter(m => m.status !== 'Paga').reduce((a, m) => a + (m.valorMedido || 0), 0);
    const totalPago = medicoes.filter(m => m.status === 'Paga').reduce((a, m) => a + (m.valorMedido || 0), 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Ruler className="text-indigo-600" size={32} />
                        Contratos de Medição
                    </h1>
                    <p className="text-slate-500 mt-1">Registre e gere os contratos de medição dos serviços executados.</p>
                </div>
                <Button onClick={abrirNova} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md">
                    <Plus size={18} /> Nova Medição
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total de Medições</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{medicoes.length}</p>
                </div>
                <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-amber-500 uppercase font-semibold tracking-wider">A Receber</p>
                    <p className="text-3xl font-black text-amber-700 mt-1">
                        {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-emerald-500 uppercase font-semibold tracking-wider">Recebido</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">
                        {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input placeholder="Buscar por cliente ou número..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
                </div>
                <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-48">
                    <option value="Todos">Todos os Status</option>
                    {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </Select>
            </div>

            {/* LISTA */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nº Medição</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Emissão</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">NF</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Carregando medições...</td></tr>}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-lg">Nenhuma medição encontrada.</p>
                                        <p className="text-sm mt-1">Clique em "Nova Medição" para começar.</p>
                                    </td>
                                </tr>
                            )}
                            {filtered.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-slate-700 font-mono">
                                        MED-{String(m.numero).padStart(4, '0')}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{m.clienteNome}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{m.dataEmissao || '—'}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{m.dataVencimento || '—'}</td>
                                    <td className="px-6 py-3 font-mono font-medium text-slate-700">
                                        {(m.valorMedido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{m.nfNumero || '—'}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {STATUS_LABELS[m.status] || m.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600" title="Editar" onClick={() => abrirEditar(m)}>
                                                <Eye size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600"
                                                title="Baixar PDF"
                                                onClick={() => handleDownloadPDF(m)}
                                            >
                                                <FileDown size={16} />
                                            </Button>
                                            {m.status !== 'Paga' && (
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                    title="Marcar como Paga"
                                                    onClick={() => m.id && handleMarcarPaga(m.id)}
                                                >
                                                    <CheckCircle2 size={16} />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                title="Excluir"
                                                onClick={() => m.id && handleDelete(m.id, m.numero)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL NOVA/EDITAR MEDIÇÃO */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
                        {/* Header modal */}
                        <div className="flex items-center justify-between px-6 py-4 bg-indigo-950 text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Ruler size={20} />
                                {editId ? 'Editar Medição' : 'Nova Medição'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-indigo-300 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Dados gerais */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Nome do Cliente *</label>
                                    <Input value={form.clienteNome} onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} placeholder="Nome ou Razão Social" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Data de Emissão *</label>
                                    <Input type="date" value={form.dataEmissao} onChange={e => setForm(f => ({ ...f, dataEmissao: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Data de Vencimento</label>
                                    <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                                    <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Nº Nota Fiscal</label>
                                    <Input value={form.nfNumero} onChange={e => setForm(f => ({ ...f, nfNumero: e.target.value }))} placeholder="Ex: 1234" />
                                </div>
                            </div>

                            {/* Itens de medição */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-slate-600">Itens Medidos</label>
                                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setItens(prev => [...prev, { ...EMPTY_ITEM }])}>
                                        <Plus size={12} /> Adicionar Item
                                    </Button>
                                </div>
                                {itens.length === 0 ? (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 block mb-1">Valor Total da Medição (R$)</label>
                                        <Input
                                            type="number"
                                            value={form.valorMedido}
                                            onChange={e => setForm(f => ({ ...f, valorMedido: Number(e.target.value) }))}
                                            placeholder="0,00"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">Ou adicione itens detalhados acima para calcular automaticamente.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {itens.map((item, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="col-span-4">
                                                    {i === 0 && <label className="text-[10px] text-slate-400 block mb-1">Descrição</label>}
                                                    <Input
                                                        value={item.descricao}
                                                        onChange={e => updateItem(i, 'descricao', e.target.value)}
                                                        placeholder="Ex: Estacas HCM Ø40cm"
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    {i === 0 && <label className="text-[10px] text-slate-400 block mb-1">Unid.</label>}
                                                    <Input value={item.unidade} onChange={e => updateItem(i, 'unidade', e.target.value)} className="text-xs text-center" />
                                                </div>
                                                <div className="col-span-2">
                                                    {i === 0 && <label className="text-[10px] text-slate-400 block mb-1">Qtde.</label>}
                                                    <Input type="number" value={item.quantidade} onChange={e => updateItem(i, 'quantidade', Number(e.target.value))} className="text-xs text-right" />
                                                </div>
                                                <div className="col-span-2">
                                                    {i === 0 && <label className="text-[10px] text-slate-400 block mb-1">Preço Unit.</label>}
                                                    <Input type="number" value={item.precoUnitario} onChange={e => updateItem(i, 'precoUnitario', Number(e.target.value))} className="text-xs text-right" />
                                                </div>
                                                <div className="col-span-2">
                                                    {i === 0 && <label className="text-[10px] text-slate-400 block mb-1">Total</label>}
                                                    <p className="text-xs font-bold text-slate-700 text-right pt-2 px-2">
                                                        {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </p>
                                                </div>
                                                <div className="col-span-1">
                                                    {i === 0 && <div className="mb-1 h-3" />}
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => setItens(p => p.filter((_, j) => j !== i))}>
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-end px-2 pt-1">
                                            <p className="text-sm font-bold text-indigo-700">
                                                Total: {totalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Observações</label>
                                <textarea
                                    value={form.observacoes}
                                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                                    rows={3}
                                    placeholder="Notas adicionais, referência do boletim, etc."
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                />
                            </div>

                            {/* Ações */}
                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" onClick={() => setShowModal(false)} disabled={salvando}>Cancelar</Button>
                                <Button onClick={handleSalvar} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                    <Save size={16} />
                                    {salvando ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Medição'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
