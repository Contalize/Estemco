import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Proposta, StatusProposta, TipoServico } from '../../types';

import { Button, Input, Select, Toast, ConfirmDialog } from '../../components/ui';
import { FileText, Plus, Search, Eye, FileDown, Trash2, Edit, CheckCircle2, Send, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatarData } from '../utils/formatDate';
import { PDFPreviewModal } from '../../components/PDFPreviewModal';
import { excluirProposta } from '../services/propostaService';
import { generatePropostaBlob, downloadBlob } from '../services/pdfService';
import { montarNomeArquivoProposta } from '../utils/formatters';
import { toast } from 'sonner';
import { differenceInDays, addDays } from 'date-fns';

interface PropostasListProps {
    onNavigate: (tab: any) => void;
}

const MOTIVOS_RECUSA = [
    { value: 'preco', label: 'Preço acima do esperado' },
    { value: 'prazo', label: 'Prazo de execução incompatível' },
    { value: 'concorrente', label: 'Optou por concorrente' },
    { value: 'sem_verba', label: 'Sem verba / orçamento cancelado' },
    { value: 'projeto_cancelado', label: 'Projeto cancelado ou suspenso' },
    { value: 'outro', label: 'Outro motivo' },
];

const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (ts?.toDate) return ts.toDate();
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
    return null;
};

export const Propostas: React.FC<PropostasListProps> = ({ onNavigate }) => {
    const { profile } = useAuth();
    const { empresa } = useEmpresa();
    const [propostas, setPropostas] = useState<Proposta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProposta, setSelectedProposta] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [busca, setBusca] = useState('');

    // Dialog de recusa
    const [recusaDialogOpen, setRecusaDialogOpen] = useState(false);
    const [recusaPropostaId, setRecusaPropostaId] = useState<string | null>(null);
    const [recusaNumero, setRecusaNumero] = useState('');
    const [motivoRecusa, setMotivoRecusa] = useState('preco');
    const [observacaoRecusa, setObservacaoRecusa] = useState('');
    const [salvandoRecusa, setSalvandoRecusa] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'primary' | 'destructive';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // ── Carregar propostas e auto-expirar ────────────────────────────────────
    useEffect(() => {
        if (!profile?.tenantId) return;

        const q = query(
            collection(db, 'empresas', profile.tenantId, 'propostas'),
            orderBy('criadoEm', 'desc')
        );

        const unsub = onSnapshot(q, async (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposta));
            setPropostas(data);
            setLoading(false);

            // Auto-expirar propostas enviadas onde validade já venceu
            const hoje = new Date();
            for (const p of data) {
                if (p.status !== 'ENVIADA') continue;
                const enviadoEm = toDate((p as any).enviadoEm);
                if (!enviadoEm) continue;
                const validadeDias = (p as any).validadeProposta || 15;
                const expiracao = addDays(enviadoEm, validadeDias);
                if (expiracao < hoje) {
                    try {
                        await updateDoc(doc(db, 'empresas', profile.tenantId, 'propostas', p.id!), {
                            status: 'EXPIRADA',
                            expiradoEm: serverTimestamp(),
                        });
                    } catch { /* silencioso */ }
                }
            }
        });

        return () => unsub();
    }, [profile]);

    // ── Propostas pendentes de follow-up (enviadas há > 3 dias) ─────────────
    const followUpCount = propostas.filter(p => {
        if (p.status !== 'ENVIADA') return false;
        const enviadoEm = toDate((p as any).enviadoEm);
        if (!enviadoEm) return false;
        return differenceInDays(new Date(), enviadoEm) >= 3;
    }).length;

    // ── Ações ────────────────────────────────────────────────────────────────
    const handleEnviar = (id: string, numero: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Enviar Proposta ao Cliente',
            message: `Confirma o envio da proposta ${numero}? O status será alterado para "Enviada" e a data de envio será registrada para controle de follow-up.`,
            variant: 'primary',
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, 'empresas', profile!.tenantId, 'propostas', id), {
                        status: 'ENVIADA',
                        enviadoEm: serverTimestamp(),
                    });
                    toast.success(`Proposta ${numero} marcada como Enviada!`);
                } catch {
                    toast.error('Erro ao atualizar status da proposta.');
                }
            }
        });
    };

    const handleApprove = (id: string, numero: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Aprovar Proposta',
            message: `Aprovar a proposta ${numero}? Ela passará a ter status de Aprovada (Cliente Fechou).`,
            variant: 'primary',
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, 'empresas', profile!.tenantId, 'propostas', id), {
                        status: 'ACEITA',
                        aceitoEm: serverTimestamp(),
                    });
                    toast.success(`Proposta ${numero} aprovada!`);
                } catch {
                    toast.error('Erro ao aprovar proposta.');
                }
            }
        });
    };

    const handleAbrirRecusa = (id: string, numero: string) => {
        setRecusaPropostaId(id);
        setRecusaNumero(numero);
        setMotivoRecusa('preco');
        setObservacaoRecusa('');
        setRecusaDialogOpen(true);
    };

    const handleConfirmarRecusa = async () => {
        if (!recusaPropostaId || !profile?.tenantId) return;
        setSalvandoRecusa(true);
        try {
            await updateDoc(doc(db, 'empresas', profile.tenantId, 'propostas', recusaPropostaId), {
                status: 'RECUSADA',
                motivoRecusa,
                observacaoRecusa: observacaoRecusa.trim() || null,
                recusadoEm: serverTimestamp(),
            });
            toast.success(`Proposta ${recusaNumero} marcada como Recusada.`);
            setRecusaDialogOpen(false);
        } catch {
            toast.error('Erro ao registrar recusa.');
        } finally {
            setSalvandoRecusa(false);
        }
    };

    const handleDelete = async (id: string, numero: string) => {
        const confirmacao = window.confirm(`Atenção: Tem certeza que deseja excluir a proposta ${numero}? Esta ação não pode ser desfeita.`);
        if (!confirmacao) return;
        try {
            if (!profile?.tenantId) return;
            await excluirProposta(profile.tenantId, id);
            toast.success('Proposta excluída com sucesso!');
        } catch {
            toast.error('Erro ao excluir proposta.');
        }
    };

    const handlePreview = (proposta: Proposta) => {
        setSelectedProposta(proposta);
        setShowPreview(true);
    };

    // ── Badges e cores ───────────────────────────────────────────────────────
    const getStatusBadge = (status: StatusProposta | undefined) => {
        const s = status || 'RASCUNHO';
        const maps: Record<StatusProposta, string> = {
            'RASCUNHO': 'bg-gray-100 text-gray-700 border-gray-200',
            'ENVIADA': 'bg-blue-100 text-blue-700 border-blue-200',
            'ACEITA': 'bg-green-100 text-green-700 border-green-200',
            'RECUSADA': 'bg-red-100 text-red-700 border-red-200',
            'EXPIRADA': 'bg-orange-100 text-orange-700 border-orange-200'
        };
        const labels: Record<StatusProposta, string> = {
            'RASCUNHO': 'Rascunho',
            'ENVIADA': 'Enviada',
            'ACEITA': 'Aprovada',
            'RECUSADA': 'Recusada',
            'EXPIRADA': 'Expirada'
        };
        return <span className={`px-2 py-1 text-xs font-bold rounded-full border ${maps[s] || maps['RASCUNHO']}`}>{labels[s] || 'Rascunho'}</span>;
    };

    const getTypeColor = (tipo: string) => {
        if (tipo === 'HCM') return 'bg-[#1a6b8a]/10 text-[#1a6b8a] border-[#1a6b8a]/20';
        if (tipo === 'ESC') return 'bg-[#8a4a1a]/10 text-[#8a4a1a] border-[#8a4a1a]/20';
        if (tipo === 'SPT') return 'bg-[#2a7a3b]/10 text-[#2a7a3b] border-[#2a7a3b]/20';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const getDiasEnviada = (proposta: Proposta): number | null => {
        const enviadoEm = toDate((proposta as any).enviadoEm);
        if (!enviadoEm) return null;
        return differenceInDays(new Date(), enviadoEm);
    };

    const filtered = propostas.filter(o => {
        const mTipo = filtroTipo === 'Todos' || o.tipo === filtroTipo;
        const mStatus = filtroStatus === 'Todos' || o.status === filtroStatus;
        const mBusca = busca === '' || o.numero.toLowerCase().includes(busca.toLowerCase()) || o.clienteNome.toLowerCase().includes(busca.toLowerCase());
        return mTipo && mStatus && mBusca;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText className="text-indigo-600" size={32} />
                        Propostas Comerciais
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie propostas e pipeline de contratos para HCM, ESC e SPT.</p>
                </div>
                <Button onClick={() => onNavigate({ tab: 'quote' })} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md">
                    <Plus size={18} /> Nova Proposta
                </Button>
            </div>

            {/* BANNER DE FOLLOW-UP */}
            {followUpCount > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 shadow-sm">
                    <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-amber-800 font-semibold text-sm">
                            {followUpCount} {followUpCount === 1 ? 'proposta aguarda' : 'propostas aguardam'} resposta há mais de 3 dias
                        </p>
                        <p className="text-amber-600 text-xs mt-0.5">Filtre por "Enviadas" para ver e fazer follow-up com os clientes.</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setFiltroStatus('ENVIADA')}>
                        Ver enviadas
                    </Button>
                </div>
            )}

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input placeholder="Buscar por número ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
                </div>

                <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-40">
                    <option value="Todos">Tipos</option>
                    <option value="HCM">HCM</option>
                    <option value="ESC">ESC</option>
                    <option value="SPT">SPT</option>
                </Select>

                <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-40">
                    <option value="Todos">Status</option>
                    <option value="RASCUNHO">Rascunhos</option>
                    <option value="ENVIADA">Enviadas</option>
                    <option value="ACEITA">Aprovadas</option>
                    <option value="RECUSADA">Recusadas</option>
                    <option value="EXPIRADA">Expiradas</option>
                </Select>
            </div>

            {/* LISTA */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nº Da Proposta</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Obra</th>
                                <th className="px-6 py-4">Valor Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Carregando propostas comerciais...</td></tr>}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-lg">Nenhuma proposta encontrada.</p>
                                    </td>
                                </tr>
                            )}
                            {filtered.map(o => {
                                const diasEnviada = o.status === 'ENVIADA' ? getDiasEnviada(o) : null;
                                const precisaFollowUp = diasEnviada !== null && diasEnviada >= 3;

                                return (
                                    <tr key={o.id} className={`hover:bg-slate-50 transition-colors group ${precisaFollowUp ? 'bg-amber-50/40' : ''}`}>
                                        <td className="px-6 py-3 font-bold text-slate-700">{o.numero}</td>
                                        <td className="px-6 py-3 text-slate-600 truncate max-w-[150px]">{o.clienteNome}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded font-mono text-xs font-bold border ${getTypeColor(o.tipo)}`}>
                                                {o.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-sm truncate max-w-[150px]">{o.enderecoObra?.cidade || '-'}</td>
                                        <td className="px-6 py-3 font-mono font-medium text-slate-700">R$ {o.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col gap-1">
                                                {getStatusBadge(o.status)}
                                                {precisaFollowUp && (
                                                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                                        <Clock size={10} /> {diasEnviada}d sem resposta
                                                    </span>
                                                )}
                                                {o.status === 'RECUSADA' && (o as any).motivoRecusa && (
                                                    <span className="text-[10px] text-red-400 italic truncate max-w-[120px]">
                                                        {MOTIVOS_RECUSA.find(m => m.value === (o as any).motivoRecusa)?.label || (o as any).motivoRecusa}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">
                                            {o.criadoEm ? formatarData(o.criadoEm) : 'Hoje'}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Visualizar */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                                    title="Visualizar PDF"
                                                    onClick={() => o?.id && handlePreview(o)}
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                {/* Editar */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                                                    title="Editar"
                                                    onClick={() => o?.id && onNavigate({ tab: 'quote', propostaId: o.id, mode: 'edit' })}
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                {/* Baixar PDF */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600"
                                                    title="Baixar PDF"
                                                    onClick={async () => {
                                                        if (!o?.id) return;
                                                        const toastId = toast.loading('Gerando PDF...');
                                                        try {
                                                            const blob = await generatePropostaBlob(o as any, profile?.tenantId || '', empresa || undefined);
                                                            downloadBlob(blob, montarNomeArquivoProposta(o as any, o as any));
                                                            toast.success('PDF gerado!', { id: toastId });
                                                        } catch {
                                                            toast.error('Erro ao gerar PDF.', { id: toastId });
                                                        }
                                                    }}
                                                >
                                                    <FileDown size={16} />
                                                </Button>
                                                {/* Enviar ao Cliente (RASCUNHO → ENVIADA) */}
                                                {o?.id && o.status === 'RASCUNHO' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEnviar(o.id!, o.numero)}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Enviar ao Cliente"
                                                    >
                                                        <Send size={16} />
                                                    </Button>
                                                )}
                                                {/* Aprovar (ENVIADA → ACEITA) */}
                                                {o?.id && (o.status === 'RASCUNHO' || o.status === 'ENVIADA') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleApprove(o.id!, o.numero)}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                        title="Cliente Aceitou"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                )}
                                                {/* Recusar */}
                                                {o?.id && (o.status === 'ENVIADA' || o.status === 'RASCUNHO') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleAbrirRecusa(o.id!, o.numero)}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                        title="Registrar Recusa"
                                                    >
                                                        <XCircle size={16} />
                                                    </Button>
                                                )}
                                                {/* Excluir */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => o?.id && handleDelete(o.id!, o.numero)}
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DIALOG DE RECUSA */}
            {recusaDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <XCircle size={20} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Registrar Recusa</h3>
                                <p className="text-slate-500 text-sm mt-0.5">Proposta {recusaNumero}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Motivo da Recusa</label>
                                <select
                                    value={motivoRecusa}
                                    onChange={e => setMotivoRecusa(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                                >
                                    {MOTIVOS_RECUSA.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Observações (opcional)</label>
                                <textarea
                                    value={observacaoRecusa}
                                    onChange={e => setObservacaoRecusa(e.target.value)}
                                    placeholder="Detalhes adicionais sobre a recusa..."
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setRecusaDialogOpen(false)} disabled={salvandoRecusa}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmarRecusa}
                                disabled={salvandoRecusa}
                                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                            >
                                <XCircle size={16} />
                                {salvandoRecusa ? 'Salvando...' : 'Confirmar Recusa'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
                onConfirm={confirmConfig.onConfirm}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
            />

            {selectedProposta && (
                <PDFPreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    propostaData={selectedProposta}
                    cliente={{
                        nomeRazaoSocial: selectedProposta.clienteNome,
                        enderecoObra: selectedProposta.enderecoObra
                    }}
                    empresa={empresa || undefined}
                    tenantId={profile?.tenantId}
                />
            )}
        </div>
    );
};
