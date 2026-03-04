import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, Loader2, ShieldAlert, CheckCircle2, X, Mail, Shield } from 'lucide-react';
import { collection, addDoc, query, where, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { Card, Button, Input, Label, Select, Skeleton } from './ui';

type InviteFormData = {
  email: string;
  role: UserRole;
};

export const Team: React.FC = () => {
  const { user, profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch active users for this tenant
  const { data: teamMembers, isLoading: loadingMembers } = useCollection<any>('users', 
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  // Fetch pending invitations for this tenant
  const { data: invitations, isLoading: loadingInvites } = useCollection<any>('invitations',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>({
    defaultValues: {
      role: 'Engenheiro'
    }
  });

  const onSubmit = async (data: InviteFormData) => {
    if (!user || !profile?.tenantId) return;
    setIsSaving(true);
    try {
      // Create invitation document
      await addDoc(collection(db, 'invitations'), {
        email: data.email.toLowerCase(),
        role: data.role,
        tenantId: profile.tenantId,
        invitedBy: user.uid,
        createdByUserId: user.uid,
        status: 'Pendente',
        createdAt: Timestamp.now()
      });
      
      setToastMessage(`Convite enviado para ${data.email}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      alert('Erro ao enviar o convite.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;
    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
    }
  };

  if (profile?.role !== 'Administrador') {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert size={64} className="text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md">
          Apenas administradores podem gerenciar a equipe e os níveis de acesso. 
          Seu nível atual é <strong className="text-slate-700">{profile?.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield size={24} className="text-indigo-600" />
            Gestão de Equipe e Acessos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os membros da sua empresa e seus níveis de permissão.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} /> Convidar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIVE MEMBERS */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Membros Ativos</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loadingMembers ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            ) : teamMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum membro ativo encontrado.</div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                      {member.nome ? member.nome.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{member.nome || 'Usuário'}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    member.role === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    member.role === 'Comercial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* PENDING INVITATIONS */}
        <Card className="overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Convites Pendentes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loadingInvites ? (
              <div className="p-4"><Skeleton className="h-12 w-full" /></div>
            ) : invitations.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Nenhum convite pendente.</div>
            ) : (
              invitations.map((invite) => (
                <div key={invite.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 truncate">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{invite.email}</span>
                    </div>
                    <button onClick={() => handleCancelInvite(invite.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Papel: {invite.role}</span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Aguardando</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* MODAL CONVITE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Convidar Novo Membro</h2>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            
            <div className="p-6">
              <form id="invite-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label>Email do Usuário</Label>
                  <Input type="email" placeholder="nome@empresa.com" {...register('email', { required: true })} />
                  {errors.email && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                </div>
                
                <div>
                  <Label>Nível de Acesso (Papel)</Label>
                  <Select {...register('role', { required: true })}>
                    <option value="Administrador">Administrador / Sócio (Acesso Total)</option>
                    <option value="Comercial">Comercial (Propostas e Clientes)</option>
                    <option value="Engenheiro">Engenheiro / Obra (Execução e Medição)</option>
                  </Select>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 space-y-2">
                  <p><strong>Dica:</strong> O usuário receberá um convite. Assim que ele criar uma conta com este email, será automaticamente vinculado à sua empresa com as permissões definidas.</p>
                </div>
              </form>
            </div>
            
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" form="invite-form" disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isSaving ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
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
