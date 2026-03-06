import React from 'react';
import { Calendar, Truck } from 'lucide-react';

// Dados simulados para visualização imediata
const MAQUINAS = [
  { id: 'm1', nome: 'Hélice Contínua 01 (Caminhão)', status: 'EM_OBRA' },
  { id: 'm2', nome: 'Hélice Contínua 02 (Esteira)', status: 'DISPONIVEL' },
  { id: 'm3', nome: 'Estaca Escavada 01', status: 'MANUTENCAO' },
];

const AGENDAS = [
  { maquinaId: 'm1', cliente: 'Leonardi', inicio: 1, fim: 10 }, // Dias do mês atual
  { maquinaId: 'm1', cliente: 'Tenda', inicio: 15, fim: 25 },
  { maquinaId: 'm3', cliente: 'Manutenção', inicio: 1, fim: 5 },
];

export const CalendarioObras: React.FC = () => {
  // Gera 30 dias simples para o grid
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-orange-500" /> Disponibilidade de Frota (Outubro)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left w-40 text-gray-500">Equipamento</th>
              {dias.map(d => (
                <th key={d} className={`p-1 min-w-[25px] text-center border-l ${d % 7 === 0 ? 'bg-gray-100' : ''}`}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MAQUINAS.map(mq => (
              <tr key={mq.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium text-slate-700 flex items-center gap-2 whitespace-nowrap">
                  <Truck size={14} className={mq.status === 'MANUTENCAO' ? 'text-red-500' : 'text-blue-600'} />
                  {mq.nome}
                </td>
                {dias.map(d => {
                  const ocupado = AGENDAS.find(a => a.maquinaId === mq.id && d >= a.inicio && d <= a.fim);
                  return (
                    <td key={d} className="p-0 border-l border-gray-50 h-8 relative">
                      {ocupado && (
                        <div 
                          className={`absolute inset-1 rounded text-[9px] text-white flex items-center justify-center truncate px-1
                            ${mq.status === 'MANUTENCAO' ? 'bg-red-400' : 'bg-blue-500'}
                          `}
                          title={ocupado.cliente}
                        >
                          {d === ocupado.inicio ? ocupado.cliente : ''}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-400">
        <span>🟦 Em Obra</span>
        <span>🟥 Manutenção</span>
        <span>⬜ Disponível</span>
      </div>
    </div>
  );
};