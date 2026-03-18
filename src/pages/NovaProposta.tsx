import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NovaPropostaData } from '../types/propostaForm';
import { TipoServico } from '../../types';
import { criarProposta, atualizarProposta } from '../services/propostaService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { Step1TipoServico } from '../components/steps/Step1TipoServico';
import { Step2ClienteObra } from '../components/steps/Step2ClienteObra';
import { Step3ItensServico } from '../components/steps/Step3ItensServico';
import { Step4Revisao } from '../components/steps/Step4Revisao';
import { Button, Toast } from '../../components/ui';
import { ChevronRight, ChevronLeft, Building2, Save } from 'lucide-react';

interface NovaPropostaProps {
    onNavigate: (tab: any) => void;
    editPropostaId?: string | null;
}

const INITIAL_DATA: NovaPropostaData = {
    tipo: null,
    clienteId: '',
    clienteNome: '',
    enderecoObra: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
    observacoes: '',
    validadeProposta: 30,
    itens: [],
    mobilizacao: 0,
    modalidadeESC: 'por_metro',
    incluirART: true,
    valorART: 108.39,
    condicoesPagamento: [
        { id: '1', descricao: 'Sinal / Entrada', percentual: 50, prazo: '3 dias após assinatura do contrato', formaPagamento: 'pix' },
        { id: '2', descricao: 'Saldo Final', percentual: 50, prazo: '7 dias após entrega da medição', formaPagamento: 'pix' },
    ],
    faturamentoMinimo: 8000,
    prazoExecucao: 30,
    dataPrevistaInicio: '',
    diasExecucao: 0
};

export const NovaProposta: React.FC<NovaPropostaProps> = ({ onNavigate, editPropostaId }) => {
    const { profile } = useAuth();
    const [step, setStep] = useState(1);
    const [data, setData] = useState<NovaPropostaData>(INITIAL_DATA);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!editPropostaId || !profile?.tenantId) {
            setData(INITIAL_DATA);
            setStep(1);
            return;
        }

        const fetchProposta = async () => {
            try {
                const docRef = doc(db, 'empresas', profile.tenantId, 'propostas', editPropostaId);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const obj = snapshot.data();
                    const prefilledData: NovaPropostaData = {
                        ...INITIAL_DATA,
                        tipo: obj.tipo,
                        clienteId: obj.clienteId,
                        clienteNome: obj.clienteNome,
                        enderecoObra: obj.enderecoObra || INITIAL_DATA.enderecoObra,
                        observacoes: obj.observacoes || '',
                        validadeProposta: obj.validadeProposta || 30,
                        mobilizacao: obj.valorMobilizacao || 0,
                        faturamentoMinimo: obj.faturamentoMinimo || (obj.tipo === 'HCM' ? 8000 : obj.tipo === 'ESC' ? 3000 : 0),
                        prazoExecucao: obj.prazoExecucao || 30,
                        dataPrevistaInicio: obj.dataPrevistaInicio || '',
                        diasExecucao: obj.diasExecucao || 0,
                    };

                    if (obj.tipo === 'HCM') {
                        prefilledData.itens = obj.itensHCM || [];
                        prefilledData.mobilizacao = obj.mobilizacaoHCM || prefilledData.mobilizacao;
                    } else if (obj.tipo === 'ESC') {
                        prefilledData.itens = obj.itensESC || [];
                        prefilledData.mobilizacao = obj.mobilizacaoESC || prefilledData.mobilizacao;
                        prefilledData.modalidadeESC = obj.modalidadeESC || 'por_metro';
                        prefilledData.precoFechadoESC = obj.precoFechado;
                        prefilledData.metrosDiariosESC = obj.metrosDiarios;
                        prefilledData.precoExcedenteESC = obj.precoExcedente;
                    } else if (obj.tipo === 'SPT') {
                        prefilledData.itens = obj.itensSPT || [];
                        prefilledData.mobilizacao = obj.mobilizacaoSPT || prefilledData.mobilizacao;
                        prefilledData.incluirART = obj.incluirART;
                        prefilledData.valorART = obj.valorART || 0;
                    }

                    setData(prefilledData);
                    setStep(1);
                }
            } catch (error) {
                console.error("Erro ao carregar proposta: ", error);
                setToast({ message: 'Erro ao carregar dados da proposta.', type: 'error' });
            }
        };

        fetchProposta();
    }, [editPropostaId, profile?.tenantId]);

    const updateData = (partial: Partial<NovaPropostaData>) => setData(d => ({ ...d, ...partial }));

    const handleNext = () => {
        if (step === 1 && !data.tipo) return;
        if (step === 2 && (!data.clienteId || !data.enderecoObra.cidade || !data.enderecoObra.estado)) {
            setToast({ message: 'Preencha o cliente, a cidade e o estado (UF) da obra.', type: 'error' });
            return;
        }
        setStep(s => s + 1);
    };

    const handleSave = async (status: 'RASCUNHO' | 'ACEITA') => {
        if (!profile?.tenantId) return;
        setIsSaving(true);
        try {
            // Formata os dados pro Firestore de acordo om o tipo de serviço, ignorando o resto
            const payload: any = {
                tipo: data.tipo,
                clienteId: data.clienteId,
                clienteNome: data.clienteNome,
                enderecoObra: data.enderecoObra,
                observacoes: data.observacoes,
                validadeProposta: data.validadeProposta,
                prazoExecucao: data.prazoExecucao,
                dataPrevistaInicio: data.dataPrevistaInicio,
                diasExecucao: data.diasExecucao,
                faturamentoMinimo: data.faturamentoMinimo,
                tenantId: profile.tenantId,
                criadoPor: profile.nome || 'Sistema'
            };

            // Importar calcularProposta functions do util pra setar Totais Corretos
            const { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } = await import('../utils/calculosProposta');
            let calc: any = {};

            if (data.tipo === 'HCM') {
                payload.itensHCM = data.itens;
                payload.mobilizacaoHCM = data.mobilizacao;
                calc = calcularPropostaHCM(data.itens, data.mobilizacao, data.faturamentoMinimo);
            } else if (data.tipo === 'ESC') {
                payload.itensESC = data.itens;
                payload.mobilizacaoESC = data.mobilizacao;
                payload.modalidadeESC = data.modalidadeESC;
                payload.precoFechado = data.precoFechadoESC;
                payload.metrosDiarios = data.metrosDiariosESC;
                payload.precoExcedente = data.precoExcedenteESC;
                calc = calcularPropostaESC(data.itens, data.mobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo);
            } else if (data.tipo === 'SPT') {
                payload.itensSPT = data.itens;
                payload.mobilizacaoSPT = data.mobilizacao;
                payload.incluirART = data.incluirART;
                payload.valorART = data.incluirART ? data.valorART : 0;
                calc = calcularPropostaSPT(data.itens, data.mobilizacao, data.incluirART, data.valorART);
            }

            payload.subtotalExecucao = calc.subtotalExecucao;
            payload.valorMobilizacao = calc.valorMobilizacao;
            payload.valorTotal = calc.valorTotal;
            payload.valorSinal = calc.valorSinal;
            payload.valorSaldo = calc.valorSaldo;
            payload.condicoesPagamento = data.condicoesPagamento?.length
                ? data.condicoesPagamento
                : calc.condicoesPagamento;
            payload.status = status;

            if (editPropostaId) {
                await atualizarProposta(profile.tenantId, editPropostaId, payload);
                setToast({ message: 'Proposta atualizada com sucesso!', type: 'success' });
            } else {
                await criarProposta(profile.tenantId, payload);
                setToast({ message: 'Proposta salva com sucesso!', type: 'success' });
            }

            setTimeout(() => {
                onNavigate('PROPOSALS'); // Volta pra listagem
            }, 1500);

        } catch (error) {
            console.error(error);
            setToast({ message: 'Erro ao salvar a proposta.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {toast && <Toast message={toast.message} variant={toast.type === 'error' ? 'destructive' : 'success'} onClose={() => setToast(null)} />}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {editPropostaId ? 'Editar Proposta Comercial' : 'Nova Proposta Comercial'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {editPropostaId ? 'Ajuste os valores, documentação ou escopo.' : 'Crie um orçamento preciso e documentado'}
                    </p>
                </div>
            </div>

            {/* STEPPER UI */}
            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-200 -z-10 -translate-y-1/2"></div>
                <div className="absolute left-0 top-1/2 h-1 bg-indigo-600 -z-10 -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}% ` }}></div>

                {[
                    { num: 1, label: 'Serviço' },
                    { num: 2, label: 'Cliente & Obra' },
                    { num: 3, label: 'Itens' },
                    { num: 4, label: 'Revisão' }
                ].map((s) => (
                    <div key={s.num} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 border-white
              ${step >= s.num ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} `}>
                            {s.num}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${step >= s.num ? 'text-indigo-800' : 'text-slate-400'} `}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* STEPS CONTENT */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
                {step === 1 && <Step1TipoServico tipo={data.tipo} onSelect={t => updateData({ tipo: t })} />}
                {step === 2 && <Step2ClienteObra data={data} updateData={updateData} />}
                {step === 3 && <Step3ItensServico data={data} updateData={updateData} />}
                {step === 4 && <Step4Revisao data={data} updateData={updateData} onSave={handleSave} isSaving={isSaving} />}
            </div>

            {/* NAVBAR BOTTOM */}
            <div className="flex justify-between mt-8">
                <Button
                    variant="outline"
                    onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate('PROPOSALS')}
                    className="gap-2 text-slate-600 hover:text-slate-800"
                >
                    <ChevronLeft size={18} /> {step === 1 ? 'Cancelar' : 'Voltar'}
                </Button>

                {step < 4 && (
                    <Button
                        onClick={handleNext}
                        disabled={step === 1 && !data.tipo}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 gap-2 shadow-sm"
                    >
                        Próximo Passo <ChevronRight size={18} />
                    </Button>
                )}
            </div>
        </div>
    );
};
