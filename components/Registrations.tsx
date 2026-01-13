import React, { useState } from 'react';
// import { usePhoenixData } from '../hooks/usePhoenixData';
import { Cliente, Fornecedor, Contrato, TipoFornecedor, MetodoExecucao } from '../types';
import { Plus, Search, Building2, Truck, FileText, User, Phone, MapPin, Briefcase, FileSignature, Edit } from 'lucide-react';

interface ClientListProps {
    onEdit: (client: Cliente) => void;
}

type SubTab = 'CLIENTES' | 'FORNECEDORES' | 'CONTRATOS' | 'EQUIPAMENTOS';

import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

const ClientList: React.FC<ClientListProps> = ({ onEdit }) => {
    const [clients, setClients] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const q = query(collection(db, 'clients'), orderBy('razaoSocial'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
            setClients(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching clients:", err);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div className="p-4 flex gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Carregando...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map(client => (
                <div key={client.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-slate-800 truncate">{client.razaoSocial}</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">Cliente</span>
                    </div>
                    <button
                        onClick={() => onEdit(client)}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar Cliente"
                    >
                        <Edit size={16} />
                    </button>
                    <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2"><Briefcase size={16} /> {client.documento || client.cnpj}</div>
                        <div className="flex items-center gap-2"><MapPin size={16} /> {client.endereco?.cidade || 'N/A'} - {client.endereco?.bairro}</div>
                    </div>
                </div>
            ))}
            {(clients || []).length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">Nenhum cliente cadastrado. Clique em Novo Cadastro.</div>
            )}
        </div>
    );
};

const SupplierList: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const q = query(collection(db, 'suppliers'), orderBy('razaoSocial'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fornecedor));
            setSuppliers(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching suppliers:", err);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div className="p-4 flex gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Carregando...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(supplier => (
                <div key={supplier.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-slate-800">{supplier.razaoSocial}</h3>
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">{supplier.tipo}</span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2"><Briefcase size={16} /> {supplier.cnpj}</div>
                        <div className="flex items-center gap-2"><MapPin size={16} /> {supplier.endereco.cidade}, {supplier.endereco.estado}</div>
                    </div>
                </div>
            ))}
            {(suppliers || []).length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">Nenhum fornecedor cadastrado.</div>
            )}
        </div>
    );
};

const ContractList: React.FC = () => {
    const [contracts, setContracts] = useState<Contrato[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const q = query(collection(db, 'contracts'), orderBy('numeroContrato'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contrato));
            setContracts(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching contracts:", err);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div className="p-4 flex gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Carregando...</div>;

    return (
        <div className="space-y-4">
            {contracts.map(contract => (
                <div key={contract.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-slate-800">{contract.numeroContrato}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-medium 
                    ${contract.status === 'ASSINADO' ? 'bg-green-100 text-green-700' :
                                    contract.status === 'EM_NEGOCIACAO' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-slate-100 text-slate-700'}`}>
                                {contract.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-slate-600 font-medium">{contract.obraNome}</p>
                        <div className="text-sm text-slate-500 mt-1 flex gap-4">
                            <span>Metódo: {contract.metodoExecucao.join(', ')}</span>
                            <span>Valor: R$ {contract.valorTotal.toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver Detalhes</button>
                </div>
            ))}
            {(contracts || []).length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">Nenhum contrato cadastrado.</div>
            )}
        </div>
    );
};

// ... (imports)
import { FleetRegistry } from './FleetRegistry';
import { NewClientModal } from './NewClientModal';

// ... (ClientList, SupplierList, ContractList remain similar or updated above)

export const Registrations: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SubTab>('CLIENTES');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Cliente | undefined>(undefined);

    const handleEditClient = (client: Cliente) => {
        setEditingClient(client);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingClient(undefined);
    };

    // Hooks for adding data
    // const { add: addClient } = usePhoenixData('clients');
    // const { add: addSupplier } = usePhoenixData('suppliers');

    const handleSaveNew = async (item: any) => {
        if (activeTab === 'CLIENTES') {
            // NewClientModal already saves to DB. 
        } else if (activeTab === 'FORNECEDORES') {
            try {
                // Ensure Supplier has required fields
                const newSupplier = { ...item, tipo: 'MATERIAL' }; // Default or from form
                await addDoc(collection(db, 'suppliers'), newSupplier);
            } catch (e) {
                console.error("Error saving supplier", e);
                alert("Erro ao salvar fornecedor");
            }
        }
        handleCloseModal();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cadastros</h1>
                    <p className="text-slate-500">Gerencie clientes, fornecedores e contratos</p>
                </div>
                <button
                    onClick={() => { setEditingClient(undefined); setShowModal(true); }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={20} />
                    <span>Novo Cadastro</span>
                </button>
            </header>

            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                <button
                    onClick={() => setActiveTab('CLIENTES')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'CLIENTES' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Building2 size={16} /> Clientes
                </button>
                <button
                    onClick={() => setActiveTab('FORNECEDORES')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'FORNECEDORES' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Truck size={16} /> Fornecedores
                </button>
                <button
                    onClick={() => setActiveTab('CONTRATOS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'CONTRATOS' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <FileSignature size={16} /> Contratos
                </button>
                <button
                    onClick={() => setActiveTab('EQUIPAMENTOS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'EQUIPAMENTOS' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Truck size={16} /> Equipamentos
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'CLIENTES' && <ClientList onEdit={handleEditClient} />}
                {activeTab === 'FORNECEDORES' && <SupplierList />}
                {activeTab === 'CONTRATOS' && <ContractList />}
                {activeTab === 'EQUIPAMENTOS' && <FleetRegistry />}
            </div>

            {showModal && activeTab === 'CLIENTES' && (
                <NewClientModal onClose={handleCloseModal} onSave={handleSaveNew} initialClient={editingClient} />
            )}
            {/* TODO: Create NewSupplierModal. reusing ClientModal for now as fallback if compatible or just placeholder */}
            {showModal && activeTab === 'FORNECEDORES' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl">
                        <h2 className="text-xl font-bold mb-4">Novo Fornecedor</h2>
                        <p className="text-slate-500 mb-4">Funcionalidade em desenvolvimento.</p>
                        <button onClick={() => setShowModal(false)} className="bg-slate-200 px-4 py-2 rounded">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
