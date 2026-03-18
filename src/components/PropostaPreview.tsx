import React from 'react';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';

interface PropostaPreviewProps {
    data: NovaPropostaData;
}

export const PropostaPreview: React.FC<PropostaPreviewProps> = ({ data }) => {
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'A combinar';
        try {
            return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorMobilizacao: 0, valorART: 0, valorImposto: 0 };
    if (data.tipo === 'HCM') calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao, data.faturamentoMinimo, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'ESC') calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'SPT') calc = calcularPropostaSPT(data.itens as ItemFuroSPT[], data.mobilizacao, data.incluirART, data.valorART, data.emiteNotaFiscal, data.percentualImposto);

    const totalMetros = data.itens.reduce((acc, item) => acc + (item.totalMetros || item.profundidade || 0), 0);

    return (
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm space-y-8 text-slate-800 max-w-4xl mx-auto my-4 overflow-hidden">
            {/* Header Simulation */}
            <div className="flex justify-between items-start border-b pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900 leading-tight">ESTEMCO</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Engenharia de Fundações</p>
                </div>
                <div className="text-right text-sm">
                    <p className="font-bold">PROPOSTA DE PRESTAÇÃO DE SERVIÇO</p>
                    <p className="text-slate-500">Nº {data.tipo || '---'}-PREVIEW</p>
                    <p className="text-slate-500">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </div>

            {/* Identification */}
            <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase">Cliente</p>
                    <p className="font-semibold text-base">{data.clienteNome || 'Não selecionado'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase">Local da Obra</p>
                    <p className="font-semibold">{data.enderecoObra.logradouro}, {data.enderecoObra.numero}</p>
                    <p className="text-slate-600">{data.enderecoObra.bairro} - {data.enderecoObra.cidade}/{data.enderecoObra.estado}</p>
                </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 uppercase tracking-wide">Especificações Técnicas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="text-left py-2 px-3 font-bold">Descrição</th>
                                <th className="text-center py-2 px-3 font-bold">Ø (mm)</th>
                                <th className="text-center py-2 px-3 font-bold">Qtd</th>
                                <th className="text-center py-2 px-3 font-bold">Comp. (m)</th>
                                <th className="text-right py-2 px-3 font-bold">Total (m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.itens.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-2 px-3">{item.descricao || (data.tipo === 'SPT' ? `Furo ${item.numeroFuro}` : 'Item de Serviço')}</td>
                                    <td className="py-2 px-3 text-center">{item.diametro || '---'}</td>
                                    <td className="py-2 px-3 text-center">{item.quantidadeEstacas || item.quantidade || 0 || (data.tipo === 'SPT' ? 1 : 0)}</td>
                                    <td className="py-2 px-3 text-center">{item.comprimentoUnitario || item.profundidade || 0}</td>
                                    <td className="py-2 px-3 text-right font-medium">{item.totalMetros || item.profundidade || 0}m</td>
                                </tr>
                            ))}
                            {data.itens.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-slate-400 italic">Nenhum item adicionado</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                            <tr>
                                <td colSpan={4} className="py-2 px-3 text-right uppercase text-xs">Metragem Total Estimada:</td>
                                <td className="py-2 px-3 text-right">{totalMetros}m</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Execution Terms */}
            <div className="space-y-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Prazo de Execução e Início</h3>
                <p className="text-sm text-indigo-900 leading-relaxed">
                    Levando em conta o quantitativo acima, o prazo de execução será de <span className="font-bold">{data.diasExecucao || 0} dias úteis</span>. 
                    O início das atividades está previsto para: <span className="font-bold">{formatDate(data.dataPrevistaInicio)}</span>.
                </p>
                {data.textoPrazoExecucao && (
                    <p className="text-xs text-indigo-700 italic mt-1">{data.textoPrazoExecucao}</p>
                )}
            </div>

            {/* Values */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 uppercase tracking-wide">Investimento e Condições</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 border border-slate-200 rounded-md text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Mobilização</p>
                        <p className="text-lg font-bold">R$ {data.mobilizacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {data.incluirART && (
                        <div className="p-3 border border-slate-200 rounded-md text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Taxa ART</p>
                            <p className="text-lg font-bold">R$ {data.valorART.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                    {data.emiteNotaFiscal && (
                        <div className="p-3 border border-slate-200 rounded-md text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Impostos ({data.percentualImposto}%)</p>
                            <p className="text-lg font-bold text-red-600">R$ {calc.valorImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                    <div className="p-4 bg-indigo-900 text-white rounded-md text-center shadow-lg transform scale-105">
                        <p className="text-[10px] opacity-80 uppercase font-bold">Valor Total Final</p>
                        <p className="text-xl font-black">R$ {calc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <div className="text-sm space-y-2">
                    <p className="font-bold text-slate-400 text-[10px] uppercase">Condições de Pagamento</p>
                    <div className="grid grid-cols-1 gap-2">
                        {data.condicoesPagamento.map((cp, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded">
                                <span className="font-medium text-slate-700">{cp.descricao} ({cp.percentual}%)</span>
                                <span className="text-slate-900 font-bold">R$ {((cp.percentual/100) * calc.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className="text-slate-500 whitespace-nowrap ml-4">{cp.prazo} - {cp.formaPagamento.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Clauses */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cláusulas e Observações</h3>
                <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed">
                    {data.incluirART && (
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                            <p><b>ART (Anotação de Responsabilidade Técnica):</b> A responsabilidade técnica pela execução dos serviços será comprovada mediante recolhimento de ART junto ao CREA, cujo valor está incluso nesta proposta.</p>
                        </div>
                    )}
                    {data.emiteNotaFiscal ? (
                        <div className="flex gap-2 text-indigo-900 bg-indigo-50/50 p-2 rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1 shrink-0" />
                            <p><b>FATURAMENTO:</b> A ESTEMCO emitirá Nota Fiscal de Prestação de Serviços correspondente aos valores faturados, com a incidência de {data.percentualImposto}% de impostos já inclusos no valor total.</p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                            <p><b>IMPOSTOS:</b> Os valores apresentados NÃO contemplam a emissão de Nota Fiscal. Caso haja necessidade de faturamento oficial, será acrescida a carga tributária correspondente.</p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                        <p><b>VALIDADE:</b> Proposta válida por {data.validadeProposta} dias úteis a partir desta data.</p>
                    </div>
                    {data.observacoes && (
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                            <p><b>OBSERVAÇÕES ADICIONAIS:</b> {data.observacoes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
