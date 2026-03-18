import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Input, Label, Select } from '../../../components/ui';
import { Search, Loader2, Copy } from 'lucide-react';

interface Step2Props {
    data: any;
    updateData: (d: any) => void;
}

export const Step2ClienteObra: React.FC<Step2Props> = ({ data, updateData }) => {
    const { profile } = useAuth();
    const [clientes, setClientes] = useState<any[]>([]);
    const [isSearchingCep, setIsSearchingCep] = useState(false);
    const [usarMesmoEndereco, setUsarMesmoEndereco] = useState(false);
    const [cepInput, setCepInput] = useState('');

    useEffect(() => {
        if (!profile?.tenantId) return;
        const fetchClientes = async () => {
            const q = query(collection(db, 'clientes'), where('tenantId', '==', profile.tenantId));
            const snap = await getDocs(q);
            const cls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClientes(cls);
        };
        fetchClientes();
    }, [profile]);

    const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const cl = clientes.find(c => c.id === id);
        if (cl) {
            updateData({ clienteId: id, clienteNome: cl.nomeRazaoSocial });
            // If toggle is active, also fill obra address from client registration
            if (usarMesmoEndereco) {
                updateData({
                    clienteId: id,
                    clienteNome: cl.nomeRazaoSocial,
                    enderecoObra: {
                        logradouro: cl.endereco || '',
                        numero: cl.numero || '',
                        bairro: cl.bairro || '',
                        cidade: cl.cidade || '',
                        estado: cl.uf || '',
                        cep: cl.cep || ''
                    }
                });
            }
        } else {
            updateData({ clienteId: '', clienteNome: '' });
        }
    };

    const handleToggleMesmoEndereco = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setUsarMesmoEndereco(checked);
        if (checked && data.clienteId) {
            const cl = clientes.find(c => c.id === data.clienteId);
            if (cl) {
                updateData({
                    enderecoObra: {
                        logradouro: cl.endereco || '',
                        numero: cl.numero || '',
                        bairro: cl.bairro || '',
                        cidade: cl.cidade || '',
                        estado: cl.uf || '',
                        cep: cl.cep || ''
                    }
                });
                setCepInput(cl.cep || '');
            }
        }
    };

    const handleSearchCep = async () => {
        const clean = cepInput.replace(/\D/g, '');
        if (clean.length !== 8) return alert('CEP inválido. Digite 8 dígitos.');
        setIsSearchingCep(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`);
            if (!res.ok) throw new Error('CEP não encontrado');
            const d = await res.json();
            updateData({
                enderecoObra: {
                    ...data.enderecoObra,
                    logradouro: d.street || '',
                    bairro: d.neighborhood || '',
                    cidade: d.city || '',
                    estado: d.state || '',
                    cep: clean,
                }
            });
        } catch {
            alert('CEP não encontrado. Preencha o endereço manualmente.');
        } finally {
            setIsSearchingCep(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Cliente e Obra</h2>
                <p className="text-slate-500">Preencha quem é o contratante e onde o serviço será executado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Label className="font-bold text-slate-700">Contratante</Label>
                    <Select value={data.clienteId} onChange={handleClienteChange} className="w-full">
                        <option value="">Selecione um cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nomeRazaoSocial} ({c.documento})</option>
                        ))}
                    </Select>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <Label className="font-bold text-slate-700">Endereço da Obra</Label>
                            {/* "Same address" shortcut */}
                            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={usarMesmoEndereco}
                                    onChange={handleToggleMesmoEndereco}
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                <Copy size={12} />
                                Mesmo endereço do cadastro
                            </label>
                        </div>

                        {/* CEP Search Row */}
                        <div className="flex gap-2 mb-3">
                            <Input
                                placeholder="CEP (somente números)"
                                value={cepInput}
                                maxLength={9}
                                onChange={e => setCepInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchCep()}
                                disabled={usarMesmoEndereco}
                                className="flex-1"
                            />
                            <button
                                type="button"
                                onClick={handleSearchCep}
                                disabled={isSearchingCep || usarMesmoEndereco}
                                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                            >
                                {isSearchingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                Buscar
                            </button>
                        </div>

                        <div className="space-y-3">
                            <Input
                                placeholder="Rua, Avenida, Estrada..."
                                value={data.enderecoObra.logradouro}
                                disabled={usarMesmoEndereco}
                                onChange={e => updateData({ enderecoObra: { ...data.enderecoObra, logradouro: e.target.value } })}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    placeholder="Número/Km"
                                    value={data.enderecoObra.numero}
                                    disabled={usarMesmoEndereco}
                                    onChange={e => updateData({ enderecoObra: { ...data.enderecoObra, numero: e.target.value } })}
                                />
                                <Input
                                    placeholder="Bairro"
                                    value={data.enderecoObra.bairro}
                                    disabled={usarMesmoEndereco}
                                    onChange={e => updateData({ enderecoObra: { ...data.enderecoObra, bairro: e.target.value } })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    placeholder="Cidade"
                                    value={data.enderecoObra.cidade}
                                    disabled={usarMesmoEndereco}
                                    onChange={e => updateData({ enderecoObra: { ...data.enderecoObra, cidade: e.target.value } })}
                                />
                                <Input
                                    placeholder="UF"
                                    value={data.enderecoObra.estado}
                                    maxLength={2}
                                    disabled={usarMesmoEndereco}
                                    onChange={e => updateData({ enderecoObra: { ...data.enderecoObra, estado: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="font-bold text-slate-700">Condições da Proposta</Label>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Dias Execução</Label>
                                <Input
                                    type="number"
                                    value={data.diasExecucao}
                                    onChange={e => updateData({ diasExecucao: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Previsão de Início</Label>
                                <Input
                                    type="date"
                                    value={data.dataPrevistaInicio}
                                    onChange={e => updateData({ dataPrevistaInicio: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Validade da Proposta (Dias Úteis)</Label>
                            <Input
                                type="number"
                                value={data.validadeProposta}
                                onChange={e => updateData({ validadeProposta: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Observações de Engenharia</Label>
                            <textarea
                                className="w-full h-32 px-3 py-2 border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                                placeholder="Ex: Obra com restrição de horário; Existência de fiação próxima..."
                                value={data.observacoes}
                                onChange={e => updateData({ observacoes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
