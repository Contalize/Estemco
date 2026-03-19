import React, { useEffect } from 'react';
import { NovaPropostaData, ParcelaProposta } from '../../types/propostaForm';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT, fmt } from '../../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../../types';
import { Building2, Save, FileDown, Plus, Trash2, CreditCard, Eye } from 'lucide-react';
import { Button, Input, Label, Select } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { PropostaPreview } from '../PropostaPreview';
import { DownloadPropostaPDF, generatePropostaBlob } from '../../services/pdfService';
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

const FORMA_LABELS: Record<ParcelaProposta['formaPagamento'], string> = {
    pix: '💚 PIX',
    boleto: '🏛️ Boleto',
    dinheiro: '💵 Dinheiro',
    transferencia: '🏦 Transferência (TED/DOC)',
    cartao: '💳 Cartão de Crédito',
    cheque: '📝 Cheque',
};

const newParcela = (): ParcelaProposta => ({
    id: Date.now().toString(),
    descricao: 'Sinal',
    percentual: 50,
    prazo: '3 dias após assinatura',
    formaPagamento: 'pix',
});

export const Step4Revisao: React.FC<Step4Props> = ({ data, updateData, onSave, isSaving, onNavigate }) => {
    const { profile } = useAuth();
    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorSinal: 0, valorSaldo: 0, condicoesPagamento: '' };

    try {
        if (data.tipo === 'HCM') calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao || 0, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'ESC') calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao || 0, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'SPT') calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao || 0, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch (e) {
        console.error("Erro nos cálculos de revisão:", e);
    }

    const parcelas = data.condicoesPagamento || [];
    const totalPercentual = parcelas.reduce((a, p) => a + (p.percentual || 0), 0);
    const percentualOk = Math.abs(totalPercentual - 100) < 0.01;

    const addParcela = () => updateData({ condicoesPagamento: [...parcelas, newParcela()] });
    const removeParcela = (id: string) => updateData({ condicoesPagamento: parcelas.filter(p => p.id !== id) });
    const updateParcela = (id: string, field: keyof ParcelaProposta, value: any) =>
        updateData({ condicoesPagamento: parcelas.map(p => p.id === id ? { ...p, [field]: value } : p) });

    const condicoesPagamentoTexto = (parcelas || []).map(p =>
        `${p.percentual || 0}% (${FORMA_LABELS[p.formaPagamento || 'pix']?.replace(/^[^ ]+ /, '')} — ${p.descricao || 'Sinal'}): ${p.prazo || 'A combinar'}`
    ).join(' + ');

    // Compute per-parcel values
    const parcelaValores = (parcelas || []).map(p => ({
        ...p,
        valor: ((p.percentual || 0) / 100) * (calc.valorTotal || 0),
    }));

    const handleSaveAndRedirect = async (status: 'RASCUNHO' | 'ACEITA') => {
        try {
            const propostaId = await onSave(status);
            if (propostaId) {
                if (status === 'ACEITA') {
                    // 1. Gerar o Blob
                    const blob = await generatePropostaBlob(data);
                    // 2. Upload para o Firebase Storage
                    const filename = `propostas/${propostaId}_${(data.clienteNome || 'Cliente').replace(/\s+/g, '_')}.pdf`;
                    const storageRef = ref(storage, filename);
                    await uploadBytes(storageRef, blob);
                    const downloadURL = await getDownloadURL(storageRef);
                    // 3. Salvar URL no Firestore
                    const propostaRef = doc(db, 'empresas', profile?.tenantId || '', 'propostas', propostaId);
                    await updateDoc(propostaRef, { pdfUrl: downloadURL });
                    // 4. Download local
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `ORC_${data.tipo || 'PROPOSTA'}_${(data.clienteNome || 'CLIENTE').replace(/\s+/g, '_')}.pdf`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
                
                // Feedback visual imediato e redirecionamento
                window.alert('Proposta salva com sucesso!');
                onNavigate('PROPOSALS');
            }
        } catch (error) {
            console.error('Erro ao salvar/gerar PDF:', error);
            alert('Erro ao processar a proposta.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Visual Preview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Eye size={18} className="text-indigo-600" /> Pré-visualização do PDF
                    </h3>
                    <DownloadPropostaPDF data={data} />
                </div>
                <PropostaPreview data={data} />
            </div>

            {/* ── Payment conditions editor ─────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard size={18} className="text-indigo-600" /> Condições de Pagamento</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Configure as parcelas, formas de pagamento e prazos desta proposta.</p>
                    </div>
                    <Button type="button" size="sm" onClick={addParcela} className="bg-indigo-600 text-white gap-1">
                        <Plus size={14} /> Adicionar Parcela
                    </Button>
                </div>

                <div className="space-y-3">
                    {parcelas.map((p, i) => (
                        <div key={p.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                            {/* Nº */}
                            <div className="col-span-1 text-xs font-black text-slate-400 text-center">{i + 1}</div>
                            {/* Descrição */}
                            <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400 mb-0.5">Descrição</Label>
                                <Input value={p.descricao || ''} onChange={e => updateParcela(p.id, 'descricao', e.target.value)} className="h-8 text-xs" placeholder="Ex: Sinal, Medição 1..." />
                            </div>
                            {/* % */}
                            <div className="col-span-1">
                                <Label className="text-[10px] text-slate-400 mb-0.5">%</Label>
                                <div className="relative">
                                    <Input type="number" min="0" max="100" value={p.percentual || 0} onChange={e => updateParcela(p.id, 'percentual', Number(e.target.value))} className="h-8 text-xs pr-4" />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                                </div>
                            </div>
                            {/* Forma de Pagamento */}
                            <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400 mb-0.5">Forma</Label>
                                <Select value={p.formaPagamento || 'pix'} onChange={e => updateParcela(p.id, 'formaPagamento', e.target.value)} className="h-8 text-xs">
                                    {Object.entries(FORMA_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </Select>
                            </div>
                            {/* Prazo */}
                            <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400 mb-0.5">Prazo</Label>
                                <Input value={p.prazo || ''} onChange={e => updateParcela(p.id, 'prazo', e.target.value)} className="h-8 text-xs" placeholder="Ex: 3 dias após assinatura" />
                            </div>
                            {/* Delete */}
                            <div className="col-span-1 flex justify-end">
                                <button type="button" onClick={() => removeParcela(p.id)} className="text-red-400 hover:text-red-600 p-1 rounded"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Validation */}
                <div className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-bold ${percentualOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    <span>Total das Parcelas: {totalPercentual}%</span>
                    <span>{percentualOk ? '✅ Correto (100%)' : '⚠️ Deve somar 100%'}</span>
                </div>

            </div>

            {/* Actions */}
            <div className="flex gap-4 p-4 bg-slate-50 border rounded-lg justify-end mt-8">
                <Button onClick={() => handleSaveAndRedirect('RASCUNHO')} disabled={isSaving || !percentualOk} variant="outline" className="gap-2 bg-white">
                    <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
                <Button 
                    onClick={() => handleSaveAndRedirect('ACEITA')} 
                    disabled={isSaving || !percentualOk} 
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                >
                    {isSaving ? 'Processando...' : <><FileDown size={18} /> Salvar e Gerar PDF</>}
                </Button>
            </div>
        </div>
    );
};
