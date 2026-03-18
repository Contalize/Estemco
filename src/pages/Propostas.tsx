import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Proposta, StatusProposta } from '../../types';

import { Button, Input, Select, Toast, ConfirmDialog } from '../../components/ui';
import { FileText, Plus, Search, Eye, FileDown, Trash2, Edit, CheckCircle2 } from 'lucide-react';
import { formatarData } from '../utils/formatDate';
import { PDFPreviewModal } from '../../components/PDFPreviewModal';
import { excluirProposta } from '../services/propostaService';

interface PropostasListProps {
    onNavigate: (tab: any) => void;
}

export const Propostas: React.FC<PropostasListProps> = ({ onNavigate }) => {
    const { profile } = useAuth();
    const [propostas, setPropostas] = useState<Proposta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProposta, setSelectedProposta] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [busca, setBusca] = useState('');

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

    useEffect(() => {
        if (!profile?.tenantId) return;

        const q = query(
            collection(db, 'empresas', profile.tenantId, 'propostas'),
            orderBy('criadoEm', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposta));
            setPropostas(data);
            setLoading(false);
        });

        return () => unsub();
    }, [profile]);

    const handleDelete = async (id: string, numero: string) => {
        const confirmacao = window.confirm(`Atenção: Tem certeza que deseja excluir a proposta ${numero}? Esta ação não pode ser desfeita.`);
        if (!confirmacao) return;

        try {
            if (!profile?.tenantId) return;
            await excluirProposta(profile.tenantId, id);
            window.alert('Proposta excluída com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir proposta.');
        }
    };

    const handleApprove = (id: string, numero: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Aprovar Proposta',
            message: `Aprovar a proposta ${numero}? Ela passará a ter status de Aprovada.`,
            variant: 'primary',
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, 'empresas', profile!.tenantId, 'propostas', id), {
                        status: 'ACEITA'
                    });
                } catch (err) {
                    alert('Erro ao aprovar proposta.');
                }
            }
        });
    };
    
    const handlePreview = (proposta: Proposta) => {
        setSelectedProposta(proposta);
        setShowPreview(true);
    };

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
                                <th className="px-6 py-4">Equipamento</th>
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
                            {filtered.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3 font-bold text-slate-700">{o.numero}</td>
                                    <td className="px-6 py-3 text-slate-600 truncate max-w-[150px]">{o.clienteNome}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded font-mono text-xs font-bold border ${getTypeColor(o.tipo)}`}>
                                            {o.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 text-sm truncate max-w-[150px]">{o.enderecoObra?.cidade || '-'}</td>
                                    <td className="px-6 py-3 font-mono font-medium text-slate-700">R$ {o.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-3">{getStatusBadge(o.status)}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">
                                        {o.criadoEm ? formatarData(o.criadoEm) : 'Hoje'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600" 
                                                title="Visualizar" 
                                                onClick={() => o?.id && handlePreview(o)}
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600" 
                                                title="Editar" 
                                                onClick={() => o?.id && onNavigate({ tab: 'quote', propostaId: o.id, mode: 'edit' })}
                                            >
                                                <Edit size={16} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600" 
                                                title="Gerar PDF" 
                                                onClick={() => o?.id && handlePreview(o)}
                                            >
                                                <FileDown size={16} />
                                            </Button>
                                            {o?.id && o.status !== 'ACEITA' && o.status !== 'RECUSADA' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleApprove(o.id!, o.numero)} 
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" 
                                                    title="Aprovar Diretamente"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </Button>
                                            )}
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
                    empresa={{
                        razaoSocial: profile?.nomeEmpresa || 'Estemco Engenharia',
                        cnpj: profile?.cnpjEmpresa || '57.486.102/0001-86'
                    }}
                />
            )}
        </div>
    );
};
