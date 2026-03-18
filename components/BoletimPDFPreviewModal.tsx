import React from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { BoletimPDF } from './BoletimPDF';
import { Boletim } from '../types';
import { Button } from './ui';
import { X, FileDown, Printer } from 'lucide-react';

interface BoletimPDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bdo: Boletim;
}

export const BoletimPDFPreviewModal: React.FC<BoletimPDFPreviewModalProps> = ({ isOpen, onClose, bdo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Visualizar Boletim Diário</h3>
              <p className="text-xs text-slate-500 font-medium">{bdo.clienteNome} • {new Date(bdo.data).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<BoletimPDF bdo={bdo} />}
              fileName={`BDO_${bdo.clienteNome}_${new Date(bdo.data).toISOString().split('T')[0]}.pdf`}
            >
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9">
                 <FileDown size={18} /> Baixar PDF
              </Button>
            </PDFDownloadLink>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-800 p-4">
          <PDFViewer width="100%" height="100%" className="rounded shadow-lg border-0">
             <BoletimPDF bdo={bdo} />
          </PDFViewer>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-end items-center gap-4">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Visualização Prévia Estemco ERP</p>
          <Button variant="outline" onClick={onClose} className="h-9">Fechar</Button>
        </div>
      </div>
    </div>
  );
};
