import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, UserRole } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { CostConfig } from './components/CostConfig';
import { ProjectWorkflow } from './components/ProjectWorkflow';
import { ConstructionCalendar } from './components/ConstructionCalendar';
import { Propostas } from './src/pages/Propostas';
import { NovaProposta } from './src/pages/NovaProposta';
import { BoletimDiario } from './components/BoletimDiario';
import { DRE } from './components/DRE';
import { Settings as SettingsPage } from './components/Settings';
import { Clients } from './components/Clients';
import { Equipamentos } from './components/Equipamentos';
import { Team } from './components/Team';
import { Financeiro } from './components/Financeiro';
import { Tab, ConstructionSite, GlobalConfig } from './types';
import { LayoutDashboard, Settings, Drill, CalendarDays, GitPullRequestArrow, FileText, Users, Shield, ClipboardList, TrendingUp, DollarSign, LogOut } from 'lucide-react';
import { useCollection } from './src/firebase/firestore/use-collection';
import { where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

const INITIAL_CONFIG: GlobalConfig = {
  dieselPrice: 6.59,
  employees: [
    { id: '1', role: 'Operador de Perfuratriz', dailyCost: 450 },
    { id: '2', role: 'Auxiliar de Pista', dailyCost: 200 },
    { id: '3', role: 'Encarregado de Obras', dailyCost: 350 },
  ]
};

const SplashScreen = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <img src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png" className="h-16 mx-auto mb-4 animate-pulse object-contain bg-white p-2 rounded" alt="Logo" />
      <p className="text-slate-400 text-sm">Carregando...</p>
    </div>
  </div>
);

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [editPropostaId, setEditPropostaId] = useState<string | null>(null);
  const [openPropostaModal, setOpenPropostaModal] = useState(false);
  const [initialObraId, setInitialObraId] = useState<string | null>(null);
  const [config, setConfig] = useState<GlobalConfig>(INITIAL_CONFIG);
  const { user, profile, loading } = useAuth();

  const { data: obras } = useCollection<ConstructionSite>(
    profile?.tenantId ? 'obras' : '',
    profile?.tenantId
      ? [where('tenantId', '==', profile.tenantId)]
      : []
  );

  useEffect(() => {
    const handleNavigationEvent = (e: any) => {
      if (e.detail) {
        handleNavigate(e.detail);
      }
    };
    window.addEventListener('NAVIGATE_TO', handleNavigationEvent);
    return () => window.removeEventListener('NAVIGATE_TO', handleNavigationEvent);
  }, [profile]);

  if (loading || (!profile && user)) return <SplashScreen />;
  if (!user) return <Login />;

  const checkAccess = (role: UserRole | undefined, tab: Tab): boolean => {
    if (!role) return false;
    if (role === 'Administrador') return true;

    switch (tab) {
      case Tab.DASHBOARD:
      case Tab.WORKFLOW:
      case Tab.CALENDAR:
        return true;
      case Tab.PROPOSALS:
      case Tab.QUOTE:
      case Tab.CLIENTS:
        return role === 'Comercial';
      case Tab.BOLETIM:
        return role === 'Engenheiro' || role === 'Comercial';
      case Tab.DRE:
      case Tab.FINANCES:
      case Tab.CONFIG:
      case Tab.SETTINGS:
      case Tab.TEAM:
        return false; // Restricted to Admin
      default:
        return false;
    }
  };

  const handleNavigate = (target: Tab | any) => {
    if (typeof target === 'object' && target !== null) {
      if (target.tab === Tab.QUOTE || target.tab === 'quote') {
        setEditPropostaId(target.propostaId || null);
        setActiveTab(Tab.QUOTE);
        return;
      }
      if (target.tab === Tab.BOLETIM || target.tab === 'boletim') {
        setInitialObraId(target.obraId || null);
        if (checkAccess(profile?.role, Tab.BOLETIM)) {
          setActiveTab(Tab.BOLETIM);
        }
        return;
      }
      const t = (target.tab || target) as Tab;
      if (checkAccess(profile?.role, t)) {
        setActiveTab(t);
      }
    } else {
      if (target === Tab.QUOTE || target === 'quote') {
        setEditPropostaId(null);
      }
      const t = target as Tab;
      if (checkAccess(profile?.role, t)) {
        setActiveTab(t);
      } else {
        alert('Acesso negado. Você não tem permissão para acessar esta área.');
      }
    }
  };



  const renderContent = () => {
    if (!checkAccess(profile?.role, activeTab)) {
      return <Dashboard sites={obras} config={config} onNavigate={handleNavigate} />;
    }

    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard sites={obras} config={config} onNavigate={handleNavigate} />;
      case Tab.PROPOSALS:
        return <Propostas onNavigate={handleNavigate} />;
      case Tab.QUOTE:
        return <NovaProposta onNavigate={handleNavigate} editPropostaId={editPropostaId} />;
      case Tab.WORKFLOW:
        return <ProjectWorkflow />;
      case Tab.BOLETIM:
        return <BoletimDiario config={config} initialObraId={initialObraId} />;
      case Tab.DRE:
        return <DRE config={config} />;
      case Tab.FINANCES:
        return <Financeiro />;
      case Tab.CALENDAR:
        return <ConstructionCalendar sites={obras} />;
      case Tab.CONFIG:
        return <CostConfig config={config} onUpdate={setConfig} />;
      case Tab.SETTINGS:
        return <SettingsPage onNavigate={handleNavigate} />;
      case Tab.CLIENTS:
        return <Clients />;
      case Tab.TEAM:
        return <Team />;
      case Tab.MACHINES as Tab:
        return <Equipamentos />;
      default:
        return <Dashboard sites={obras} config={config} onNavigate={handleNavigate} />;
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      await signOut(auth);
    }
  };

  const navItemClass = (tab: Tab) => `w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-r-lg transition-all border-l-[3px] ${activeTab === tab
    ? "bg-orange-500 text-white font-semibold border-orange-700"
    : "text-slate-400 hover:text-white hover:bg-slate-800 border-transparent"
    }`;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col fixed h-full z-20 shadow-xl border-r border-slate-800 transition-all">
        <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-white shrink-0">
          <img
            src="https://www.estemco.com.br/wp-content/uploads/2022/07/logo.png"
            alt="Estemco Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {profile?.nome?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {profile?.nome || user?.email}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {profile?.role || 'Usuário'}
            </p>
          </div>
          {profile?.role === 'Administrador' && (
            <button onClick={() => handleNavigate(Tab.SETTINGS)}
              title="Configurações"
              className="text-slate-500 hover:text-slate-300 transition-colors p-1">
              <Settings size={16} />
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto">
          <button
            onClick={() => handleNavigate(Tab.DASHBOARD)}
            className={navItemClass(Tab.DASHBOARD)}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          {checkAccess(profile?.role, Tab.PROPOSALS) && (
            <button
              onClick={() => handleNavigate(Tab.PROPOSALS)}
              className={navItemClass(Tab.PROPOSALS)}
            >
              <ClipboardList size={18} />
              <span className="text-sm font-medium">Propostas</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.WORKFLOW) && (
            <button
              onClick={() => handleNavigate(Tab.WORKFLOW)}
              className={navItemClass(Tab.WORKFLOW)}
            >
              <GitPullRequestArrow size={18} />
              <span className="text-sm font-medium">Esteira Obras</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.CALENDAR) && (
            <button
              onClick={() => handleNavigate(Tab.CALENDAR)}
              className={navItemClass(Tab.CALENDAR)}
            >
              <CalendarDays size={18} />
              <span className="text-sm font-medium">Calendário</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.BOLETIM) && (
            <button
              onClick={() => handleNavigate(Tab.BOLETIM)}
              className={navItemClass(Tab.BOLETIM)}
            >
              <FileText size={18} />
              <span className="text-sm font-medium">Boletim Diário</span>
            </button>
          )}

          {checkAccess(profile?.role, Tab.FINANCES) && (
            <>
              <button
                onClick={() => handleNavigate(Tab.FINANCES)}
                className={navItemClass(Tab.FINANCES)}
              >
                <DollarSign size={18} />
                <span className="text-sm font-medium">Financeiro</span>
              </button>
              <button
                onClick={() => handleNavigate(Tab.DRE)}
                className={navItemClass(Tab.DRE)}
              >
                <TrendingUp size={18} />
                <span className="text-sm font-medium">DRE Obra</span>
              </button>
            </>
          )}

          <div className="pt-4 mt-2 border-t border-slate-800">
            <p className="px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administração</p>
            {checkAccess(profile?.role, Tab.CLIENTS) && (
              <button
                onClick={() => handleNavigate(Tab.CLIENTS)}
                className={navItemClass(Tab.CLIENTS)}
              >
                <Users size={18} />
                <span className="text-sm font-medium">Clientes</span>
              </button>
            )}

            {checkAccess(profile?.role, Tab.TEAM) && (
              <button
                onClick={() => handleNavigate(Tab.TEAM)}
                className={navItemClass(Tab.TEAM)}
              >
                <Shield size={18} />
                <span className="text-sm font-medium">Equipe</span>
              </button>
            )}

            {checkAccess(profile?.role, Tab.MACHINES as Tab) && (
              <button
                onClick={() => handleNavigate(Tab.MACHINES as Tab)}
                className={navItemClass(Tab.MACHINES as Tab)}
              >
                <Drill size={18} />
                <span className="text-sm font-medium">Equipamentos</span>
              </button>
            )}

            {checkAccess(profile?.role, Tab.CONFIG) && (
              <button
                onClick={() => handleNavigate(Tab.CONFIG)}
                className={navItemClass(Tab.CONFIG)}
              >
                <Settings size={18} />
                <span className="text-sm font-medium">Custos & Regras</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside >

      <main className="flex-1 w-full md:ml-64 p-0 md:p-8 overflow-y-auto pb-20 md:pb-0">
        {renderContent()}
      </main>
    </div >
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