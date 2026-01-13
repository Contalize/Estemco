import React, { useState, useEffect } from 'react';
import { ConstructionSite } from '../types';
import { ChevronLeft, ChevronRight, Check, RefreshCw, Briefcase, User, Truck, ClipboardList, Plus } from 'lucide-react';
import { listCalendarEvents } from '../services/googleService';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import { AddEventModal } from './AddEventModal';

import { usePhoenixData } from '../hooks/usePhoenixData';

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  colorId?: string;
}

export const ConstructionCalendar: React.FC = () => {
  const { projects } = usePhoenixData();
  const sites = projects as ConstructionSite[];

  // ... (rest of the component)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('estemco_google_token'));

  // Layers Filter State
  const [showPersonal, setShowPersonal] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  // Equipment Filter (Drill-down)
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const fetchEvents = async () => {
    const token = localStorage.getItem('estemco_google_token');
    if (!token) return;

    setLoading(true);
    try {
      const data = await listCalendarEvents(token);
      setEvents(data.items || []);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to fetch Google Calendar events", error);
      if (String(error).includes('Unauthorized')) {
        setIsConnected(false);
        localStorage.removeItem('estemco_google_token');
      }
    } finally {
      setLoading(false);
    }
  };

  // PHOENIX PROTOCOL: Map Projects to Events Dynamically
  const projectEvents: GoogleEvent[] = React.useMemo(() => {
    return sites
      .filter(site => site.startDate && site.prazoDias)
      .map(site => {
        const start = new Date(site.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + (site.prazoDias || 1));

        return {
          id: `proj-${site.id}`,
          summary: `[OBRA] ${site.name}`,
          description: `Cliente: ${site.clientName}\nStatus: ${site.status}`,
          start: { date: site.startDate },
          end: { date: end.toISOString().split('T')[0] },
          htmlLink: '#', // TODO: Link to project details
          colorId: site.status === 'PROPOSTA' ? '8' : '1' // 8=Grey(Proposal), 1=Blue(Active)
        };
      });
  }, [sites]);

  // Merge events (Google + Projects)
  const allEvents = [...events, ...projectEvents];

  useEffect(() => {
    if (isConnected) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('estemco_google_token', token);
        setIsConnected(true);
        fetchEvents();
      }
    } catch (error) {
      console.error("Auth Error", error);
      alert("Erro ao conectar com Google.");
    }
  };

  const handleAddEventClick = (day: number) => {
    if (!isConnected) return alert("Conecte ao Google primeiro.");
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setShowAddModal(true);
  };

  /**
   * Identifies the category of an event based on Description Tags or Title
   */
  const getEventCategory = (evt: GoogleEvent): 'EQUIPMENT' | 'TASK' | 'PERSONAL' => {
    const text = (evt.summary + (evt.description || '')).toUpperCase();
    if (text.includes('[EQP]') || text.includes('[OBRA]')) return 'EQUIPMENT';
    if (text.includes('[TASK]') || text.includes('LEMBRETE') || text.includes('VENCIMENTO')) return 'TASK';
    return 'PERSONAL'; // Default
  };

  const getFilteredEvents = () => {
    return allEvents.filter(evt => {
      const cat = getEventCategory(evt);

      // Layer Filters
      if (cat === 'PERSONAL' && !showPersonal) return false;
      if (cat === 'EQUIPMENT' && !showEquipment) return false;
      if (cat === 'TASK' && !showTasks) return false;

      // Specific Equipment Filter (Advanced)
      if (cat === 'EQUIPMENT' && selectedEquipment !== 'ALL') {
        const text = (evt.summary + (evt.description || '')).toUpperCase();
        if (!text.includes(selectedEquipment)) return false;
      }

      return true;
    });
  };

  const visibleEvents = getFilteredEvents();

  const getDayEvents = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const checkStr = checkDate.toISOString().split('T')[0];

    return visibleEvents.filter(event => {
      const start = event.start.dateTime || event.start.date || '';
      const end = event.end.dateTime || event.end.date || '';
      return start.startsWith(checkStr) || (start <= checkStr && end >= checkStr);
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] overflow-hidden">
      {/* Sidebar de Filtros (Command Center) */}
      <aside className="w-full md:w-64 bg-white border-r p-4 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Briefcase className="text-blue-600" /> Plan. Obra
          </h2>
          <p className="text-xs text-slate-500">Gestão de Recursos</p>
        </div>

        {!isConnected ? (
          <button onClick={handleConnect} className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg font-bold text-sm hover:bg-blue-200">
            Conectar Google
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 p-2 rounded">
            <Check size={14} /> Sincronizado
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Camadas (Layers)</h3>

          <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={showEquipment} onChange={e => setShowEquipment(e.target.checked)} className="accent-blue-600" />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Truck size={16} className="text-blue-500" /> Equipamentos
            </div>
          </label>

          {showEquipment && (
            <select
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
              className="w-full text-xs p-2 border rounded bg-slate-50 ml-6 w-[calc(100%-1.5rem)]"
            >
              <option value="ALL">Todas Máquinas</option>
              <option value="HELICE">Hélice Contínua</option>
              <option value="ESCAVADA">Escavada Mec.</option>
            </select>
          )}

          <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)} className="accent-orange-500" />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <ClipboardList size={16} className="text-orange-500" /> Fluxo (Tasks)
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={showPersonal} onChange={e => setShowPersonal(e.target.checked)} className="accent-emerald-500" />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <User size={16} className="text-emerald-500" /> Pessoal
            </div>
          </label>
        </div>
      </aside>

      {/* Main Calendar View */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 p-4 md:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex bg-white rounded-lg shadow-sm border p-1">
              <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><ChevronLeft size={20} /></button>
              <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><ChevronRight size={20} /></button>
            </div>
          </div>
          <button onClick={fetchEvents} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 text-slate-500">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow border border-slate-200 overflow-y-auto">
          <div className="grid grid-cols-7 bg-slate-100 border-b">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="py-3 text-center text-xs font-black text-slate-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr min-h-[600px] divide-x divide-slate-100">
            {/* Empty cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getDayEvents(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

              return (
                <div key={day} className={`p-2 min-h-[100px] hover:bg-slate-50 transition-colors border-b border-slate-100 group relative ${isToday ? 'bg-blue-50/20' : ''}`}>
                  <div className={`text-xs font-bold mb-2 flex justify-between ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    <span className={isToday ? "bg-blue-100 px-2 rounded-full" : ""}>{day}</span>
                    <button
                      onClick={() => handleAddEventClick(day)}
                      className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Novo Evento">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                    {dayEvents.map(evt => {
                      const cat = getEventCategory(evt);
                      let style = "bg-emerald-100 text-emerald-800 border-emerald-200"; // Personal
                      if (cat === 'EQUIPMENT') style = "bg-blue-100 text-blue-800 border-blue-200";
                      if (cat === 'TASK') style = "bg-orange-100 text-orange-800 border-orange-200";

                      return (
                        <a
                          key={evt.id}
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block text-[9px] px-1.5 py-1 rounded border-l-2 font-medium truncate mb-1 hover:brightness-95 ${style}`}
                          title={evt.summary}
                        >
                          {evt.summary.replace(/\[.*?\]/g, '').trim()}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddEventModal
          selectedDate={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSave={fetchEvents}
        />
      )}
    </div>
  );
};