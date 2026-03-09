import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Plus, Loader2, ShieldAlert, X, Mail, Shield, Check, Activity, Settings2, Copy } from 'lucide-react';
import { collection, addDoc, query, where, deleteDoc, doc, Timestamp, updateDoc, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Label, Select, Skeleton, Toast } from './ui';
import { handleFirestoreError, OperationType } from '../src/firebase/firestore/error-handler';
import { defaultPermissions } from '../contexts/AuthContext';
import { PermissionsMap, AuditLog } from '../types';

const inviteSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Campo obrigatório'),
  role: z.enum(['Administrador', 'Comercial', 'Engenheiro']),
});
type InviteFormData = z.infer<typeof inviteSchema>;

/* ─────────────────────────────────────────────
   UI COMPONENTS
───────────────────────────────────────────── */
const Switch = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'
        }`}
    />
  </button>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export const Team: React.FC = () => {
  const { user, profile } = useAuth();

  // Modals & Setup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'default' | 'destructive' | 'success'>('default');

  // Selected User Panel
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'permissoes' | 'atividade'>('permissoes');

  // Local Permissions State (used for editing/saving)
  const [localPerms, setLocalPerms] = useState<any>(null);

  // Invite Form Local Permissions State
  const [invitePerms, setInvitePerms] = useState<any>(defaultPermissions['Engenheiro']);
  const [showCustomInvitePerms, setShowCustomInvitePerms] = useState(false);

  // Audit Logs cache
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Data fetching
  const { data: teamMembers, isLoading: loadingMembers } = useCollection<any>('users',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );
  const { data: invitations, isLoading: loadingInvites } = useCollection<any>('invitations',
    profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []
  );

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'Engenheiro' }
  });

  const selectedRole = watch('role');

  // Watch role changes to update default perms in modal
  useEffect(() => {
    if (selectedRole) {
      setInvitePerms(JSON.parse(JSON.stringify(defaultPermissions[selectedRole as keyof typeof defaultPermissions])));
    }
  }, [selectedRole]);

  // When a user is selected, load their permissions (or default fallback)
  useEffect(() => {
    if (selectedUser) {
      setLocalPerms(JSON.parse(JSON.stringify(selectedUser.permissoes || defaultPermissions[selectedUser.role as keyof typeof defaultPermissions])));

      if (activeTab === 'atividade') {
        fetchUserLogs(selectedUser.id);
      }
    }
  }, [selectedUser, activeTab]);

  const fetchUserLogs = async (userId: string) => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'audit_log'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setUserLogs(logs);
    } catch (err) {
      console.error("Erro ao buscar logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const showNotification = (msg: string, variant: 'success' | 'destructive' = 'success') => {
    setToastMessage(msg);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const onSubmitInvite = async (data: InviteFormData) => {
    if (!user || !profile?.tenantId) return;
    setIsSaving(true);
    try {
      const path = 'invitations';
      await addDoc(collection(db, path), {
        email: data.email.toLowerCase(),
        role: data.role,
        tenantId: profile.tenantId,
        invitedBy: user.uid,
        createdByUserId: user.uid,
        status: 'Pendente',
        permissoes: invitePerms,
        createdAt: Timestamp.now()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, path));

      showNotification(`Convite enviado para ${data.email}`);
      setIsModalOpen(false);
      reset();
      setShowCustomInvitePerms(false);
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showNotification('Erro ao enviar o convite.', 'destructive');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;
    const path = `invitations/${inviteId}`;
    try {
      await deleteDoc(doc(db, 'invitations', inviteId)).catch(err => handleFirestoreError(err, OperationType.DELETE, path));
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      showNotification('Erro ao cancelar o convite.', 'destructive');
    }
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        permissoes: localPerms
      });
      showNotification('Permissões atualizadas com sucesso!');

      // Update local state instance so changes show immediately without reselecting
      setSelectedUser({ ...selectedUser, permissoes: localPerms });

    } catch (err) {
      console.error('Error saving perms', err);
      showNotification('Erro ao salvar permissões.', 'destructive');
    } finally {
      setIsSaving(false);
    }
  };

  if (profile?.role !== 'Administrador') {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert size={64} className="text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md">
          Apenas administradores podem gerenciar a equipe e os níveis de acesso.
        </p>
      </div>
    );
  }

  // Perm Map Helper for UI Generation
  const modulesMap = [
    { key: 'dashboard', label: 'Dashboard', perms: ['ver'] },
    { key: 'orcamento', label: 'Orçamentos', perms: ['ver', 'criar', 'editar', 'aprovar'] },
    { key: 'clientes', label: 'Clientes', perms: ['ver', 'criar', 'editar', 'excluir'] },
    { key: 'obras', label: 'Gestão de Obras', perms: ['ver', 'editar', 'mudarStatus'] },
    { key: 'boletim', label: 'Boletim (BDO)', perms: ['ver', 'criar', 'editar'] },
    { key: 'dre', label: 'DRE Financeiro', perms: ['ver'] },
    { key: 'financeiro', label: 'Financeiro', perms: ['ver', 'lancar'] },
    { key: 'calendario', label: 'Calendário', perms: ['ver'] },
    { key: 'configuracoes', label: 'Configurações', perms: ['ver', 'editar'] },
  ];

  const renderPermissionsTable = (permsObj: any, setPermsObj: (newObj: any) => void) => {
    if (!permsObj) return null;

    const togglePerm = (mod: string, perm: string, currentVal: boolean) => {
      const newPerms = { ...permsObj };
      if (!newPerms[mod]) newPerms[mod] = {};
      newPerms[mod][perm] = !currentVal;
      setPermsObj(newPerms);
    };

    return (
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 w-1/3">MÓDULO</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">VER</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">CRIAR/LANÇAR</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">EDITAR</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">EXCLUIR/APROVAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {modulesMap.map(mod => {
              const modPerms = permsObj[mod.key] || {};
              // Mapping logic to columns
              const hasVer = mod.perms.includes('ver');
              const hasCriar = mod.perms.includes('criar') || mod.perms.includes('lancar');
              const hasEditar = mod.perms.includes('editar') || mod.perms.includes('mudarStatus');
              const hasAprovar = mod.perms.includes('aprovar') || mod.perms.includes('excluir');

              const criarKey = mod.perms.includes('lancar') ? 'lancar' : 'criar';
              const editarKey = mod.perms.includes('mudarStatus') ? 'mudarStatus' : 'editar';
              const aprovarKey = mod.perms.includes('excluir') ? 'excluir' : 'aprovar';

              return (
                <tr key={mod.key} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{mod.label}</td>
                  <td className="px-4 py-3 text-center">
                    {hasVer ? <Switch checked={!!modPerms['ver']} onChange={() => togglePerm(mod.key, 'ver', !!modPerms['ver'])} /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center bg-slate-50/30">
                    {hasCriar ? <Switch checked={!!modPerms[criarKey]} onChange={() => togglePerm(mod.key, criarKey, !!modPerms[criarKey])} /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasEditar ? <Switch checked={!!modPerms[editarKey]} onChange={() => togglePerm(mod.key, editarKey, !!modPerms[editarKey])} /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center bg-slate-50/30">
                    {hasAprovar ? <Switch checked={!!modPerms[aprovarKey]} onChange={() => togglePerm(mod.key, aprovarKey, !!modPerms[aprovarKey])} /> : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 animate-fadeIn h-full flex flex-col">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield size={24} className="text-indigo-600" />
            Gestão de Equipe e Acessos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure permissões precisas por módulo para sua equipe.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} /> Convidar Membro
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px]">
        {/* LEFT PANEL: LIST */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0">

          <Card className="flex-1 flex flex-col overflow-hidden max-h-[800px]">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Membros Ativos ({teamMembers?.length || 0})</span>
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingMembers ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div>
                ))
              ) : teamMembers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum membro ativo.</div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedUser(member)}
                    className={`p-4 flex flex-col gap-3 cursor-pointer transition-colors border-l-4 ${selectedUser?.id === member.id ? 'bg-indigo-50/50 border-indigo-600' : 'border-transparent hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${selectedUser?.id === member.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {member.nome ? member.nome.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-slate-900 truncate">{member.nome || 'Usuário'}</p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-13">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${member.role === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        member.role === 'Comercial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        {member.role}
                      </span>
                      <span className="text-xs text-indigo-600 font-medium whitespace-nowrap hidden sm:block opacity-0 group-hover:opacity-100">Configurar →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Convites Panel (Smaller view below) */}
          <Card className="shrink-0 max-h-[300px] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="font-semibold text-sm text-slate-800">Convites Pendentes</h3>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100">
              {loadingInvites ? null : invitations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Nenhum convite pendente.</div>
              ) : (
                invitations.map((invite) => (
                  <div key={invite.id} className="p-3 text-sm flex items-center justify-between group">
                    <div className="truncate shrink">
                      <p className="text-slate-900 font-medium truncate flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {invite.email}</p>
                      <p className="text-slate-500 text-xs mt-0.5 ml-4">{invite.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button title="Copiar Link de Acesso" onClick={() => {
                        const link = `${window.location.origin}?invite=${invite.id}`;
                        navigator.clipboard.writeText(link);
                        showNotification('Link copiado para a área de transferência!', 'success');
                      }} className="text-slate-400 hover:text-indigo-600 shrink-0 p-1 rounded-md hover:bg-slate-100 transition-colors">
                        <Copy size={16} />
                      </button>
                      <button title="Cancelar Convite" onClick={() => handleCancelInvite(invite.id)} className="text-slate-400 hover:text-red-500 shrink-0 p-1 rounded-md hover:bg-red-50 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: DETAILS */}
        <div className="flex-1 flex flex-col">
          {!selectedUser ? (
            <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50/50 border-dashed">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Settings2 size={24} className="text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-700">Selecione um membro</p>
              <p className="text-sm mt-1 max-w-sm">Clique em um membro da lista à esquerda para verificar sua folha de permissões e log de atividades.</p>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* DETAILS HEADER */}
              <div className="p-6 bg-slate-900 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Shield size={120} />
                </div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="h-20 w-20 rounded-2xl bg-white text-indigo-900 flex items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-white/10">
                    {selectedUser.nome ? selectedUser.nome.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedUser.nome || 'Usuário do Sistema'}</h2>
                    <p className="text-indigo-200 mt-1">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-3">
                      <span className="px-2.5 py-1 rounded bg-white/20 text-white text-xs font-semibold uppercase tracking-wider">
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABS HEADER */}
              <div className="flex items-center border-b border-slate-200 px-6 shrink-0 bg-slate-50/80">
                <button
                  onClick={() => setActiveTab('permissoes')}
                  className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'permissoes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                  <Shield size={16} /> Permissões
                </button>
                <button
                  onClick={() => setActiveTab('atividade')}
                  className={`px-4 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'atividade' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                  <Activity size={16} /> Atividade
                </button>
              </div>

              {/* TABS CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {activeTab === 'permissoes' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Direitos de Acesso</h3>
                        <p className="text-sm text-slate-500">Defina exatamente o que {selectedUser.nome || 'este usuário'} pode realizar dentro do ERP.</p>
                      </div>
                      <Button onClick={savePermissions} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
                      </Button>
                    </div>

                    {renderPermissionsTable(localPerms, setLocalPerms)}
                  </div>
                )}

                {activeTab === 'atividade' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">Últimas 20 Ações</h3>
                    {loadingLogs ? (
                      <div className="py-10 text-center text-slate-500"><Loader2 size={24} className="animate-spin mx-auto text-indigo-600 mb-2" />Buscando rastro...</div>
                    ) : userLogs.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-slate-200 rounded-lg">
                        <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 font-medium">Nenhum log de auditoria encontrado.</p>
                        <p className="text-xs text-slate-400 mt-1">Este usuário não interagiu com os módulos monitorados recentemente.</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 border-l-4 border-l-indigo-600 shadow-sm relative overflow-hidden">
                        {userLogs.map((log) => (
                          <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-50">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 shrink-0">
                              {log.modulo.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 font-medium break-all">
                                <span className={`px-2 py-0.5 rounded text-[10px] mr-2 text-white font-bold
                                  ${log.acao === 'APROVAÇÃO' ? 'bg-emerald-500' :
                                    log.acao === 'STATUS' ? 'bg-blue-500' :
                                      'bg-indigo-500'}`}
                                >
                                  {log.acao}
                                </span>
                                {log.detalhes}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{log.modulo}</span>
                                <span className="text-xs text-slate-400">
                                  {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL CONVITE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto mt-10 mb-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Mail size={18} className="text-indigo-600" /> Enviar Convite Criptografado</h2>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <form id="invite-form" onSubmit={handleSubmit(onSubmitInvite)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-700">Email Destino</Label>
                    <Input type="email" placeholder="nome@suaempresa.com.br" {...register('email')} className="mt-1" />
                    {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
                  </div>

                  <div>
                    <Label className="text-slate-700">Template Base (Papel)</Label>
                    <Select {...register('role')} className="mt-1">
                      <option value="Administrador">Administrador Geral</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Engenheiro">Engenharia / Campo</option>
                    </Select>
                  </div>
                </div>

                <div className="border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowCustomInvitePerms(!showCustomInvitePerms)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Settings2 size={16} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-indigo-900">Personalizar Permissões</p>
                        <p className="text-xs text-indigo-600/70">Opcional: refinar acessos além do padrão do Template</p>
                      </div>
                    </div>
                    <span className="text-indigo-400">{showCustomInvitePerms ? '▲' : '▼'}</span>
                  </button>

                  {showCustomInvitePerms && (
                    <div className="p-4 bg-white border-t border-indigo-100">
                      <p className="text-xs text-slate-500 mb-4 px-1">Modifique os acessos para este convite específico. Isso criará o perfil do usuário já com estritas limitações.</p>
                      {renderPermissionsTable(invitePerms, setInvitePerms)}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="border-t border-slate-200 p-4 px-6 bg-slate-50 flex justify-end gap-3 rounded-b-2xl shrink-0">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" form="invite-form" disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Mandar Link</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <Toast
          variant={toastVariant}
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};
