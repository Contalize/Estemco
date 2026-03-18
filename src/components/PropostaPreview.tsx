import React from 'react';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

    const totalMetros = data.itens.reduce((acc, item) => acc + (item.totalMetros || 0), 0);
    const totalGeral = data.itens.reduce((acc, item) => acc + (item.total || 0), 0) + (data.mobilizacao || 0) + (data.incluirART ? (data.valorART || 0) : 0);

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
                                    <td className="py-2 px-3">{item.descricao}</td>
                                    <td className="py-2 px-3 text-center">{item.diametro || '---'}</td>
                                    <td className="py-2 px-3 text-center">{item.quantidadeEstacas || item.quantidade || 0}</td>
                                    <td className="py-2 px-3 text-center">{item.comprimentoUnitario || item.profundidade || 0}</td>
                                    <td className="py-2 px-3 text-right font-medium">{item.totalMetros || 0}m</td>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="p-3 bg-indigo-600 text-white rounded-md text-center md:col-start-3">
                        <p className="text-[10px] opacity-80 uppercase font-bold">Valor Total Estimado</p>
                        <p className="text-lg font-bold">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <div className="text-sm space-y-2">
                    <p className="font-bold text-slate-400 text-[10px] uppercase">Condições de Pagamento</p>
                    <div className="grid grid-cols-1 gap-2">
                        {data.condicoesPagamento.map((cp, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded">
                                <span className="font-medium text-slate-700">{cp.descricao} ({cp.percentual}%)</span>
                                <span className="text-slate-500">{cp.prazo} - Via {cp.formaPagamento.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="text-[10px] text-slate-400 border-t pt-4">
                <p>Validade desta proposta: {data.validadeProposta} dias úteis.</p>
                <p className="mt-1">Observações: {data.observacoes || 'Nenhuma observação adicional.'}</p>
            </div>
        </div>
    );
};
