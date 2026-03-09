import React from 'react';
import { TipoServico } from '../../../types';
import { Card } from '../../../components/ui';
import { Drill, Factory, Activity } from 'lucide-react';

interface Step1Props {
    tipo: TipoServico | null;
    onSelect: (t: TipoServico) => void;
}

export const Step1TipoServico: React.FC<Step1Props> = ({ tipo, onSelect }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Selecione o Tipo de Serviço</h2>
                <p className="text-slate-500">Escolha o equipamento que será utilizado na obra.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* HCM */}
                <Card
                    className={`p-6 cursor-pointer border-2 transition-all hover:-translate-y-1 ${tipo === 'HCM' ? 'border-[#1a6b8a] bg-blue-50/50' : 'border-slate-200 hover:border-[#1a6b8a]/50'}`}
                    onClick={() => onSelect('HCM')}
                >
                    <div className="w-12 h-12 bg-[#1a6b8a]/10 rounded-xl flex items-center justify-center text-[#1a6b8a] mb-4">
                        <Factory size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">HCM</h3>
                    <p className="text-sm font-medium text-slate-500 mb-4 h-10">Hélice Contínua Monitorada</p>
                    <ul className="text-xs text-slate-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-[#1a6b8a] mt-0.5">•</span>
                            Mínimo diário R$ 8.000
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#1a6b8a] mt-0.5">•</span>
                            Mobilização R$ 4.000
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#1a6b8a] mt-0.5">•</span>
                            50% Assinatura + 50% Medição
                        </li>
                    </ul>
                </Card>

                {/* ESC */}
                <Card
                    className={`p-6 cursor-pointer border-2 transition-all hover:-translate-y-1 ${tipo === 'ESC' ? 'border-[#8a4a1a] bg-amber-50/50' : 'border-slate-200 hover:border-[#8a4a1a]/50'}`}
                    onClick={() => onSelect('ESC')}
                >
                    <div className="w-12 h-12 bg-[#8a4a1a]/10 rounded-xl flex items-center justify-center text-[#8a4a1a] mb-4">
                        <Drill size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">ESC</h3>
                    <p className="text-sm font-medium text-slate-500 mb-4 h-10">Estaca Escavada Mecanicamente</p>
                    <ul className="text-xs text-slate-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-[#8a4a1a] mt-0.5">•</span>
                            Mínimo da obra R$ 3.000
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#8a4a1a] mt-0.5">•</span>
                            Mobilização R$ 500
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#8a4a1a] mt-0.5">•</span>
                            Hora parada R$ 500/h
                        </li>
                    </ul>
                </Card>

                {/* SPT */}
                <Card
                    className={`p-6 cursor-pointer border-2 transition-all hover:-translate-y-1 ${tipo === 'SPT' ? 'border-[#2a7a3b] bg-green-50/50' : 'border-slate-200 hover:border-[#2a7a3b]/50'}`}
                    onClick={() => onSelect('SPT')}
                >
                    <div className="w-12 h-12 bg-[#2a7a3b]/10 rounded-xl flex items-center justify-center text-[#2a7a3b] mb-4">
                        <Activity size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">SPT</h3>
                    <p className="text-sm font-medium text-slate-500 mb-4 h-10">Sondagem à Percussão</p>
                    <ul className="text-xs text-slate-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-[#2a7a3b] mt-0.5">•</span>
                            R$ 75/m (Mínimo 40m)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#2a7a3b] mt-0.5">•</span>
                            Sinal fixo R$ 1.500
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#2a7a3b] mt-0.5">•</span>
                            Cartão em até 4x
                        </li>
                    </ul>
                </Card>
            </div>
        </div>
    );
};
