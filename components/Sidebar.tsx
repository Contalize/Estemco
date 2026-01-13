import React from 'react';
import { 
  LayoutDashboard, FileText, Users, HardHat, 
  Calendar, PieChart, Truck, Settings, LogOut, ChevronRight 
} from 'lucide-react';
import { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  user?: any;
  isOpen?: boolean;
  setIsOpen?: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, isOpen = true, setIsOpen }) => {
  
  const MenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-8 px-4">
      <h3 className="px-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 opacity-90">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );

  const MenuItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => {
            setActiveTab(id);
            if (setIsOpen && window.innerWidth < 768) setIsOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
        ${isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
          {label}
        </div>
        {isActive && <ChevronRight size={14} className="opacity-70 animate-in slide-in-from-left-1" />}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      <div className={`fixed md:relative z-50 h-screen w-64 bg-slate-950 text-slate-200 flex flex-col border-r border-slate-900 shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Header / Logo */}
        <div className="p-6 pb-8 border-b border-white/5 bg-slate-900/50 flex flex-col items-center">
             <img 
                src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png" 
                alt="Estemco Logo" 
                className="h-12 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
            />
             <div className="mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Enterprise ERP</p>
            </div>
        </div>

        {/* Navegação */}
        <div className="flex-1 overflow-y-auto customized-scrollbar py-6">
          <MenuSection title="Gestão & BI">
            <MenuItem id={Tab.DASHBOARD} icon={LayoutDashboard} label="Visão Geral" />
            <MenuItem id={Tab.REPORTS} icon={PieChart} label="Inteligência de Obras" />
          </MenuSection>

          <MenuSection title="Comercial">
            <MenuItem id={Tab.QUOTE} icon={FileText} label="Nova Proposta" />
            <MenuItem id={Tab.REGISTERS} icon={Users} label="Base de Clientes" />
          </MenuSection>

          <MenuSection title="Engenharia">
            <MenuItem id={Tab.WORKFLOW} icon={HardHat} label="Gestão de Obras" />
            <MenuItem id={Tab.CALENDAR} icon={Calendar} label="Calendário Oficial" />
            <MenuItem id={Tab.ASSETS} icon={Truck} label="Máquinas & Frota" />
          </MenuSection>
          
          <MenuSection title="Sistema">
            <MenuItem id={Tab.CONFIG} icon={Settings} label="Configurações" />
          </MenuSection>
        </div>

        {/* Footer / User */}
        <div className="p-4 border-t border-white/5 bg-slate-900/30">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-white/5 hover:bg-slate-800 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 shadow-inner">
              <span className="font-bold text-xs text-slate-300 group-hover:text-white">{user?.email?.slice(0,2).toUpperCase() || 'AD'}</span>
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-blue-200 transition-colors">{user?.email?.split('@')[0] || 'Administrador'}</p>
              <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
              </p>
            </div>
            <LogOut size={16} className="text-slate-600 group-hover:text-red-400 transition-colors" />
          </div>
        </div>
      </div>
    </>
  );
}
