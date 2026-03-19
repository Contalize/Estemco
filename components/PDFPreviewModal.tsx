// src/components/PDFPreviewModal.tsx
// CORREÇÃO: substitui PDFViewer (instável no React 19) por BlobProvider + iframe nativo

import React, { useState, useEffect } from 'react';
import { BlobProvider, PDFDownloadLink } from '@react-pdf/renderer';
import ProposalPDF from './ProposalPDF';
import { X, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    propostaData: any;
    cliente: any;
    empresa: any;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
    isOpen,
    onClose,
    propostaData,
    cliente,
    empresa,
}) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    // Limpa o blob URL ao fechar para liberar memória
    useEffect(() => {
        if (!isOpen) {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Adapta dados do Firestore ou do wizard para o ProposalPDF ──────────
    const tipo = propostaData?.tipo || 'HCM';

    const itens =
        propostaData?.itens ||
        (tipo === 'HCM' ? propostaData?.itensHCM :
         tipo === 'ESC' ? propostaData?.itensESC :
         tipo === 'SPT' ? propostaData?.itensSPT : null) || [];

    const mobilizacao =
        propostaData?.mobilizacao ||
        (tipo === 'HCM' ? propostaData?.mobilizacaoHCM :
         tipo === 'ESC' ? propostaData?.mobilizacaoESC :
         tipo === 'SPT' ? propostaData?.mobilizacaoSPT : null) ||
        propostaData?.valorMobilizacao || 0;

    const adaptedProposta = {
        ...propostaData,
        id: propostaData?.numero || propostaData?.id || 'NOVA',
        dataEmissao: new Date().toISOString(),
        servicos: itens.map((item: any) => ({
            tipoEstaca: tipo,
            diametro: item?.diametro ? String(item.diametro / 10) : 'N/D',
            quantidade: item?.quantidadeEstacas || item?.quantidade || 1,
            metragemPrevista: item?.comprimentoUnitario || item?.profundidade || item?.metragemPrevista || 0,
            precoMetro: item?.precoMetro || 0,
            totalMetros: item?.totalMetros || item?.profundidade || 0,
            subtotal: item?.subtotal || 0,
        })),
        valorTotal: propostaData?.valorTotal || 0,
        mobilizacao,
        validadeDias: propostaData?.validadeProposta || propostaData?.validadeDias || 15,
        prazoExecucao: propostaData?.prazoExecucao || propostaData?.prazoExecucaoDias || 2,
        faturamentoMinimo: propostaData?.faturamentoMinimo || propostaData?.valorFaturamentoMinimo || 0,
        solicitaNF: propostaData?.emiteNotaFiscal || false,
        solicitaART: propostaData?.incluirART || false,
        valorART: propostaData?.valorART || 0,
        parcelas: Array.isArray(propostaData?.condicoesPagamento)
            ? propostaData.condicoesPagamento
            : [],
    };

    const adaptedCliente = {
        nomeRazaoSocial:
            cliente?.nomeRazaoSocial ||
            cliente?.clienteNome ||
            propostaData?.clienteNome ||
            'Cliente não identificado',
        documento: cliente?.documento || '—',
        enderecoFaturamento: [
            cliente?.enderecoObra?.logradouro || propostaData?.enderecoObra?.logradouro || '',
            cliente?.enderecoObra?.cidade || propostaData?.enderecoObra?.cidade || '',
            cliente?.enderecoObra?.estado || propostaData?.enderecoObra?.estado || '',
        ].filter(Boolean).join(', '),
    };

    const adaptedEmpresa = empresa || {
        razaoSocial: 'ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA',
        cnpj: '57.486.102/0001-86',
        endereco: 'Rodovia Capitão Barduino, Km 131,5 - Socorro SP',
    };

    const nomeArquivo = `ORC_${tipo}_${(adaptedCliente.nomeRazaoSocial).replace(/\s+/g, '_').substring(0, 30)}.pdf`;

    const documentoJSX = (
        <ProposalPDF
            proposta={adaptedProposta}
            cliente={adaptedCliente}
            empresa={adaptedEmpresa}
        />
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Visualização da Proposta</h3>
                        <p className="text-sm text-slate-500">
                            {adaptedProposta.id} — {adaptedCliente.nomeRazaoSocial}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full hover:bg-slate-200"
                    >
                        <X size={22} />
                    </Button>
                </div>

                {/* PDF via BlobProvider → iframe nativo (estável no React 19) */}
                <div className="flex-1 bg-slate-200 overflow-hidden">
                    <BlobProvider document={documentoJSX}>
                        {({ blob, url, loading, error }) => {
                            if (loading) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                                        <Loader2 size={36} className="animate-spin text-indigo-600" />
                                        <p className="text-sm font-medium">Gerando PDF da proposta...</p>
                                    </div>
                                );
                            }

                            if (error || !url) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-red-500">
                                        <AlertCircle size={36} />
                                        <p className="text-sm font-medium">Erro ao gerar o PDF.</p>
                                        <p className="text-xs text-slate-400">
                                            {error?.message || 'Verifique os dados da proposta e tente novamente.'}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <iframe
                                    src={url}
                                    title="Visualização da Proposta"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none', display: 'block' }}
                                />
                            );
                        }}
                    </BlobProvider>
                </div>

                {/* Footer com download */}
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center px-6">
                    <PDFDownloadLink document={documentoJSX} fileName={nomeArquivo}>
                        {({ loading: dlLoading }) => (
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                disabled={dlLoading}
                            >
                                {dlLoading
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <Download size={16} />
                                }
                                {dlLoading ? 'Preparando...' : 'Baixar PDF'}
                            </Button>
                        )}
                    </PDFDownloadLink>

                    <Button onClick={onClose} variant="outline" className="px-8">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
};
