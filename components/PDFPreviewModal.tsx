// src/components/PDFPreviewModal.tsx
// CORREÇÃO: substitui PDFViewer (instável no React 19) por BlobProvider + iframe nativo

import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui';
import { montarTituloProposta, montarNomeArquivoProposta } from '../src/utils/formatters';
import { generatePropostaBlob, DownloadPropostaPDF } from '../src/services/pdfService';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    propostaData: any;
    cliente: any;
    empresa: any;
    tenantId?: string;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
    isOpen,
    onClose,
    propostaData,
    cliente,
    empresa,
    tenantId,
}) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generatePreview = async () => {
        if (!isOpen || !propostaData) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Re-adapt data here as it did before or rely on generatePropostaBlob internally adapting
            const blob = await generatePropostaBlob(propostaData, tenantId);
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
        } catch (err: any) {
            console.error('Erro ao gerar preview do PDF', err);
            setError(err.message || 'Erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            generatePreview();
        } else {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
            }
        }
        
        return () => {
            if (blobUrl) {
                 URL.revokeObjectURL(blobUrl);
            }
        };
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

    const nomeArquivo = montarNomeArquivoProposta(adaptedProposta, adaptedCliente);
    const tituloExibicao = montarTituloProposta(adaptedProposta, adaptedCliente);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Visualização da Proposta</h3>
                        <p className="text-sm text-slate-500">
                            {tituloExibicao}
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
                <div className="flex-1 bg-slate-200 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white/80">
                            <Loader2 size={36} className="animate-spin text-indigo-600" />
                            <p className="text-sm font-medium">Gerando visualização...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-500 bg-white">
                            <AlertCircle size={36} />
                            <p className="text-sm font-medium">Erro ao gerar o PDF.</p>
                            <p className="text-xs text-slate-400 mb-4">
                                {error}
                            </p>
                            <Button onClick={generatePreview} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                                Tentar Novamente
                            </Button>
                        </div>
                    )}

                    {!loading && !error && blobUrl && (
                        <iframe
                            src={blobUrl}
                            title="Visualização da Proposta"
                            width="100%"
                            height="100%"
                            style={{ border: 'none', display: 'block', minHeight: '600px' }}
                        />
                    )}
                </div>

                {/* Footer com download */}
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center px-6">
                    <DownloadPropostaPDF data={propostaData} tenantId={tenantId} />

                    <Button onClick={onClose} variant="outline" className="px-8">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
};
