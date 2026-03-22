// src/components/steps/CondicioesPagamento.tsx
// Componente separado para condições de pagamento com presets da Estemco
// Substitua o bloco "Condições de Pagamento" inteiro dentro do Step4Revisao

import React from 'react';
import { Plus, Trash2, CreditCard, Zap } from 'lucide-react';
import { Button, Input, Label, Select } from '../../../components/ui'; // Corrected path to root components/ui

export interface ParcelaProposta {
    id: string;
    descricao: string;
    percentual: number;
    prazo: string;
    formaPagamento: 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'cartao' | 'cheque';
}

interface Props {
    parcelas: ParcelaProposta[];
    valorTotal: number;
    onChange: (parcelas: ParcelaProposta[]) => void;
}

// ── Presets padrão Estemco ────────────────────────────────────────────────────
const PRESETS = [
    {
        label: '50% + 50%',
        desc: 'Sinal + Medição',
        parcelas: [
            { descricao: 'Sinal / Entrada',  percentual: 50, prazo: '3 dias após assinatura do contrato',   formaPagamento: 'pix' as const },
            { descricao: 'Saldo Final',       percentual: 50, prazo: '7 dias após entrega da medição',      formaPagamento: 'pix' as const },
        ],
    },
    {
        label: '30% + 70%',
        desc: 'Sinal menor',
        parcelas: [
            { descricao: 'Sinal / Entrada',  percentual: 30, prazo: '3 dias após assinatura do contrato',   formaPagamento: 'pix' as const },
            { descricao: 'Saldo Final',       percentual: 70, prazo: '7 dias após entrega da medição',      formaPagamento: 'pix' as const },
        ],
    },
    {
        label: '100% Antecipado',
        desc: 'Pagamento total',
        parcelas: [
            { descricao: 'Pagamento Total',  percentual: 100, prazo: '3 dias após assinatura do contrato',  formaPagamento: 'pix' as const },
        ],
    },
    {
        label: '50% + 25% + 25%',
        desc: 'Três parcelas',
        parcelas: [
            { descricao: 'Sinal / Entrada',  percentual: 50, prazo: '3 dias após assinatura do contrato',   formaPagamento: 'pix' as const },
            { descricao: '1ª Medição',        percentual: 25, prazo: '3 dias após 1ª medição',              formaPagamento: 'pix' as const },
            { descricao: 'Saldo Final',       percentual: 25, prazo: '7 dias após entrega da medição',      formaPagamento: 'pix' as const },
        ],
    },
];

const FORMAS = [
    { value: 'pix',          label: '💚 PIX' },
    { value: 'transferencia', label: '🏦 TED / DOC' },
    { value: 'boleto',        label: '🏛️ Boleto' },
    { value: 'dinheiro',      label: '💵 Dinheiro' },
    { value: 'cartao',        label: '💳 Cartão de Crédito' },
    { value: 'cheque',        label: '📝 Cheque' },
];

const newParcela = (): ParcelaProposta => ({
    id: Date.now().toString() + Math.random(),
    descricao: 'Nova Parcela',
    percentual: 0,
    prazo: '',
    formaPagamento: 'pix',
});

const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CondicioesPagamento: React.FC<Props> = ({ parcelas, valorTotal, onChange }) => {
    const total = parcelas.reduce((s, p) => s + (p.percentual || 0), 0);
    const ok = Math.abs(total - 100) < 0.01;

    const applyPreset = (idx: number) => {
        const preset = PRESETS[idx].parcelas.map(p => ({
            ...p,
            id: Date.now().toString() + Math.random(),
        }));
        onChange(preset);
    };

    const add = () => onChange([...parcelas, newParcela()]);
    const remove = (id: string) => onChange(parcelas.filter(p => p.id !== id));
    const update = (id: string, field: keyof ParcelaProposta, value: any) =>
        onChange(parcelas.map(p => p.id === id ? { ...p, [field]: value } : p));

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        <CreditCard size={18} className="text-indigo-600" />
                        Condições de Pagamento
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Use um preset ou configure parcelas manualmente. Total deve somar 100%.
                    </p>
                </div>
                <Button type="button" size="sm" onClick={add}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs">
                    <Plus size={13} /> Adicionar Parcela
                </Button>
            </div>

            {/* Presets */}
            <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap size={11} /> Presets rápidos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESETS.map((preset, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => applyPreset(i)}
                            className="flex flex-col items-start p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                        >
                            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                                {preset.label}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Linhas de parcelas */}
            {parcelas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                    Nenhuma parcela. Use um preset acima ou clique em "Adicionar Parcela".
                </div>
            ) : (
                <div className="space-y-2">
                    {parcelas.map((p, i) => {
                        const valor = ((p.percentual || 0) / 100) * valorTotal;
                        return (
                            <div key={p.id}
                                className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg border border-slate-200">

                                {/* Número */}
                                <div className="col-span-1 text-center">
                                    <span className="text-xs font-black text-slate-400">{i + 1}</span>
                                </div>

                                {/* Descrição */}
                                <div className="col-span-3">
                                    <Label className="text-[10px] text-slate-400 mb-0.5 block">Descrição</Label>
                                    <Input
                                        value={p.descricao}
                                        onChange={e => update(p.id, 'descricao', e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Ex: Sinal, Medição..."
                                    />
                                </div>

                                {/* Percentual */}
                                <div className="col-span-2">
                                    <Label className="text-[10px] text-slate-400 mb-0.5 block">%</Label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={p.percentual}
                                            onChange={e => update(p.id, 'percentual', Number(e.target.value))}
                                            className="h-8 text-xs w-16"
                                        />
                                        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                                            {formatBRL(valor)}
                                        </span>
                                    </div>
                                </div>

                                {/* Forma */}
                                <div className="col-span-2">
                                    <Label className="text-[10px] text-slate-400 mb-0.5 block">Forma</Label>
                                    <Select
                                        value={p.formaPagamento}
                                        onChange={e => update(p.id, 'formaPagamento', e.target.value)}
                                        className="h-8 text-xs"
                                    >
                                        {FORMAS.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </Select>
                                </div>

                                {/* Prazo */}
                                <div className="col-span-3">
                                    <Label className="text-[10px] text-slate-400 mb-0.5 block">Prazo</Label>
                                    <Input
                                        value={p.prazo}
                                        onChange={e => update(p.id, 'prazo', e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Ex: 3 dias após assinatura"
                                    />
                                </div>

                                {/* Lixeira */}
                                <div className="col-span-1 flex justify-center pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => remove(p.id)}
                                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Barra de validação */}
            {parcelas.length > 0 && (
                <div className={`flex justify-between items-center px-4 py-2.5 rounded-lg text-sm font-bold
                    ${ok
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                    <span>Total das Parcelas: {total.toFixed(0)}%</span>
                    <span>
                        {ok
                            ? `✅ Correto (${formatBRL(valorTotal)})`
                            : `⚠️ Faltam ${(100 - total).toFixed(0)}% para somar 100%`
                        }
                    </span>
                </div>
            )}
        </div>
    );
};
