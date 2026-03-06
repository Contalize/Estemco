import React, { useState } from 'react';
import { AuthProvider, useAuth, UserRole } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { CostConfig } from './components/CostConfig';
import { ProjectWorkflow } from './components/ProjectWorkflow';
import { ConstructionCalendar } from './components/ConstructionCalendar';
import { NovaProposta } from './components/NovaProposta';
import { BoletimDiario } from './components/BoletimDiario';
import { DRE } from './components/DRE';
import { Settings as SettingsPage } from './components/Settings';
import { Clients } from './components/Clients';
import { Team } from './components/Team';
import { Tab, ConstructionSite, GlobalConfig } from './types';
import { LayoutDashboard, Settings, Drill, CalendarDays, GitPullRequestArrow, FileText, Users, Shield, ClipboardList, TrendingUp } from 'lucide-react';
import { useCollection } from './src/firebase/firestore/use-collection';
import { where } from 'firebase/firestore';

const INITIAL_CONFIG: GlobalConfig = {
  dieselPrice: 6.59,
  employees: [
    { id: '1', role: 'Operador de Perfuratriz', dailyCost: 450 },
    { id: '2', role: 'Auxiliar de Pista', dailyCost: 200 },
    { id: '3', role: 'Encarregado de Obras', dailyCost: 350 },
  ]
};

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [config, setConfig] = useState<GlobalConfig>(INITIAL_CONFIG);
  const { user, profile, loading } = useAuth();

  const { data: obras } = useCollection<ConstructionSite>('obras', profile?.tenantId ? [where('tenantId', '==', profile.tenantId)] : []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="text-sm font-medium">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const checkAccess = (role: UserRole | undefined, tab: Tab): boolean => {
    if (!role) return false;
    if (role === 'Administrador') return true;

    switch (tab) {
      case Tab.DASHBOARD:
      case Tab.WORKFLOW:
      case Tab.CALENDAR:
        return true;
      case Tab.QUOTE:
      case Tab.CLIENTS:
        return role === 'Comercial';
      case Tab.BOLETIM:
        return role === 'Engenheiro';
      case Tab.DRE:
      case Tab.CONFIG:
      case Tab.SETTINGS:
      case Tab.TEAM:
        return false; // Restricted to Admin
      default:
        return false;
    }
  };

  const handleTabChange = (tab: Tab) => {
    if (checkAccess(profile?.role, tab)) {
      setActiveTab(tab);
    } else {
      alert('Acesso negado. Você não tem permissão para acessar esta área.');
    }
  };

  const renderContent = () => {
    if (!checkAccess(profile?.role, activeTab)) {
      return <Dashboard sites={obras} config={config} onNavigate={handleTabChange} />;
    }

    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard sites={obras} config={config} onNavigate={handleTabChange} />;
      case Tab.QUOTE:
        return <NovaProposta onNavigate={handleTabChange} />;
      case Tab.WORKFLOW:
        return <ProjectWorkflow />;
      case Tab.BOLETIM:
        return <BoletimDiario config={config} />;
      case Tab.DRE:
        return <DRE config={config} />;
      case Tab.CALENDAR:
        return <ConstructionCalendar sites={obras} />;
      case Tab.CONFIG:
        return <CostConfig config={config} onUpdate={setConfig} />;
      case Tab.SETTINGS:
        return <SettingsPage />;
      case Tab.CLIENTS:
        return <Clients />;
      case Tab.TEAM:
        return <Team />;
      default:
        return <Dashboard sites={obras} config={config} onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col fixed h-full z-20 shadow-xl border-r border-slate-800 transition-all">
        <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-white">
          <img
            src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png"
            alt="Estemco Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 py-6 space-y-2 px-3">
          <button onClick={() => handleTabChange(Tab.DASHBOARD)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.DASHBOARD ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </button>

          {checkAccess(profile?.role, Tab.QUOTE) && (
            <button onClick={() => handleTabChange(Tab.QUOTE)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.QUOTE ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <FileText size={20} /> <span className="font-medium">Orçamento</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.CLIENTS) && (
            <button onClick={() => handleTabChange(Tab.CLIENTS)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.CLIENTS ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Users size={20} /> <span className="font-medium">Clientes</span>
            </button>
          )}

          <button onClick={() => handleTabChange(Tab.WORKFLOW)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.WORKFLOW ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <GitPullRequestArrow size={20} /> <span className="font-medium">Gestão de Obras</span>
          </button>

          {checkAccess(profile?.role, Tab.BOLETIM) && (
            <button onClick={() => handleTabChange(Tab.BOLETIM)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.BOLETIM ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <ClipboardList size={20} /> <span className="font-medium">Boletim Diário (BDO)</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.DRE) && (
            <button onClick={() => handleTabChange(Tab.DRE)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.DRE ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <TrendingUp size={20} /> <span className="font-medium">DRE Financeiro</span>
            </button>
          )}

          <button onClick={() => handleTabChange(Tab.CALENDAR)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.CALENDAR ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <CalendarDays size={20} /> <span className="font-medium">Calendário</span>
          </button>

          {profile?.role === 'Administrador' && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administração</p>
              </div>
              <button onClick={() => handleTabChange(Tab.TEAM)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.TEAM ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Shield size={20} /> <span className="font-medium">Equipe e Acessos</span>
              </button>
              <button onClick={() => handleTabChange(Tab.SETTINGS)} className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-lg transition-all ${activeTab === Tab.SETTINGS ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Settings size={20} /> <span className="font-medium">Configurações</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      <main className="flex-1 w-full md:ml-64 p-0 md:p-8 overflow-y-auto pb-20 md:pb-0">
        {renderContent()}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};