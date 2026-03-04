import React, { useState } from 'react';
import { ConstructionSite } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ConstructionCalendarProps {
  sites: ConstructionSite[];
}

export const ConstructionCalendar: React.FC<ConstructionCalendarProps> = ({ sites }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 1)); // Oct 2023 for Mock Data

  // Helpers for calendar generation
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const handleConnect = () => {
    // Mock connection
    setIsConnected(true);
    alert("Conectado com sucesso ao Google Workspace!");
  };

  const getDayEvents = (day: number) => {
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${currentMonthStr}-${dayStr}`;

    return sites.filter(site => {
        return fullDate >= site.startDate && fullDate <= site.endDate;
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Calendário de Obras</h2>
          <p className="text-slate-500 mt-2">Cronograma de Execução e Previsão de Equipes.</p>
        </div>
        <button
          onClick={handleConnect}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
            isConnected 
              ? 'bg-green-100 text-green-700 border border-green-200 cursor-default' 
              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {isConnected ? <Check size={18} /> : <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" className="w-4 h-4" />}
          {isConnected ? 'Sincronizado com Google' : 'Conectar Google Workspace'}
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Controls */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
           <button className="p-2 hover:bg-white rounded-full text-slate-500 hover:shadow-sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              <ChevronLeft size={20} />
           </button>
           <h3 className="font-bold text-lg text-slate-800 capitalize">
             {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
           </h3>
           <button className="p-2 hover:bg-white rounded-full text-slate-500 hover:shadow-sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              <ChevronRight size={20} />
           </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-slate-200 gap-px">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="bg-slate-50 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
          
          {/* Empty cells for previous month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = getDayEvents(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div key={day} className={`bg-white min-h-[120px] p-2 hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day}</div>
                <div className="space-y-1">
                  {events.map(site => (
                    <div 
                      key={site.id} 
                      className={`text-[10px] px-1.5 py-1 rounded truncate border-l-2 font-medium
                        ${site.status === 'Ativa' ? 'bg-blue-50 border-blue-400 text-blue-700' : 
                          site.status === 'Pausada' ? 'bg-amber-50 border-amber-400 text-amber-700' : 
                          'bg-emerald-50 border-emerald-400 text-emerald-700'}
                      `}
                      title={site.name}
                    >
                      {site.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};