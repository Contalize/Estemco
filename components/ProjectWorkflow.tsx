import React, { useState } from 'react';
import { ConstructionSite } from '../types';
import { Building2, FileText, MapPin, Hash, Activity, Search, Plus, X } from 'lucide-react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { useAuth } from '../contexts/AuthContext';
import { where } from 'firebase/firestore';
import { Card, Button, Input } from './ui';

export const ProjectWorkflow: React.FC = () => {
  const { profile } = useAuth();
  const { data: obras, isLoading, error } = useCollection<any>('obras', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredObras = obras.filter(obra => 
    obra.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.enderecoDaObra?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalEstacas = (servicos: any[]) => {
    if (!servicos || !Array.isArray(servicos)) return 0;
    return servicos.reduce((total, servico) => total + (Number(servico.quantidade) || 0), 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Andamento':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Em Andamento</span>;
      case 'Paralisada':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Paralisada</span>;
      case 'Concluída':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Concluída</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">{status || 'Desconhecido'}</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Obras</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe o andamento das obras ativas.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por cliente ou endereço..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Endereço da Obra</th>
                <th className="px-6 py-3 font-medium text-center">Qtd. Estacas</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8">
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                      <div className="h-10 bg-slate-200 rounded animate-pulse w-full"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <X size={32} className="mb-2" />
                      <p className="font-medium">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredObras.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Building2 size={48} className="mb-4 text-slate-300" />
                      <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma obra encontrada</h3>
                      <p className="text-sm mb-4">Aprove propostas para gerar novas obras em andamento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredObras.map((obra) => (
                  <tr key={obra.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {obra.clienteNome}
                    </td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[300px]">{obra.enderecoDaObra}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">
                      {getTotalEstacas(obra.servicos)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(obra.statusObra)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};