import React, { useEffect } from 'react';
import { NovaPropostaData, ParcelaProposta } from '../../types/propostaForm';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT, fmt } from '../../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../../types';
import { Building2, Save, FileDown, Plus, Trash2, CreditCard, Eye } from 'lucide-react';
import { Button, Input, Label, Select } from '../../../components/ui';
import { PDFPreviewModal } from '../../PDFPreviewModal';
import { useAuth } from '../../../contexts/AuthContext';

interface Step4Props {
    data: NovaPropostaData;
    updateData: (d: Partial<NovaPropostaData>) => void;
    onSave: (status: 'RASCUNHO' | 'ACEITA') => void;
    isSaving: boolean;
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

export const Step4Revisao: React.FC<Step4Props> = ({ data, updateData, onSave, isSaving }) => {
    const { profile } = useAuth();
    const [showPreview, setShowPreview] = React.useState(false);
    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorSinal: 0, valorSaldo: 0, condicoesPagamento: '' };

    if (data.tipo === 'HCM') calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao, data.faturamentoMinimo);
    if (data.tipo === 'ESC') calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo);
    if (data.tipo === 'SPT') calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao, data.incluirART, data.valorART);

    // Seed moved to NovaProposta.tsx INITIAL_DATA to ensure stability across renders

    const parcelas = data.condicoesPagamento || [];
    const totalPercentual = parcelas.reduce((a, p) => a + p.percentual, 0);
    const percentualOk = Math.abs(totalPercentual - 100) < 0.01;

    const addParcela = () => updateData({ condicoesPagamento: [...parcelas, newParcela()] });
    const removeParcela = (id: string) => updateData({ condicoesPagamento: parcelas.filter(p => p.id !== id) });
    const updateParcela = (id: string, field: keyof ParcelaProposta, value: any) =>
        updateData({ condicoesPagamento: parcelas.map(p => p.id === id ? { ...p, [field]: value } : p) });

    const condicoesPagamentoTexto = parcelas.map(p =>
        `${p.percentual}% (${FORMA_LABELS[p.formaPagamento]?.replace(/^[^ ]+ /, '')} — ${p.descricao}): ${p.prazo}`
    ).join(' + ');

    // Compute per-parcel values
    const parcelaValores = parcelas.map(p => ({
        ...p,
        valor: (p.percentual / 100) * calc.valorTotal,
    }));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Preview card */}
            <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumo da Proposta Comercial</p>
                        <h3 className="text-2xl font-bold text-slate-800">{data.clienteNome || 'Cliente não informado'}</h3>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Building2 size={16} /> {data.enderecoObra.cidade} / {data.enderecoObra.estado}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold font-mono rounded text-sm mb-2">{data.tipo}</span>
                        <p className="text-xs text-slate-400">Gerada eletronicamente</p>
                    </div>
                </div>

                {/* Line items */}
                <div className="p-6">
                    <div className="space-y-3 mb-8">
                        {calc.linhasDetalhadas.map((linha: any, i: number) => (
                            <div key={i} className={`flex justify-between items-center py-2 border-b border-slate-100 ${linha.destaque ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                                <span>{linha.descricao}</span>
                                <span className="font-mono">{fmt(linha.valor)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                            <span className="text-lg font-bold text-slate-700">VALOR TOTAL:</span>
                            <span className="text-2xl font-black text-slate-900">{fmt(calc.valorTotal)}</span>
                        </div>
                        {parcelaValores.length > 0 && (
                            <div className="pt-4 grid gap-2">
                                {parcelaValores.map((p, i) => (
                                    <div key={p.id} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{i + 1}. {p.descricao} ({p.percentual}%) — {FORMA_LABELS[p.formaPagamento]}</span>
                                        <span className="font-mono font-semibold text-slate-800">{fmt(p.valor)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment conditions text */}
                    <div className="mt-6 text-sm text-slate-600">
                        <p className="font-bold text-slate-800 mb-1">Condições de Pagamento:</p>
                        <p>{condicoesPagamentoTexto || calc.condicoesPagamento}</p>
                        <p className="mt-4"><span className="font-bold text-slate-800">Validade da Proposta:</span> {data.validadeProposta} dias úteis</p>
                        <p><span className="font-bold text-slate-800">Prazo de Execução:</span> {data.prazoExecucao} dias</p>
                    </div>
                </div>
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
                                <Input value={p.descricao} onChange={e => updateParcela(p.id, 'descricao', e.target.value)} className="h-8 text-xs" placeholder="Ex: Sinal, Medição 1..." />
                            </div>
                            {/* % */}
                            <div className="col-span-1">
                                <Label className="text-[10px] text-slate-400 mb-0.5">%</Label>
                                <div className="relative">
                                    <Input type="number" min="0" max="100" value={p.percentual} onChange={e => updateParcela(p.id, 'percentual', Number(e.target.value))} className="h-8 text-xs pr-4" />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                                </div>
                            </div>
                            {/* Forma de Pagamento */}
                            <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400 mb-0.5">Forma</Label>
                                <Select value={p.formaPagamento} onChange={e => updateParcela(p.id, 'formaPagamento', e.target.value)} className="h-8 text-xs">
                                    {Object.entries(FORMA_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </Select>
                            </div>
                            {/* Prazo */}
                            <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400 mb-0.5">Prazo</Label>
                                <Input value={p.prazo} onChange={e => updateParcela(p.id, 'prazo', e.target.value)} className="h-8 text-xs" placeholder="Ex: 3 dias após assinatura" />
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

                {/* Validade */}
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                    <Label className="font-medium text-slate-700 whitespace-nowrap">Validade da Proposta (dias úteis)</Label>
                    <Input type="number" min="1" value={data.validadeProposta} onChange={e => updateData({ validadeProposta: Number(e.target.value) })} className="w-24" />
                </div>
            </div>

            {/* Preview Modal */}
            <PDFPreviewModal 
                isOpen={showPreview} 
                onClose={() => setShowPreview(false)} 
                propostaData={data}
                cliente={{
                    nomeRazaoSocial: data.clienteNome,
                    enderecoObra: data.enderecoObra
                }}
                empresa={{
                    razaoSocial: profile?.nomeEmpresa || 'Estemco Engenharia',
                    cnpj: profile?.cnpjEmpresa || '57.486.102/0001-86'
                }}
            />

            {/* Actions */}
            <div className="flex gap-4 p-4 bg-slate-50 border rounded-lg justify-end">
                <Button onClick={() => setShowPreview(true)} variant="outline" className="gap-2 bg-white">
                    <Eye size={18} /> Visualizar Proposta
                </Button>
                <Button onClick={() => onSave('RASCUNHO')} disabled={isSaving || !percentualOk} variant="outline" className="gap-2 bg-white">
                    <Save size={18} /> Salvar Rascunho
                </Button>
                <Button onClick={() => onSave('ACEITA')} disabled={isSaving || !percentualOk} className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                    {isSaving ? 'Salvando...' : <><FileDown size={18} /> Salvar e Gerar PDF</>}
                </Button>
            </div>
        </div>
    );
};
