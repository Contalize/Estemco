// src/components/steps/Step4Revisao.tsx
// CORREÇÃO UX: condições de pagamento ANTES da pré-visualização
// O usuário configura → vê o PDF atualizado → salva

import React from 'react';
import { NovaPropostaData, ParcelaProposta } from '../../types/propostaForm';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../../types';
import { Save, Eye, FileText } from 'lucide-react';
import { Button, Label, Textarea } from '../../../components/ui';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmpresa } from '../../hooks/useEmpresa';
import { PropostaPreview } from '../PropostaPreview';
import { DownloadPropostaPDF, generatePropostaBlob } from '../../services/pdfService';
import { CondicioesPagamento } from './CondicioesPagamento';
import { storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Step4Props {
    data: NovaPropostaData;
    updateData: (d: Partial<NovaPropostaData>) => void;
    onSave: (status: 'RASCUNHO' | 'ACEITA', extraData?: any) => Promise<string | void>;
    isSaving: boolean;
    onNavigate: (tab: any) => void;
}

export const Step4Revisao: React.FC<Step4Props> = ({
    data, updateData, onSave, isSaving, onNavigate
}) => {
    const { profile } = useAuth();
    const { empresa } = useEmpresa();

    // Cálculo de totais
    let calc: any = {
        linhasDetalhadas: [], valorTotal: 0, valorSinal: 0,
        valorSaldo: 0, subtotalExecucao: 0, valorMobilizacao: 0,
        valorART: 0, valorImposto: 0,
    };
    try {
        if (data.tipo === 'HCM')
            calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao || 0, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'ESC')
            calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao || 0, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'SPT')
            calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao || 0, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch (e) {
        console.error('Erro nos cálculos do Step4:', e);
    }

    const parcelas: ParcelaProposta[] = data.condicoesPagamento || [];
    const totalPercentual = parcelas.reduce((a, p) => a + (p.percentual || 0), 0);
    const percentualOk = Math.abs(totalPercentual - 100) < 0.01;

    const handleSaveAndRedirect = async (status: 'RASCUNHO' | 'ACEITA') => {
        try {
            const propostaId = await onSave(status);
            if (propostaId) {
                if (status === 'ACEITA') {
                    try {
                        const blob = await generatePropostaBlob(data, profile?.tenantId, empresa || undefined);
                        // Comentado para evitar erro de CORS (não fará upload pro Storage agora)
                        // const filename = `propostas/${propostaId}_${(data.clienteNome || 'Cliente').replace(/\s+/g, '_')}.pdf`;
                        // const storageRef = ref(storage, filename);
                        // await uploadBytes(storageRef, blob);
                        // const downloadURL = await getDownloadURL(storageRef);
                        // const propostaRef = doc(db, 'empresas', profile?.tenantId || '', 'propostas', propostaId);
                        // await updateDoc(propostaRef, { pdfUrl: downloadURL });
                    } catch (pdfErr) {
                        console.warn('PDF não salvo no Storage (não crítico):', pdfErr);
                    }
                }
                // Redirection is now handled in NovaProposta.tsx's handleSave
            }
        } catch (error) {
            console.error('Erro ao salvar/gerar PDF:', error);
            toast.error('Erro ao processar a proposta. Verifique os dados e tente novamente.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* ── 1. CONDIÇÕES DE PAGAMENTO (primeiro — define o conteúdo do PDF) ── */}
            <CondicioesPagamento
                parcelas={parcelas}
                valorTotal={calc.valorTotal || 0}
                onChange={(p) => updateData({ condicoesPagamento: p as any })}
            />

            {/* ── 2. VALIDADE DA PROPOSTA ────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-6">
                <div className="flex-1">
                    <p className="font-medium text-slate-700 text-sm">Validade da Proposta</p>
                    <p className="text-xs text-slate-400">Após quantos dias a proposta expira</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={1}
                        max={60}
                        value={data.validadeProposta || 15}
                        onChange={e => updateData({ validadeProposta: Number(e.target.value) })}
                        className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-mono"
                    />
                    <span className="text-sm text-slate-500">dias</span>
                </div>
            </div>

            {/* ── 3. TEXTOS CONTRATUAIS (Edição Exclusiva desta Proposta) ──────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        <FileText size={18} className="text-indigo-600" />
                        Cláusulas e Condições Comerciais
                    </h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Edições exclusivas para esta proposta</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs font-semibold text-slate-600">Obrigações da Contratante</Label>
                        <Textarea 
                            className="min-h-[100px] text-xs mt-1" 
                            value={data.textoObrigacoesContratante || ''}
                            onChange={(e) => updateData({ textoObrigacoesContratante: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-600">Obrigações da Contratada</Label>
                        <Textarea 
                            className="min-h-[100px] text-xs mt-1" 
                            value={data.textoObrigacoesContratada || ''}
                            onChange={(e) => updateData({ textoObrigacoesContratada: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-600">Condições de Cobrança / Fat. Mínimo</Label>
                        <Textarea 
                            className="min-h-[80px] text-xs mt-1" 
                            value={data.textoCondicoesCobranca || ''}
                            onChange={(e) => updateData({ textoCondicoesCobranca: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-600">Direitos e Risco Geotécnico</Label>
                        <Textarea 
                            className="min-h-[80px] text-xs mt-1" 
                            value={data.textoDireitosRisco || ''}
                            onChange={(e) => updateData({ textoDireitosRisco: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Label className="text-xs font-semibold text-slate-600">Termo de Aceite</Label>
                        <Textarea 
                            className="min-h-[60px] text-xs mt-1" 
                            value={data.textoTermoAceite || ''}
                            onChange={(e) => updateData({ textoTermoAceite: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* ── 4. PRÉ-VISUALIZAÇÃO (depois de configurar — PDF correto) ─────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        <Eye size={18} className="text-indigo-600" />
                        Pré-visualização do PDF
                    </h3>
                    <DownloadPropostaPDF data={data} tenantId={profile?.tenantId} empresa={empresa || undefined} />
                </div>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <PropostaPreview data={data} />
                </div>
            </div>

            {/* ── 5. RESUMO FINANCEIRO ─────────────────────────────────────────── */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resumo Financeiro</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Execução', value: calc.subtotalExecucao },
                        { label: 'Mobilização', value: calc.valorMobilizacao },
                        { label: data.emiteNotaFiscal ? `NF (${data.percentualImposto}%)` : 'Impostos', value: calc.valorImposto },
                        { label: 'Total Final', value: calc.valorTotal, destaque: true },
                    ].map(({ label, value, destaque }) => (
                        <div key={label} className={`rounded-lg p-3 ${destaque ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>
                            <p className={`text-xs font-medium ${destaque ? 'text-indigo-200' : 'text-slate-500'}`}>{label}</p>
                            <p className={`text-base font-bold font-mono ${destaque ? 'text-white' : 'text-slate-800'}`}>
                                {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 6. AÇÕES ─────────────────────────────────────────────────────── */}
            <div className="flex gap-3 justify-end pt-2 pb-6">
                <Button
                    onClick={() => handleSaveAndRedirect('RASCUNHO')}
                    disabled={isSaving || !percentualOk}
                    variant="outline"
                    className="gap-2 bg-white min-w-[160px]"
                >
                    <Save size={16} />
                    {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
                <Button
                    onClick={() => handleSaveAndRedirect('ACEITA')}
                    disabled={isSaving || !percentualOk}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md min-w-[180px]"
                >
                    {isSaving ? 'Processando...' : 'Finalizar e Aprovar'}
                </Button>
            </div>

            {!percentualOk && parcelas.length > 0 && (
                <p className="text-center text-sm text-red-500 -mt-4">
                    As parcelas precisam somar 100% antes de salvar.
                </p>
            )}
        </div>
    );
};
