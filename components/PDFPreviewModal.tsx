import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import ProposalPDF from './ProposalPDF';
import { X } from 'lucide-react';
import { Button } from './ui';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    propostaData: any;
    cliente: any;
    empresa: any;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, propostaData, cliente, empresa }) => {
    if (!isOpen) return null;

    // Adapt NovaPropostaData to what ProposalPDF expects
    const adaptedProposta = {
        ...propostaData,
        id: propostaData.id || 'NOVA-PROPOSTA',
        dataEmissao: new Date().toISOString(),
        servicos: propostaData.itens.map((item: any) => ({
            tipoEstaca: propostaData.tipo,
            diametro: item.diametro ? (item.diametro / 10).toString() : 'N/D',
            quantidade: item.quantidadeEstacas || 1,
            metragemPrevista: item.comprimentoUnitario || 0,
            precoMetro: item.precoMetro || 0,
            totalMetros: item.totalMetros || 0,
            subtotal: item.subtotal || 0,
        })),
        valorTotal: propostaData.valorTotal || 0,
        mobilizacao: propostaData.mobilizacao || 0,
        validadeDias: propostaData.validadeProposta || 30,
        prazoExecucao: propostaData.prazoExecucao || 30,
        faturamentoMinimo: propostaData.faturamentoMinimo || 0,
        // Default flags if not present
        solicitaNF: false,
        solicitaART: propostaData.incluirART || false,
        valorART: propostaData.valorART || 0,
    };

    const adaptedCliente = {
        nomeRazaoSocial: cliente.nomeRazaoSocial || cliente.clienteNome || 'Cliente não identificado',
        documento: cliente.documento || '00.000.000/0001-00',
        enderecoFaturamento: `${cliente.enderecoObra?.logradouro || ''}, ${cliente.enderecoObra?.numero || ''} - ${cliente.enderecoObra?.cidade || ''}/${cliente.enderecoObra?.estado || ''}`,
    };

    const adaptedEmpresa = empresa || {
        razaoSocial: 'ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA',
        cnpj: '57.486.102/0001-86',
        endereco: 'Rodovia Capitão Barduino, Km 131,5 - Socorro SP',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative border border-slate-200">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center sm:px-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Visualização da Proposta</h3>
                        <p className="text-sm text-slate-500">Confira se todos os dados estão corretos antes de salvar ou enviar.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 transition-colors">
                        <X size={24} className="text-slate-600" />
                    </Button>
                </div>
                
                <div className="flex-1 bg-slate-100 p-2 sm:p-6 overflow-hidden">
                    <PDFViewer width="100%" height="100%" className="rounded-lg shadow-inner border border-slate-200">
                        <ProposalPDF proposta={adaptedProposta} cliente={adaptedCliente} empresa={adaptedEmpresa} />
                    </PDFViewer>
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 sm:px-8">
                    <Button onClick={onClose} variant="outline" className="px-8">Fechar Visualização</Button>
                </div>
            </div>
        </div>
    );
};
