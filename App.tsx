import React, { useState, useEffect, Suspense } from 'react';
import { Tab, ConstructionSite, GlobalConfig } from './types';
import { LayoutDashboard, Settings, Drill, CalendarDays, GitPullRequestArrow, FileText, Database, LogOut } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';

// Lazy Load Heavy Modules
const FinancialDashboard = React.lazy(() => import('./components/FinancialDashboard').then(module => ({ default: module.FinancialDashboard })));
import { auth } from './firebaseConfig';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { usePhoenixData } from './hooks/usePhoenixData';

// Lazy Load Components (Code Splitting) used to improve performance
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const CostConfig = React.lazy(() => import('./components/CostConfig').then(module => ({ default: module.CostConfig })));
const ProjectWorkflow = React.lazy(() => import('./components/ProjectWorkflow').then(module => ({ default: module.ProjectWorkflow })));
const ConstructionCalendar = React.lazy(() => import('./components/ConstructionCalendar').then(module => ({ default: module.ConstructionCalendar })));
const NovaProposta = React.lazy(() => import('./components/NovaProposta').then(module => ({ default: module.NovaProposta })));
const Registrations = React.lazy(() => import('./components/Registrations').then(module => ({ default: module.Registrations })));
const Templates = React.lazy(() => import('./components/Templates').then(module => ({ default: module.Templates })));
const Relatorios = React.lazy(() => import('./components/ReportsBI').then(module => ({ default: module.ReportsBI })));
const FleetRegistry = React.lazy(() => import('./components/FleetRegistry').then(module => ({ default: module.FleetRegistry })));

const INITIAL_SITES: ConstructionSite[] = [];

const INITIAL_CONFIG: GlobalConfig = {
  dieselPrice: 6.59,
  employees: [
    { id: '1', role: 'Operador de Perfuratriz', dailyCost: 450 },
    { id: '2', role: 'Auxiliar de Pista', dailyCost: 200 },
    { id: '3', role: 'Encarregado de Obras', dailyCost: 350 },
  ]
};

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // AUTH STATE OBSERVER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);

  // PHOENIX ARCHITECTURE: Dados Centralizados
  const { projects, loading: dataLoading } = usePhoenixData();
  const localSites = projects as ConstructionSite[]; // Auto-synced via React Query

  const [config, setConfig] = useState<GlobalConfig>(INITIAL_CONFIG);

  const renderContent = () => {
    // Suspense Wrap for Lazy Components
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-900"></div>
        </div>
      }>
        {(() => {


          switch (activeTab) {
            case Tab.DASHBOARD:
              return <Dashboard sites={localSites} config={config} setActiveTab={setActiveTab} />;
            case Tab.REGISTERS:
              return <Registrations />;
            case Tab.QUOTE:
              return <NovaProposta />;
            case Tab.WORKFLOW:
              return <ProjectWorkflow />;
            case Tab.CALENDAR:
              return <ConstructionCalendar />;
            case Tab.FINANCIAL:
              return <FinancialDashboard />;
            case Tab.CONFIG:
              return <CostConfig config={config} onUpdate={setConfig} />;
            case Tab.TEMPLATES:
              return <Templates />;
            case Tab.REPORTS:
              return <Relatorios />;
            case Tab.ASSETS:
              return <FleetRegistry />;
            default:
              return <Dashboard sites={localSites} config={config} setActiveTab={setActiveTab} />;
          }
        })()}
      </Suspense>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(user) => {
      setUser(user);
      setAuthLoading(false);
    }} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 w-full min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header Trigger */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <span className="font-bold">ESTEMCO ERP</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 md:p-8 scroll-smooth pb-20 md:pb-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};