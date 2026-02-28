import React from 'react';
import { Calendar, Truck } from 'lucide-react';

interface Props {
  categoriaFiltro?: string; // HELICE, ESCAVADA, etc.
}

import { db } from '../firebaseConfig';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { Asset, Agendamento } from '../types';

const CalendarioFrota: React.FC<Props> = ({ categoriaFiltro }) => {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [agendamentos, setAgendamentos] = React.useState<Agendamento[]>([]);

  React.useEffect(() => {
    const fetchAgendamentos = async () => {
      try {
        const snap = await getDocs(collection(db, 'events'));
        setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } catch (err) {
        console.error("Error fetching agendamentos", err);
      }
    };
    fetchAgendamentos();

    const unsub = onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
    });
    return unsub;
  }, []);

  // Filtra as máquinas baseadas na seleção do usuário
  const maquinasVisiveis = categoriaFiltro
    ? assets.filter(m => m.category === categoriaFiltro)
    : assets;

  const dias = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
      <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Calendar className="text-blue-600" size={16} />
          {categoriaFiltro ? `Disponibilidade: ${categoriaFiltro}` : 'Disponibilidade Geral'}
        </h3>
        <div className="flex gap-2 text-[8px] font-bold uppercase">
          <span className="flex items-center gap-1 text-green-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Livre</span>
          <span className="flex items-center gap-1 text-blue-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Obra</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Header Dias */}
          <div className="grid grid-cols-[140px_repeat(10,1fr)] border-b border-gray-100">
            <div className="p-2 text-[10px] font-bold text-gray-400">EQUIPAMENTO</div>
            {dias.map((d, i) => (
              <div key={i} className="text-center py-1 border-l border-gray-50">
                <div className="text-[10px] font-bold text-gray-600">{d.getDate()}</div>
                <div className="text-[7px] text-gray-400">{d.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Linhas Máquinas */}
          {maquinasVisiveis.length > 0 ? (
            maquinasVisiveis.map(mq => (
              <div key={mq.id} className="grid grid-cols-[140px_repeat(10,1fr)] border-b border-gray-50 h-10 items-center">
                <div className="px-2 text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate">
                  <Truck size={12} className={mq.status === 'MANUTENCAO' ? 'text-red-400' : 'text-slate-400'} />
                  {mq.nome}
                </div>
                {dias.map((d, i) => {
                  const ocupado = agendamentos.find(a => a.maquinaId === mq.id && d.toISOString() >= a.dataInicio && d.toISOString() <= a.dataFim);
                  return (
                    <div key={i} className="h-full border-l border-gray-50 p-0.5">
                      <div className={`w-full h-full rounded-sm ${ocupado ? 'bg-blue-500' : 'bg-green-100'}`}></div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-gray-400">Nenhum equipamento encontrado para esta categoria.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarioFrota;