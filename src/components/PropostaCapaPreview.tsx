// src/components/PropostaCapaPreview.tsx
// Apresentação visual da capa da proposta (HTML/CSS — espelha a capa do PDF)

import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaPropostaData } from '../types/propostaForm';
import { DadosEmpresa } from '../hooks/useEmpresa';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';

interface PropostaCapaPreviewProps {
    data: NovaPropostaData;
    empresa?: DadosEmpresa;
    numeroDoc?: string;
}

const formatCurrency = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const TIPO_LABEL: Record<string, string> = {
    HCM: 'Hélice Contínua Monitorada',
    ESC: 'Estaca Escavada Mecanicamente',
    SPT: 'Sondagem de Reconhecimento SPT',
};

const TIPO_BADGE_COLOR: Record<string, string> = {
    HCM: 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30',
    ESC: 'bg-amber-500/20 text-amber-200 border border-amber-500/30',
    SPT: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30',
};

export const PropostaCapaPreview: React.FC<PropostaCapaPreviewProps> = ({ data, empresa, numeroDoc }) => {
    const itensNorm = data.itens || [];
    const mobilizacaoNorm = data.mobilizacao || 0;

    let calc: any = { valorTotal: 0 };
    try {
        if (data.tipo === 'HCM') calc = calcularPropostaHCM(itensNorm as ItemProposta[], mobilizacaoNorm, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'ESC') calc = calcularPropostaESC(itensNorm as ItemProposta[], mobilizacaoNorm, data.modalidadeESC || 'por_metro', data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
        if (data.tipo === 'SPT') calc = calcularPropostaSPT(itensNorm as ItemFuroSPT[], mobilizacaoNorm, data.incluirART, data.valorART || 0, data.emiteNotaFiscal, data.percentualImposto || 0);
    } catch { /* fallback */ }

    const numero = numeroDoc || `${data.tipo || 'ORÇ'}-RASCUNHO`;
    const dataEmissao = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const endObra = [data.enderecoObra?.cidade, data.enderecoObra?.estado].filter(Boolean).join(' / ');

    return (
        <div className="rounded-2xl overflow-hidden shadow-2xl font-sans select-none" style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #0f0e24 100%)' }}>

            {/* Topo */}
            <div className="px-10 py-8" style={{ background: 'rgba(49,46,129,0.6)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-2xl font-black text-indigo-900">E</span>
                    </div>
                    <div>
                        <h2 className="text-white font-black text-xl leading-tight">{empresa?.razaoSocial || 'ESTEMCO'}</h2>
                        <p className="text-indigo-300 text-xs tracking-widest uppercase mt-0.5">Engenharia em Fundações</p>
                    </div>
                </div>
            </div>

            {/* Corpo */}
            <div className="px-10 py-10 flex flex-col gap-6">

                {/* Tipo e badge */}
                <div className="flex items-center gap-3">
                    <span className="text-indigo-400 text-xs uppercase tracking-widest font-semibold">Proposta Comercial</span>
                    {data.tipo && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIPO_BADGE_COLOR[data.tipo] || ''}`}>
                            {data.tipo}
                        </span>
                    )}
                </div>

                <div>
                    <h1 className="text-white font-black text-3xl leading-tight">
                        {data.tipo ? TIPO_LABEL[data.tipo] : 'Serviço de Fundação'}
                    </h1>
                    <div className="w-14 h-1 bg-indigo-500 rounded-full mt-4" />
                </div>

                {/* Cliente */}
                <div>
                    <p className="text-indigo-400 text-xs uppercase tracking-widest mb-2">Apresentado a</p>
                    <p className="text-white font-bold text-xl">{data.clienteNome || '—'}</p>
                    {endObra && <p className="text-indigo-200 text-sm mt-1">Obra: {endObra}</p>}
                    {data.enderecoObra?.logradouro && (
                        <p className="text-indigo-300 text-xs mt-0.5">
                            {data.enderecoObra.logradouro}{data.enderecoObra.numero ? `, nº ${data.enderecoObra.numero}` : ''}
                        </p>
                    )}
                </div>

                {/* Card de valor */}
                <div className="rounded-xl p-6 flex justify-between items-center gap-4" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                    <div>
                        <p className="text-indigo-200 text-xs uppercase tracking-widest mb-1">Investimento Total Estimado</p>
                        <p className="text-emerald-300 font-black text-3xl leading-none">{formatCurrency(calc.valorTotal || 0)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-100 font-bold text-sm">Nº {numero}</p>
                        <p className="text-indigo-300 text-xs mt-1">Válida por {data.validadeProposta || 15} dias</p>
                        <p className="text-indigo-300 text-xs">Emitida em {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Rodapé */}
            <div className="px-10 py-5 flex justify-between items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div>
                    <p className="text-indigo-500 text-xs">{empresa?.endereco || 'Rod. Capitão Barduíno, Km 131 - Socorro/SP'}</p>
                    <p className="text-indigo-500 text-xs mt-0.5">
                        Tel: {empresa?.telefone || '(19) 3895-2630'} | {empresa?.email || 'contato@estemco.com.br'}
                    </p>
                </div>
                <p className="text-indigo-500 text-xs text-right">CNPJ: {empresa?.cnpj || '57.486.102/0001-86'}</p>
            </div>
        </div>
    );
};
