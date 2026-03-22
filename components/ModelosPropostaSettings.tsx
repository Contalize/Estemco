import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Label, Button, Textarea, Skeleton } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { TipoServico } from '../src/types/propostaForm';

export type TextosModel = {
  obrigacoesContratante: string;
  obrigacoesContratada: string;
  condicoesCobranca: string;
  direitosRisco: string;
  termoAceite: string;
};

export type ModelosProposta = Record<TipoServico, TextosModel>;

const DEFAULT_TEXTS: TextosModel = {
  obrigacoesContratante: '1. Fornecer água e energia elétrica no local da obra.\n2. Garantir acesso livre e desimpedido aos equipamentos.',
  obrigacoesContratada: '1. Executar os serviços de acordo com as normas técnicas vigentes (NBR 6122).\n2. Fornecer mão de obra qualificada e equipamentos em bom estado.',
  condicoesCobranca: 'Faturamento mínimo equivalente a ...',
  direitosRisco: 'Em caso de encontrar matacões, rochas ou interferências não previstas na sondagem, as horas paradas e custos de perfuração especial serão repassados à Contratante.',
  termoAceite: 'De acordo com os termos e condições descritos nesta proposta comercial.'
};

const DEFAULT_MODELOS: ModelosProposta = {
  HCM: { ...DEFAULT_TEXTS },
  ESC: { ...DEFAULT_TEXTS },
  SPT: { ...DEFAULT_TEXTS }
};

export const ModelosPropostaSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TipoServico>('HCM');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { user, profile } = useAuth();
  
  const { register, handleSubmit, reset } = useForm<ModelosProposta>({
    defaultValues: DEFAULT_MODELOS
  });

  useEffect(() => {
    const fetchModelos = async () => {
      if (!user || !profile?.tenantId) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'empresas', profile.tenantId, 'configuracoes', 'modelosProposta');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          reset(docSnap.data() as ModelosProposta);
        }
      } catch (error) {
        console.error("Erro ao carregar modelos de proposta:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModelos();
  }, [reset, user, profile?.tenantId]);

  const onSubmit = async (data: ModelosProposta) => {
    if (!user || !profile?.tenantId) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'empresas', profile.tenantId, 'configuracoes', 'modelosProposta');
      await setDoc(docRef, data, { merge: true });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar modelos de proposta:", error);
      alert("Erro ao salvar os modelos.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderCurrentTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div>
          <Label>Obrigações da Contratante ({activeTab})</Label>
          <Textarea
            className="min-h-[120px]"
            placeholder="1. Fornecer água e energia elétrica..."
            {...register(`${activeTab}.obrigacoesContratante`)}
          />
        </div>
        <div>
          <Label>Obrigações da Contratada ({activeTab})</Label>
          <Textarea
            className="min-h-[120px]"
            placeholder="1. Executar os serviços de acordo com as normas (NBR 6122)..."
            {...register(`${activeTab}.obrigacoesContratada`)}
          />
        </div>
        <div>
          <Label>Condições de Cobrança / Faturamento Mínimo ({activeTab})</Label>
          <Textarea
            className="min-h-[100px]"
            placeholder="Condições de variação de preço e cobrança..."
            {...register(`${activeTab}.condicoesCobranca`)}
          />
        </div>
        <div>
          <Label>Direitos e Condições de Risco Geotécnico ({activeTab})</Label>
          <Textarea
            className="min-h-[100px]"
            placeholder="Em caso de encontrar matacões, rochas ou interferências não previstas..."
            {...register(`${activeTab}.direitosRisco`)}
          />
        </div>
        <div>
          <Label>Termo de Aceite ({activeTab})</Label>
          <Textarea
            className="min-h-[80px]"
            placeholder="De acordo com os termos e condições descritos nesta proposta comercial."
            {...register(`${activeTab}.termoAceite`)}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm mb-6" />
        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full" /></div>
        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-1">Personalização de Modelos de Contrato</h3>
        <p className="text-sm text-slate-500 mb-4">Gerencie as cláusulas inseridas automaticamente em novas propostas para cada equipamento.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        {(['HCM', 'ESC', 'SPT'] as TipoServico[]).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setActiveTab(tipo)}
            className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === tipo
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Modelo {tipo}
          </button>
        ))}
      </div>

      <form id="modelos-form" onSubmit={handleSubmit(onSubmit)}>
        {renderCurrentTab()}
      </form>

      <div className="border-t border-slate-200 mt-8 pt-4 flex justify-end">
        <Button type="submit" form="modelos-form" disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isSaving ? 'Salvando...' : 'Salvar Modelos de Contrato'}
        </Button>
      </div>

      {showToast && (
        <div className="absolute top-0 right-0 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in z-10">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-sm font-medium">Modelos atualizados com sucesso!</span>
        </div>
      )}
    </div>
  );
};
