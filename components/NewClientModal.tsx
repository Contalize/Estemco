import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Loader2, User, Building2, AlertTriangle } from 'lucide-react';
import { Cliente } from '../types';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { usePhoenixData } from '../hooks/usePhoenixData';

interface NewClientModalProps {
    onClose: () => void;
    onSave: (client: Cliente) => void;
    initialClient?: Cliente;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ onClose, onSave, initialClient }) => {
    const { addClient, updateClient } = usePhoenixData();
    // Universal Input
    const [documento, setDocumento] = useState('');
    const [docType, setDocType] = useState<'CPF' | 'CNPJ' | null>(null);

    // Form Data
    const [name, setName] = useState(''); // Razão Social or Nome Completo
    const [tradeName, setTradeName] = useState(''); // Nome Fantasia
    const [rg, setRg] = useState('');
    const [inscricaoEstadual, setInscricaoEstadual] = useState(''); // Added field for PJ
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Address
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [complement, setComplement] = useState('');

    const [loading, setLoading] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill Data for Editing
    useEffect(() => {
        if (initialClient) {
            setDocumento(initialClient.documento);
            setDocType(initialClient.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF');
            setName(initialClient.razaoSocial);
            setTradeName(initialClient.nomeFantasia || '');
            setRg(initialClient.rg || '');
            setInscricaoEstadual(initialClient.inscricaoEstadual || '');
            setEmail(initialClient.email);
            setPhone(initialClient.telefone);

            setCep(initialClient.endereco.cep);
            setStreet(initialClient.endereco.logradouro);
            setNumber(initialClient.endereco.numero);
            setNeighborhood(initialClient.endereco.bairro);
            setCity(initialClient.endereco.cidade);
            setState(initialClient.endereco.estado);
            setComplement(initialClient.endereco.complemento || '');
        }
    }, [initialClient]);

    // Logic: Auto-detect type
    const handleDocChange = (val: string) => {
        const clean = val.replace(/\D/g, '');
        setDocumento(val);

        if (clean.length > 11) setDocType('CNPJ');
        else if (clean.length > 0) setDocType('CPF');
        else setDocType(null);
    };

    const searchCNPJ = async () => {
        const clean = documento.replace(/\D/g, '');
        if (clean.length !== 14) { setError("CNPJ inválido (14 dígitos)"); return; }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
            if (!res.ok) throw new Error("Erro na consulta API");
            const data = await res.json();

            setName(data.razao_social);
            setTradeName(data.nome_fantasia);
            setEmail(data.email || '');
            setPhone(data.ddd_telefone_1 || '');

            // Auto fill address
            setCep(data.cep);
            setStreet(data.logradouro);
            setNumber(data.numero);
            setNeighborhood(data.bairro);
            setCity(data.municipio);
            setState(data.uf);
            setComplement(data.complemento);

        } catch (err) {
            setError("Empresa não encontrada.");
        } finally {
            setLoading(false);
        }
    };

    const searchCEP = async (cepValue: string = cep) => {
        const clean = cepValue.replace(/\D/g, '');
        if (clean.length !== 8) return; // Silent return if not valid yet, or maybe specific error if triggered by button

        setLoadingCep(true);
        setError('');
        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            if (!res.ok) throw new Error("Erro na consulta API");
            const data = await res.json();

            if (data.erro) {
                setError("CEP não encontrado.");
                return;
            }

            setStreet(data.logradouro);
            setNeighborhood(data.bairro);
            setCity(data.localidade);
            setState(data.uf);
            // Optional: focus number field?
        } catch (err) {
            setError("Erro ao buscar CEP.");
        } finally {
            setLoadingCep(false);
        }
    };

    const handleSaveInternal = async () => {
        if (!name || !documento) { setError("Preencha os campos obrigatórios (Nome/Documento)."); return; }

        setLoading(true);
        setError('');

        try {
            const cleanDoc = documento.replace(/\D/g, '');

            // 1. Check Duplicates (Robust)
            const q = query(collection(db, 'clients'), where('documento', '==', cleanDoc)); // Ensure 'documento' is indexed/searchable
            const snap = await getDocs(q);

            if (!snap.empty) {
                setError("Este cliente já está cadastrado!");
                setLoading(false);
                return;
            }

            const newClient: Cliente = {
                id: '', // Will be set by Firestore or ignored
                tipoPessoa: docType === 'CPF' ? 'PF' : 'PJ',
                documento: cleanDoc,
                cnpj: cleanDoc, // Legacy compatibility
                rg: docType === 'CPF' ? rg : null,
                inscricaoEstadual: docType === 'CNPJ' ? inscricaoEstadual : null,
                razaoSocial: name,
                nomeFantasia: tradeName,
                email,
                telefone: phone,
                endereco: {
                    cep, logradouro: street, numero: number, bairro: neighborhood, cidade: city, estado: state, complemento: complement
                },
                enderecoFaturamento: `${street}, ${number} - ${neighborhood}, ${city}/${state}`, // Simple default
                contatos: [],
                createdAt: new Date().toISOString()
            };

            // PHOENIX PROTOCOL HOOK
            let clientWithId;
            if (initialClient) {
                // Update
                const updateData = { ...newClient };
                delete (updateData as any).id; // Don't save ID inside doc
                delete (updateData as any).createdAt; // Preserve creation date

                await updateClient.mutateAsync({ id: initialClient.id, data: updateData });
                clientWithId = { ...newClient, id: initialClient.id };
            } else {
                // Create
                const ref = await addClient.mutateAsync(newClient);
                clientWithId = { ...newClient, id: ref.id };
            }

            onSave(clientWithId);
            onClose();

        } catch (err: any) {
            console.error(err);
            setError("Erro ao salvar: " + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center gap-2">
                        {docType === 'CPF' ? <User size={20} /> : <Building2 size={20} />}
                        {initialClient ? 'Editar Cliente' : 'Novo Cliente'} {docType ? `(${docType})` : ''}
                    </h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">

                    {/* Identification */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Documento (CPF / CNPJ)</label>
                        <div className="flex gap-2">
                            <input
                                value={documento}
                                onChange={e => handleDocChange(e.target.value)}
                                className="flex-1 p-2 border rounded text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Digite apenas números..."
                                autoFocus
                            />
                            {docType === 'CNPJ' && (
                                <button onClick={searchCNPJ} disabled={loading} className="bg-blue-100 text-blue-700 px-4 rounded font-bold hover:bg-blue-200">
                                    {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">O sistema detecta automaticamente Pessoa Física ou Jurídica.</p>
                    </div>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    {docType === 'CPF' ? 'Nome Completo' : 'Razão Social'}
                                </label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" />
                            </div>

                            {docType === 'CPF' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">RG</label>
                                    <input value={rg} onChange={e => setRg(e.target.value)} className="w-full p-2 border rounded" />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome Fantasia</label>
                                        <input value={tradeName} onChange={e => setTradeName(e.target.value)} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Inscrição Estadual</label>
                                        <input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} className="w-full p-2 border rounded" placeholder="Isento" />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" type="email" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                        </div>

                        {/* Address Block */}
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                            <h4 className="text-xs font-black text-slate-400 uppercase border-b pb-1">Endereço Principal</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1 relative">
                                    <input
                                        value={cep}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            setCep(v);
                                            if (v.length === 8) searchCEP(v);
                                        }}
                                        placeholder="CEP"
                                        className="w-full p-2 pr-8 border rounded text-xs"
                                    />
                                    <button
                                        onClick={() => searchCEP()}
                                        disabled={loadingCep}
                                        className="absolute right-1 top-1 p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                                        title="Buscar CEP"
                                    >
                                        {loadingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    </button>
                                </div>
                                <div className="col-span-2">
                                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" className="w-full p-2 border rounded text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua/Av" className="w-full p-2 border rounded text-xs" />
                                </div>
                                <div className="col-span-1">
                                    <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Nº" className="w-full p-2 border rounded text-xs" />
                                </div>
                            </div>
                            <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Bairro" className="w-full p-2 border rounded text-xs" />
                            <div className="grid grid-cols-2 gap-2">
                                <input value={state} onChange={e => setState(e.target.value)} placeholder="UF" className="w-full p-2 border rounded text-xs" />
                                <input value={complement} onChange={e => setComplement(e.target.value)} placeholder="Complemento" className="w-full p-2 border rounded text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-100 border-t flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
                    <button
                        onClick={handleSaveInternal}
                        disabled={loading || !name}
                        className="px-6 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                        Salvar Cliente
                    </button>
                </div>
            </div>
        </div>
    );
};
