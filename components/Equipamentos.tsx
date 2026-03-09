import React, { useState, useMemo } from 'react';
import { Drill, Plus, Search, Loader2, Edit2, Trash2, MoreHorizontal, Power, X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Skeleton, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Toast, Label } from './ui';
import { Equipamento } from '../types';

export const Equipamentos: React.FC = () => {
    const { user, profile } = useAuth();
    const { data: equipamentos, isLoading } = useCollection<Equipamento>('equipamentos', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [editingEquip, setEditingEquip] = useState<Partial<Equipamento> | null>(null);

    const filteredEquips = useMemo(() => {
        return equipamentos.filter(e =>
            e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.marcaModelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [equipamentos, searchTerm]);

    const handleEdit = (equip: Equipamento) => {
        setEditingEquip(equip);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEquip(null);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.tenantId || !editingEquip?.nome || !editingEquip?.tipo || !editingEquip?.marcaModelo) {
            alert("Preencha todos os campos obrigatórios");
            return;
        }

        setIsSaving(true);
        try {
            if (editingEquip.id) {
                const docRef = doc(db, 'equipamentos', editingEquip.id);
                await updateDoc(docRef, {
                    nome: editingEquip.nome,
                    tipo: editingEquip.tipo,
                    marcaModelo: editingEquip.marcaModelo,
                    status: editingEquip.status || 'Ativo',
                    operadorResponsavel: editingEquip.operadorResponsavel || '',
                    updatedAt: new Date().toISOString()
                });
                setToastMessage('Equipamento atualizado com sucesso!');
            } else {
                await addDoc(collection(db, 'equipamentos'), {
                    ...editingEquip,
                    status: editingEquip.status || 'Ativo',
                    tenantId: profile.tenantId,
                    createdAt: new Date().toISOString()
                });
                setToastMessage('Equipamento cadastrado com sucesso!');
            }

            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            handleCloseModal();
        } catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            alert('Erro ao salvar o equipamento.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fadeIn">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Drill size={24} className="text-amber-600" />
                        Máquinas e Equipamentos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Gerencie a frota de perfuratrizes e recursos em campo.</p>
                </div>
                <Button onClick={() => { handleCloseModal(); setEditingEquip({ tipo: 'HCM', status: 'Ativo' }); setIsModalOpen(true); }} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                    <Plus size={16} /> Novo Equipamento
                </Button>
            </div>

            {/* DATA TABLE */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Buscar por nome ou modelo..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Equipamento</th>
                                <th className="px-6 py-4 font-medium">Tipo / Serviço</th>
                                <th className="px-6 py-4 font-medium">Marca & Modelo</th>
                                <th className="px-6 py-4 font-medium">Status Operacional</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredEquips.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <Drill size={48} className="text-slate-300 mb-4" />
                                            <p className="text-lg font-medium text-slate-900">Nenhuma máquina cadastrada</p>
                                            <Button onClick={() => { handleCloseModal(); setEditingEquip({ tipo: 'HCM', status: 'Ativo' }); setIsModalOpen(true); }} variant="outline" className="gap-2 mt-4">
                                                <Plus size={16} /> Adicionar Máquina
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEquips.map((equip) => (
                                    <tr key={equip.id} className="bg-white hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{equip.nome}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                                                {equip.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{equip.marcaModelo}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${equip.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                                                equip.status === 'Em manutenção' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                <Power size={12} /> {equip.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="action" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(equip)} className="flex items-center gap-2">
                                                        <Edit2 size={14} /> Editar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* MODAL NOVO EQUIPAMENTO */}
            {isModalOpen && editingEquip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">{editingEquip.id ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleCloseModal}>
                                <X size={18} />
                            </Button>
                        </div>
                        <form onSubmit={onSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Identificação da Máquina *</Label>
                                        <Input
                                            placeholder="Ex: Perfuratriz 01"
                                            value={editingEquip.nome || ''}
                                            onChange={e => setEditingEquip({ ...editingEquip, nome: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Tipo de Serviço *</Label>
                                        <Select
                                            value={editingEquip.tipo || 'HCM'}
                                            onChange={e => setEditingEquip({ ...editingEquip, tipo: e.target.value as any })}
                                            required
                                        >
                                            <option value="HCM">HCM (Hélice Contínua)</option>
                                            <option value="ESC">ESC (Estaca Escavada)</option>
                                            <option value="SPT">SPT (Sondagem)</option>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <Label className="text-slate-700 font-medium md:col-span-2">Marca / Modelo *</Label>
                                    <Input
                                        placeholder="Ex: CZM EM-800"
                                        value={editingEquip.marcaModelo || ''}
                                        onChange={(e) => setEditingEquip({ ...editingEquip, marcaModelo: e.target.value })}
                                        className="md:col-span-2"
                                        required
                                    />

                                    <div>
                                        <Label className="text-slate-700 font-medium">Ano de Fabricação</Label>
                                        <Input
                                            placeholder="Ex: 2020"
                                            type="number"
                                            value={editingEquip.anoFabricacao || ''}
                                            onChange={(e) => setEditingEquip({ ...editingEquip, anoFabricacao: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-700 font-medium">Capacidade / Torque</Label>
                                        <Input
                                            placeholder="Ex: 8.000 kgfm"
                                            value={editingEquip.capacidadeTorque || ''}
                                            onChange={(e) => setEditingEquip({ ...editingEquip, capacidadeTorque: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-700 font-medium">Horímetro Inicial</Label>
                                        <Input
                                            placeholder="Ex: 5400"
                                            type="number"
                                            value={editingEquip.horimetroInicial || ''}
                                            onChange={(e) => setEditingEquip({ ...editingEquip, horimetroInicial: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-700 font-medium">Operador Padrão</Label>
                                        <Input
                                            placeholder="Nome do Operador (Opcional)"
                                            value={editingEquip.operadorPadrao || ''}
                                            onChange={(e) => setEditingEquip({ ...editingEquip, operadorPadrao: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-700 font-medium">Status Operacional</Label>
                                        <Select
                                            value={editingEquip.status || 'Ativo'}
                                            onChange={e => setEditingEquip({ ...editingEquip, status: e.target.value as any })}
                                        >
                                            <option value="Ativo">Ativo e Disponível</option>
                                            <option value="Em manutenção">Em Manutenção / Oficina</option>
                                            <option value="Inativo">Inativo / Desativado</option>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end border-t border-slate-100 pt-6">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {editingEquip.id ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {
                showToast && (
                    <Toast message={toastMessage} onClose={() => setShowToast(false)} />
                )
            }
        </div >
    );
};
