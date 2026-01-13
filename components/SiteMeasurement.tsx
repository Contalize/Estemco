import React from 'react';
import { Calculator, ArrowRight, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { DailyLog } from '../types';

export const SiteMeasurement = ({ projeto, bdos, onClose }: { projeto: any, bdos: DailyLog[], onClose?: () => void }) => {
    const totalMetersRealized = bdos.reduce((acc, b) => acc + (b.totalMetrosDia || 0), 0);
    const totalIdleHours = bdos.reduce((acc, b) => acc + (b.totalHorasParadasDia || 0), 0);

    // Fallbacks logic
    const UNIT_PRICE = projeto.valorUnitarioMetro || 100; // Legacy support
    const IDLE_PRICE = projeto.valorHoraParada || 500;
    const MOB_PRICE = projeto.valorMobilizacao || 2500;
    const MIN_BILLING = projeto.faturamentoMinimo || 5000;
    const EST_METERS = projeto.totalMetrosEstimados || projeto.contractMeters || 0;

    const estimatedRevenue = EST_METERS * UNIT_PRICE;

    const revenueMeters = totalMetersRealized * UNIT_PRICE;
    const revenueIdle = totalIdleHours * IDLE_PRICE;
    const realizedRevenue = revenueMeters + revenueIdle + MOB_PRICE;

    // Regra Crítica: Faturamento Mínimo
    const finalBilling = Math.max(realizedRevenue, MIN_BILLING);
    const appliedMinimum = finalBilling > realizedRevenue;

    return (
        <div className="fixed inset-0 bg-white z-[60] overflow-y-auto animate-in slide-in-from-right">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10 shadow-lg">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} /> Medição Final da Obra</h2>
                    <p className="text-xs text-slate-400">{projeto.name}</p>
                </div>
                {onClose && <button onClick={onClose} className="text-sm font-bold text-slate-300 hover:text-white">Fechar</button>}
            </div>

            <div className="space-y-4 p-4 bg-gray-50 min-h-screen">

                {/* BIG NUMBERS CARD */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest border-b pb-2">Resumo Global</h2>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total a Faturar</p>
                            <p className="text-4xl font-black text-blue-900 tracking-tight">R$ {finalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            {appliedMinimum && (
                                <div className="flex items-center gap-1 mt-2 text-red-600 bg-red-50 p-1 px-2 rounded w-fit">
                                    <AlertCircle size={12} />
                                    <p className="text-[10px] font-bold uppercase">Faturamento Mínimo Aplicado</p>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 mb-1">Delta Metragem</p>
                            <div className={`text-lg font-bold flex items-center justify-end gap-1 ${totalMetersRealized >= EST_METERS ? 'text-green-600' : 'text-amber-500'}`}>
                                {totalMetersRealized >= EST_METERS ? '+' : ''}{(totalMetersRealized - EST_METERS).toFixed(1)}m
                            </div>
                            <p className="text-[10px] text-gray-400">vs {EST_METERS}m previstos</p>
                        </div>
                    </div>
                </div>

                {/* COMPARISON GRID */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Perfurado (Real)</p>
                        <p className="text-xl font-bold text-slate-800">{totalMetersRealized.toFixed(1)}m</p>
                        <p className="text-xs text-green-600 mt-1">R$ {revenueMeters.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-400 uppercase">Improdutividade</p>
                        <p className="text-xl font-bold text-orange-900">{totalIdleHours.toFixed(1)}h</p>
                        <p className="text-xs text-orange-700 mt-1">R$ {revenueIdle.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                {/* DETAILED BREAKDOWN */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <h3 className="bg-gray-100 p-3 text-xs font-bold text-gray-500 uppercase border-b">Detalhamento Financeiro</h3>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Serviços de Perfuração</span>
                            <span className="font-medium text-slate-900">R$ {revenueMeters.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Horas Paradas (Improdutividade)</span>
                            <span className="font-medium text-slate-900">R$ {revenueIdle.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Mobilização / Desmobilização</span>
                            <span className="font-medium text-slate-900">R$ {MOB_PRICE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="border-t border-dashed my-2"></div>

                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500">Subtotal Realizado</span>
                            <span className="text-slate-700">R$ {realizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {appliedMinimum && (
                            <div className="bg-red-50 p-2 rounded text-xs text-red-700 mt-2 flex justify-between items-center">
                                <span>Ajuste para Mínimo Contratual</span>
                                <span className="font-bold">+ R$ {(MIN_BILLING - realizedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 p-4 border-t border-blue-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-900 uppercase">Total Final</span>
                        <span className="text-2xl font-black text-blue-900">R$ {finalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-colors">
                    <CheckCircle2 size={20} /> Emitir Relatório Gerencial
                </button>
            </div>
        </div>
    );
};
