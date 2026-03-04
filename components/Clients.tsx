import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Loader2, Building2, User, X, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Skeleton, DropdownMenu, DropdownMenuItem } from './ui';
import { ClientForm, ClientFormData } from './ClientForm';

export const Clients: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: clientes, isLoading } = useCollection<any>('clientes', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingClient, setEditingClient] = useState<Partial<ClientFormData> | null>(null);
  const itemsPerPage = 10;

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => 
      c.nomeRazaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documento?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditClient = (cliente: any) => {
    setEditingClient({
      id: cliente.id,
      tipoPessoa: cliente.tipoPessoa || 'PJ',
      nomeRazaoSocial: cliente.nomeRazaoSocial || '',
      documento: cliente.documento || '',
      nomeFantasia: cliente.nomeFantasia || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cep: cliente.cep || '',
      endereco: cliente.endereco || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || '',
      enderecoFaturamento: cliente.enderecoFaturamento || '',
      contatos: cliente.contatos || []
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!user || !profile?.tenantId) return;
    setIsSaving(true);
    try {
      if (editingClient?.id) {
        const clientRef = doc(db, 'clientes', editingClient.id);
        await updateDoc(clientRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
        setToastMessage('Cliente atualizado com sucesso!');
      } else {
        const newClient = {
          ...data,
          status: 'Ativo',
          tenantId: profile.tenantId,
          createdByUserId: user.uid,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'clientes'), newClient);
        setToastMessage('Cliente salvo com sucesso!');
      }
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar o cliente.');
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
            <Users size={24} className="text-indigo-600" />
            Gestão de Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-1">Cadastre e gerencie a sua carteira de clientes.</p>
        </div>
        <Button onClick={() => { handleCloseModal(); setIsModalOpen(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} /> Novo Cliente
        </Button>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por nome, documento ou email..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Nome / Razão Social</th>
                <th className="px-6 py-4 font-medium">Documento</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Users size={48} className="text-slate-300 mb-4" />
                      <p className="text-lg font-medium text-slate-900">Nenhum cliente encontrado</p>
                      <p className="text-sm mt-1 mb-4">Comece adicionando o seu primeiro cliente para gerar propostas.</p>
                      <Button onClick={() => { handleCloseModal(); setIsModalOpen(true); }} variant="outline" className="gap-2">
                        <Plus size={16} /> Adicionar Cliente
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClientes.map((cliente) => (
                  <tr key={cliente.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {cliente.tipoPessoa === 'PJ' ? <Building2 size={14} className="text-slate-400" /> : <User size={14} className="text-slate-400" />}
                        {cliente.nomeRazaoSocial}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{cliente.documento}</td>
                    <td className="px-6 py-4 text-slate-600">{cliente.email || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{cliente.telefone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cliente.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {cliente.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 bg-white border-slate-200">
                          <MoreVertical size={16} />
                        </Button>
                      }>
                        <DropdownMenuItem onClick={() => handleEditClient(cliente)} className="flex items-center gap-2">
                          <Edit2 size={14} /> Editar Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 size={14} /> Excluir Cliente
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
        {!isLoading && filteredClientes.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredClientes.length)}</span> de <span className="font-medium">{filteredClientes.length}</span> clientes
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium text-slate-700 px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL NOVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={handleCloseModal}>
                <X size={18} />
              </Button>
            </div>
            
            <ClientForm 
              initialData={editingClient || undefined}
              onSubmit={onSubmit}
              onCancel={handleCloseModal}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
