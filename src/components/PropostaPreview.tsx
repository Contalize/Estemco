import React from 'react';
import { NovaPropostaData } from '../types/propostaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../utils/calculosProposta';
import { ItemProposta, ItemFuroSPT } from '../../types';
import { DadosEmpresa } from '../hooks/useEmpresa';

// Utilitários de Formatação locais para o Preview (Sincronizados com o PDF)
const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const formatMetersValue = (valor: number) => {
    if (valor === undefined || valor === null) return '0,00';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface PropostaPreviewProps {
    data: NovaPropostaData;
    empresa?: DadosEmpresa;
}

export const PropostaPreview: React.FC<PropostaPreviewProps> = ({ data, empresa }) => {
    // --- ADAPTER LAYER (Data Normalization) ---
    const listaServicos = (data as any)?.servicos || (data as any)?.itens || (data as any)?.itensHCM || (data as any)?.itensESC || (data as any)?.itensSPT || [];
    const valorMobilizacao = (data as any)?.mobilizacao || (data as any)?.valorMobilizacao || (data as any)?.mobilizacaoHCM || (data as any)?.mobilizacaoESC || (data as any)?.mobilizacaoSPT || 0;
    const taxaArt = (data as any)?.valorART || (data as any)?.taxaArt || 0;
    const nDiasExecucao = (data as any)?.diasExecucao || (data as any)?.prazoExecucao || 0;
    const dataInicioPrevisto = (data as any)?.inicioPrevisto || (data as any)?.dataPrevistaInicio || null;
    const listaParcelas = (data as any)?.parcelas || (data as any)?.condicoesPagamento || [];

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return 'A combinar';
        try {
            return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    let calc: any = { linhasDetalhadas: [], valorTotal: 0, valorMobilizacao: 0, valorART: 0, valorImposto: 0 };
    if (data.tipo === 'HCM') calc = calcularPropostaHCM(listaServicos as ItemProposta[], valorMobilizacao, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'ESC') calc = calcularPropostaESC(listaServicos as ItemProposta[], valorMobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC, data.faturamentoMinimo, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);
    if (data.tipo === 'SPT') calc = calcularPropostaSPT(listaServicos as ItemFuroSPT[], valorMobilizacao, data.incluirART, taxaArt, data.emiteNotaFiscal, data.percentualImposto);

    const totalMetros = listaServicos.reduce((acc: number, item: any) => acc + (item.totalMetros || item.profundidade || (item.quantidadeEstacas * item.comprimentoUnitario) || 0), 0);
    const tipoTexto = data.tipo === 'HCM' ? 'HÉLICE CONTÍNUA' : data.tipo === 'ESC' ? 'ESCAVADA' : 'SPT (SONDAGEM)';

    return (
        <div className="bg-white p-10 border border-slate-200 rounded-2xl shadow-lg space-y-8 text-slate-800 max-w-4xl mx-auto my-6 overflow-hidden font-sans">
            {/* Header Simulation */}
            <div className="flex justify-between items-start border-b-2 border-indigo-950 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-indigo-950 leading-tight">{empresa?.razaoSocial || 'ESTEMCO'}</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Engenharia de Fundações</p>
                    <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                        {empresa?.endereco || 'Rod. Capitão Barduíno, Km 131 - Socorro/SP'}{"\n"}
                        Tel: {empresa?.telefone || '(19) 3895-2630'} | {empresa?.email || 'contato@estemco.com.br'}
                    </p>
                </div>
                <div className="text-right text-sm">
                    <p className="font-black text-indigo-900 text-xs">PROPOSTA DE PRESTAÇÃO DE SERVIÇO</p>
                    <p className="text-slate-500 font-mono text-[10px] mt-1">Nº {data.tipo || '---'}-{format(new Date(), 'yyyyMMdd')}</p>
                    <p className="text-slate-500 text-[10px]">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                    <p className="text-indigo-600 font-bold text-[10px]">Validade: 15 dias</p>
                </div>
            </div>

            {/* Identification */}
            <div className="space-y-4">
                <h3 className="text-xs font-black bg-slate-100 p-2 border-l-4 border-indigo-950 text-indigo-950 uppercase">
                    I. PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE {tipoTexto}
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm ml-2">
                    <div className="flex gap-2">
                        <span className="font-bold text-slate-400 w-20 uppercase text-[10px]">Cliente:</span>
                        <span className="font-semibold">{data.clienteNome || 'Não selecionado'}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-slate-400 w-20 uppercase text-[10px]">Local:</span>
                        <div className="flex flex-col">
                            <span className="font-medium">{data.enderecoObra.logradouro}, {data.enderecoObra.numero}</span>
                            <span className="text-slate-500 text-xs">{data.enderecoObra.bairro} - {data.enderecoObra.cidade}/{data.enderecoObra.estado}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3">
                <h3 className="text-xs font-black bg-slate-100 p-2 border-l-4 border-indigo-950 text-indigo-950 uppercase">
                    II. ESPECIFICAÇÕES TÉCNICAS
                </h3>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b">
                                <th className="text-left py-3 px-4 font-black text-slate-500">DESCRIÇÃO</th>
                                <th className="text-center py-3 px-4 font-black text-slate-500">DIÂMETRO</th>
                                <th className="text-center py-3 px-4 font-black text-slate-500">QTD</th>
                                <th className="text-right py-3 px-4 font-black text-slate-500">COMP. (m)</th>
                                <th className="text-right py-3 px-4 font-black text-slate-500">TOTAL (m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaServicos.map((item: any, idx: number) => {
                                const qtd = item.quantidadeEstacas || item.quantidade || (data.tipo === 'SPT' ? 1 : 0);
                                const metros = item.comprimentoUnitario || item.profundidade || item.totalMetros || 0;
                                return (
                                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-4 font-medium">{item.descricao || (data.tipo === 'SPT' ? `Furo ${item.numeroFuro}` : 'Peça de fundação')}</td>
                                        <td className="py-2.5 px-4 text-center text-slate-600">{item.diametro ? `${item.diametro} mm` : '---'}</td>
                                        <td className="py-2.5 px-4 text-center font-bold text-indigo-600">{qtd}</td>
                                        <td className="py-2.5 px-4 text-right">{formatMetersValue(metros)}</td>
                                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatMetersValue(qtd * metros)} m</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end p-2">
                    <p className="text-xs font-black text-indigo-950 uppercase tracking-tighter">
                        Metragem Total Estimada: <span className="text-lg ml-2 underline decoration-indigo-300">{formatMetersValue(totalMetros)} m</span>
                    </p>
                </div>
            </div>

            {/* Execution Terms */}
            <div className="space-y-3">
                <h3 className="text-xs font-black bg-slate-100 p-2 border-l-4 border-indigo-950 text-indigo-950 uppercase">
                    III. PRAZO DE EXECUÇÃO
                </h3>
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm leading-relaxed text-indigo-950">
                    Levando em conta o quantitativo apresentado, o prazo de execução para esta referida obra será de <span className="font-black">{nDiasExecucao} dias úteis</span>. 
                    O início das atividades está previsto para o dia: <span className="font-black">{formatDate(dataInicioPrevisto)}</span>.
                </div>
            </div>

            {/* Responsibilities */}
            <div className="space-y-3">
                <h3 className="text-xs font-black bg-slate-100 p-2 border-l-4 border-indigo-950 text-indigo-950 uppercase">
                    IV. RESPONSABILIDADES CONTRATUAIS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-900 underline uppercase">PROPONENTE (ESTEMCO)</p>
                        <ul className="text-[11px] text-slate-600 space-y-1">
                            <li className="flex gap-2"><span>•</span> Mão-de-obra, ferramentas e equipamentos qualificados.</li>
                            <li className="flex gap-2"><span>•</span> Fornecimento e uso obrigatório de EPIs.</li>
                            {data.incluirART && <li className="flex gap-2 text-indigo-800 font-bold"><span>•</span> Recolhimento de ART (Anotação de Responsabilidade Técnica).</li>}
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 underline uppercase">CONTRATANTE (CLIENTE)</p>
                        <ul className="text-[11px] text-slate-600 space-y-1">
                            <li className="flex gap-2"><span>•</span> Limpeza, desobstrução e nivelamento de terreno.</li>
                            <li className="flex gap-2"><span>•</span> Locação precisa dos eixos conforme projeto.</li>
                            <li className="flex gap-2"><span>•</span> Pontos de água e energia próximos à execução.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Values */}
            <div className="space-y-4">
                <h3 className="text-xs font-black bg-slate-100 p-2 border-l-4 border-indigo-950 text-indigo-950 uppercase">
                    V. INVESTIMENTO E CONDIÇÕES
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl text-center bg-slate-50/30">
                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Mobilização</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(valorMobilizacao)}</p>
                    </div>
                    {data.incluirART && (
                        <div className="p-4 border border-slate-200 rounded-xl text-center bg-slate-50/30">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Taxa ART</p>
                            <p className="text-lg font-bold text-slate-700">{formatCurrency(taxaArt)}</p>
                        </div>
                    )}
                    {data.emiteNotaFiscal && (
                        <div className="p-4 border border-slate-200 rounded-xl text-center bg-slate-50/30">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Impostos ({data.percentualImposto}%)</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(calc.valorImposto)}</p>
                        </div>
                    )}
                    <div className="p-5 bg-indigo-950 text-white rounded-xl text-center shadow-xl transform scale-105 border-2 border-indigo-800 flex flex-col justify-center">
                        <p className="text-[9px] opacity-70 uppercase font-black mb-1">Total Final Estimado</p>
                        <p className="text-xl font-black">{formatCurrency(calc.valorTotal)}</p>
                    </div>
                </div>
                
                <div className="text-xs space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-1">
                        <p className="font-black text-slate-400 text-[9px] uppercase tracking-widest">Faturamento e Notas</p>
                        <p className="text-slate-600 italic">
                            {data.emiteNotaFiscal ? `Inclusa emissão de NF com incidência de ${data.percentualImposto}% de impostos.` : 'Valores sem emissão de Nota Fiscal. Faturamento oficial sujeito a acréscimo tributário.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                        <p className="font-black text-slate-400 text-[9px] uppercase tracking-widest">Formas de Pagamento</p>
                        {listaParcelas.map((cp: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 shadow-sm">
                                <span className="font-bold text-indigo-950">{cp.descricao} ({cp.percentual}%)</span>
                                <span className="font-black text-slate-900">{formatCurrency((cp.percentual/100) * calc.valorTotal)}</span>
                                <span className="text-slate-400 font-medium">{cp.prazo} - {(cp.formaPagamento || '').toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Final Acceptance Term */}
            <div className="pt-8 border-t-2 border-slate-100">
                <h4 className="text-center font-black text-indigo-950 text-xs mb-4 uppercase">Termo de Aceitação da Proposta</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed text-center px-12 italic">
                    Ao assinar, o cliente declara concordância com as especificações, prazos e responsabilidades aqui descritas.
                    Esta proposta serve como contrato de prestação de serviços após formalização do aceite.
                </p>
                <div className="grid grid-cols-2 gap-20 mt-12 px-10">
                    <div className="text-center border-t border-slate-900 pt-2">
                        <p className="text-[10px] font-black uppercase text-indigo-950">Estemco Engenharia</p>
                        <p className="text-[8px] text-slate-400">Socorro - SP</p>
                    </div>
                    <div className="text-center border-t border-slate-900 pt-2">
                        <p className="text-[10px] font-black uppercase text-indigo-950">{data.clienteNome || 'Cliente'}</p>
                        <p className="text-[8px] text-slate-400">CPF/CNPJ: ________________</p>
                    </div>
                </div>
            </div>
            
            <div className="text-[9px] text-slate-300 text-center pt-6">
                Gerado eletronicamente em {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
        </div>
    );
};
