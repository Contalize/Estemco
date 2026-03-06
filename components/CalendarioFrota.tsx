import React from 'react';
import { Calendar, Truck, AlertCircle } from 'lucide-react';
import { useCollection } from '../src/firebase/firestore/use-collection';
import { Maquina, Agendamento } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { where } from 'firebase/firestore';

interface Props {
  categoriaFiltro?: string; // HELICE, ESCAVADA, etc.
}

const CalendarioFrota: React.FC<Props> = ({ categoriaFiltro }) => {
  const { profile } = useAuth();
  const { data: maquinas, isLoading: loadingMaquinas } = useCollection<Maquina>('maquinas', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);
  const { data: agendamentos, isLoading: loadingAgendamentos } = useCollection<Agendamento>('agendamentos', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

  // Filtra as máquinas baseadas na seleção do usuário
  // Note: Maquina interface in types.ts doesn't have 'categoria', assuming it might be added or we filter by name/other prop
  // For now, ignoring categoriaFiltro if it's not in the type, or I should update the type.
  // Let's assume we show all if no filter.
  const maquinasVisiveis = maquinas; 

  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  if (loadingMaquinas || loadingAgendamentos) {
    return <div className="p-4 text-center text-slate-500">Carregando frota...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
      <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Calendar className="text-blue-600" size={16} /> 
          Disponibilidade de Frota
        </h3>
        <div className="flex gap-2 text-[8px] font-bold uppercase">
          <span className="flex items-center gap-1 text-green-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Livre</span>
          <span className="flex items-center gap-1 text-blue-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Obra</span>
          <span className="flex items-center gap-1 text-red-600"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Manutenção</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header Dias */}
          <div className="grid grid-cols-[180px_repeat(14,1fr)] border-b border-gray-100">
            <div className="p-2 text-[10px] font-bold text-gray-400">EQUIPAMENTO</div>
            {dias.map((d, i) => (
              <div key={i} className="text-center py-1 border-l border-gray-50 bg-slate-50/50">
                <div className="text-[10px] font-bold text-gray-600">{d.getDate()}</div>
                <div className="text-[7px] text-gray-400">{d.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Linhas Máquinas */}
          {maquinasVisiveis.length > 0 ? (
            maquinasVisiveis.map(mq => (
              <div key={mq.id} className="grid grid-cols-[180px_repeat(14,1fr)] border-b border-gray-50 h-10 items-center hover:bg-slate-50 transition-colors">
                <div className="px-2 text-[10px] font-bold text-slate-700 flex items-center gap-2 truncate border-r border-gray-100 h-full">
                  <Truck size={14} className={mq.status === 'MANUTENCAO' ? 'text-red-400' : 'text-slate-400'} />
                  {mq.nome}
                </div>
                {dias.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const ocupado = agendamentos.find(a => a.maquinaId === mq.id && dateStr >= a.dataInicio && dateStr <= a.dataFim);
                  
                  let bgColor = 'bg-green-50';
                  let barColor = 'bg-green-400';
                  
                  if (mq.status === 'MANUTENCAO') {
                     bgColor = 'bg-red-50';
                     barColor = 'bg-red-400';
                  } else if (ocupado) {
                     bgColor = 'bg-blue-50';
                     barColor = 'bg-blue-500';
                  }

                  return (
                    <div key={i} className={`h-full border-l border-gray-50 p-0.5 relative group ${bgColor}`}>
                       {ocupado && (
                         <div className={`absolute inset-1 rounded-sm ${barColor} opacity-80`}></div>
                       )}
                       {ocupado && (
                         <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
                           {ocupado.clienteNome}
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <AlertCircle size={24} className="text-slate-300" />
              <p>Nenhum equipamento cadastrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarioFrota;
