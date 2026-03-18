import React, { useEffect } from 'react';
import { TipoServico, ItemProposta, ItemFuroSPT, ConfigHCM, ConfigESC, ConfigSPT } from '../../../types';
import { NovaPropostaData } from '../../types/propostaForm';
import { Button, Input, Select, Label } from '../../../components/ui';
import { Plus, Trash2, AlertTriangle, Info, FileText } from 'lucide-react';
import { calcularPropostaHCM, calcularPropostaESC, calcularPropostaSPT } from '../../utils/calculosProposta';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';

interface Step3Props {
    data: NovaPropostaData;
    updateData: (d: Partial<NovaPropostaData>) => void;
}

// Full diameter list by technology
const DIAMETROS_HCM_CM = [10, 12, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 120, 150];
const DIAMETROS_ESC_CM = [10, 12, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300];
const DIAMETROS_RAIZ_CM = [10, 12, 15, 16, 20, 25, 31, 35, 40, 45, 50];
const DIAMETROS_STRAUSS_CM = [25, 32, 40, 45, 50];

// Merged + deduplicated sorted list for "all" mode
const ALL_DIAMETROS_CM = Array.from(new Set([
    ...DIAMETROS_RAIZ_CM, ...DIAMETROS_STRAUSS_CM, ...DIAMETROS_HCM_CM, ...DIAMETROS_ESC_CM
])).sort((a, b) => a - b);

// cm → mm for storage
const cmToMm = (cm: number) => cm * 10;
const mmToCm = (mm: number) => mm / 10;

export const Step3ItensServico: React.FC<Step3Props> = ({ data, updateData }) => {
    const { profile } = useAuth();
    const { config, loading, error } = useConfiguracoes(profile?.tenantId, data.tipo as any);

    useEffect(() => {
        if (!loading && config && data.itens.length === 0) {
            if (data.tipo === 'HCM') {
                const conf = config as ConfigHCM;
                const firstDiam = conf.diametros?.[0];
                updateData({
                    mobilizacao: conf.mobilizacaoPadrao || 4000,
                    itens: [{ id: Date.now().toString(), diametro: firstDiam?.mm || 300, quantidadeEstacas: 1, comprimentoUnitario: conf.comprimentoMinimo || 10, totalMetros: conf.comprimentoMinimo || 10, precoMetro: firstDiam?.preco || 40, subtotal: (firstDiam?.preco || 40) * (conf.comprimentoMinimo || 10) }]
                });
            } else if (data.tipo === 'ESC') {
                const conf = config as ConfigESC;
                const firstDiam = conf.diametros?.[0];
                updateData({
                    mobilizacao: conf.mobilizacaoPadrao || 500,
                    metrosDiariosESC: conf.contratoSaidaDiariaPadrao?.metrosContratadosPorDia || 0,
                    precoExcedenteESC: conf.contratoSaidaDiariaPadrao?.precoExcedentePorMetro || 0,
                    itens: [{ id: Date.now().toString(), diametro: firstDiam?.mm || 250, quantidadeEstacas: 1, comprimentoUnitario: 10, totalMetros: 10, precoMetro: firstDiam?.preco || 12.5, subtotal: (firstDiam?.preco || 12.5) * 10 }]
                });
            } else if (data.tipo === 'SPT') {
                const conf = config as ConfigSPT;
                updateData({
                    mobilizacao: conf.mobilizacaoLaboratorio || 600,
                    itens: [{ id: Date.now().toString(), numeroFuro: 1, profundidade: conf.metrosPorFuroEstimado || 15 }]
                });
            }
        }
    }, [loading, config, data.tipo, updateData]);

    if (loading) return <div className="p-12 text-center text-slate-500">Carregando parâmetros comerciais...</div>;
    if (!config) return <div className="p-12 text-center text-red-500">Erro ao carregar configurações de preço para {data.tipo}. Verifique se você parametrizou os custos em Configurações.</div>;

    // ── Helpers ─────────────────────────────────────────────────────────────────

    const updateItem = (id: string, field: string, value: number) => {
        const idx = data.itens.findIndex((i: any) => i.id === id);
        if (idx > -1) {
            const novo = [...data.itens];
            let item: any = { ...novo[idx], [field]: value };
            // If changing diameter, try to auto-fill price from config diameters list
            if (field === 'diametro') {
                const confDiams = (config as ConfigHCM | ConfigESC).diametros || [];
                const found = confDiams.find(d => d.mm === value);
                if (found) item.precoMetro = found.preco;
            }
            item.totalMetros = (item.quantidadeEstacas || 1) * item.comprimentoUnitario;
            item.subtotal = item.totalMetros * item.precoMetro;
            novo[idx] = item;
            updateData({ itens: novo });
        }
    };

    const removeItem = (id: string) => updateData({ itens: data.itens.filter((i: any) => i.id !== id) });

    const buildItemRow = (item: any, diametroOptions: number[], confMinComp: number, defaultPreco: number) => (
        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
            {/* Diâmetro */}
            <td className="px-3 py-2">
                <Select
                    value={item.diametro?.toString()}
                    onChange={e => updateItem(item.id, 'diametro', Number(e.target.value))}
                    className="w-28 text-sm"
                >
                    {diametroOptions.map(cm => (
                        <option key={cm} value={cmToMm(cm)}>Ø {cm}cm</option>
                    ))}
                    {/* Allow manual entry */}
                    {!diametroOptions.some(cm => cmToMm(cm) === item.diametro) && (
                        <option value={item.diametro}>Ø {mmToCm(item.diametro || 0)}cm (customizado)</option>
                    )}
                </Select>
            </td>
            {/* Qtd Estacas */}
            <td className="px-3 py-2">
                <Input type="number" min="1" value={item.quantidadeEstacas} onChange={e => updateItem(item.id, 'quantidadeEstacas', Number(e.target.value))} className="w-20 text-center" />
            </td>
            {/* Comp Unit */}
            <td className="px-3 py-2">
                <Input type="number" min={confMinComp} step="0.5" value={item.comprimentoUnitario} onChange={e => updateItem(item.id, 'comprimentoUnitario', Number(e.target.value))} className="w-24" />
                {item.comprimentoUnitario < confMinComp && <p className="text-xs text-red-500 mt-0.5">Mín {confMinComp}m</p>}
            </td>
            {/* Total m */}
            <td className="px-3 py-2 font-mono text-slate-700 text-sm">{item.totalMetros?.toFixed(1)}</td>
            {/* R$/m — EDITABLE */}
            <td className="px-3 py-2">
                <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">R$</span>
                    <Input
                        type="number"
                        step="0.01"
                        value={item.precoMetro}
                        onChange={e => updateItem(item.id, 'precoMetro', Number(e.target.value))}
                        className="pl-7 text-sm text-right font-mono"
                    />
                </div>
            </td>
            {/* Subtotal */}
            <td className="px-3 py-2 font-mono font-semibold text-sm text-slate-800">R$ {item.subtotal?.toFixed(2)}</td>
            {/* Delete */}
            <td className="px-3 py-2">
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={15} />
                </Button>
            </td>
        </tr>
    );

    // ── HCM ─────────────────────────────────────────────────────────────────────

    const renderHCM = () => {
        const conf = config as ConfigHCM;
        const calc = calcularPropostaHCM(data.itens as ItemProposta[], data.mobilizacao);
        const addItem = () => {
            const firstDiam = DIAMETROS_HCM_CM[0];
            const confDiam = conf.diametros?.find(d => d.mm === cmToMm(firstDiam));
            const preco = confDiam?.preco || 40;
            const comp = conf.comprimentoMinimo || 10;
            updateData({
                itens: [...data.itens, { id: Date.now().toString(), diametro: cmToMm(firstDiam), quantidadeEstacas: 1, comprimentoUnitario: comp, totalMetros: comp, precoMetro: preco, subtotal: preco * comp }]
            });
        };

        return (
            <div className="space-y-6">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md flex gap-3 shadow-sm">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-amber-800">Faturamento mínimo diário: R$ {(data.faturamentoMinimo || conf.faturamentoMinimoDiario || 8000).toLocaleString('pt-BR')}/dia de máquina.</h4>
                        <p className="text-sm text-amber-700 mt-1">Cobrado por: falta de concreto, bomba, mangotes, locação, horários restritos, dificuldades de perfuração, estacas em blocos (NBR 6122:2019 Anexo N.7). <b>Isenção: condições climáticas e quebra do equipamento HCM.</b></p>
                        <div className="mt-3 flex items-center gap-3">
                            <Label className="text-xs font-bold text-amber-900 uppercase">Alterar Mínimo (R$):</Label>
                            <Input 
                                type="number" 
                                value={data.faturamentoMinimo} 
                                onChange={e => updateData({ faturamentoMinimo: Number(e.target.value) })}
                                className="w-32 h-8 bg-white/50 border-amber-200 text-amber-900 font-bold"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-3 py-3 text-left">Diâmetro</th>
                                <th className="px-3 py-3 text-left">Qtd Estacas</th>
                                <th className="px-3 py-3 text-left">Comp. Unit. (m)</th>
                                <th className="px-3 py-3 text-left">Total (m)</th>
                                <th className="px-3 py-3 text-left">R$/m <span className="text-indigo-500">(editável)</span></th>
                                <th className="px-3 py-3 text-left">Subtotal</th>
                                <th className="px-3 py-3 w-12" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.itens.map((item: any) => buildItemRow(item, DIAMETROS_HCM_CM, conf.comprimentoMinimo || 5, 40))}
                        </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50">
                        <Button variant="outline" size="sm" onClick={addItem} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                            <Plus size={16} /> Adicionar linha de estacas
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <input type="checkbox" id="mobHCM" checked={data.mobilizacao > 0} onChange={e => updateData({ mobilizacao: e.target.checked ? (conf.mobilizacaoPadrao || 4000) : 0 })} className="w-5 h-5 rounded border-slate-300 accent-indigo-600" />
                    <Label className="text-base font-medium">Incluir Mobilização</Label>
                    {data.mobilizacao > 0 && <Input type="number" value={data.mobilizacao} onChange={e => updateData({ mobilizacao: Number(e.target.value) })} className="w-36 bg-white" />}
                </div>

                <div className="text-right p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-slate-500 text-sm mb-1">Subtotal Estimado</p>
                    <h3 className="text-3xl font-black text-indigo-800">R$ {calc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>
        );
    };

    // ── ESC ─────────────────────────────────────────────────────────────────────

    const renderESC = () => {
        const conf = config as ConfigESC;
        const calc = calcularPropostaESC(data.itens as ItemProposta[], data.mobilizacao, data.modalidadeESC, data.precoFechadoESC, data.metrosDiariosESC, data.precoExcedenteESC);

        const addItemESC = () => {
            const firstDiam = DIAMETROS_ESC_CM[0];
            const confDiam = conf.diametros?.find(d => d.mm === cmToMm(firstDiam));
            const preco = confDiam?.preco || 12.5;
            updateData({
                itens: [...data.itens, { id: Date.now().toString(), diametro: cmToMm(firstDiam), quantidadeEstacas: 1, comprimentoUnitario: 10, totalMetros: 10, precoMetro: preco, subtotal: preco * 10 }]
            });
        };

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md flex gap-3 shadow-sm">
                    <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-blue-800">Faturamento mínimo: R$ {(data.faturamentoMinimo || conf.faturamentoMinimoObra || 3000).toLocaleString('pt-BR')} da OBRA.</h4>
                        <p className="text-sm text-blue-700 mt-1">Taxa hora parada: R$ {(conf.taxaHoraParada || 500).toFixed(2)}/h por nível d'água, pedras, modificação de projeto, fretes.</p>
                        <div className="mt-3 flex items-center gap-3">
                            <Label className="text-xs font-bold text-blue-900 uppercase">Alterar Mínimo (R$):</Label>
                            <Input 
                                type="number" 
                                value={data.faturamentoMinimo} 
                                onChange={e => updateData({ faturamentoMinimo: Number(e.target.value) })}
                                className="w-32 h-8 bg-white/50 border-blue-200 text-blue-900 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Modalidade */}
                <div className="flex gap-4">
                    {(['por_metro', 'preco_fechado', 'saida_diaria'] as const).map(mod => (
                        <label key={mod} className={`flex-1 p-4 border rounded-xl cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold ${data.modalidadeESC === mod ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="radio" name="modESC" checked={data.modalidadeESC === mod} onChange={() => updateData({ modalidadeESC: mod })} className="hidden" />
                            {mod === 'por_metro' ? 'Por Metro' : mod === 'preco_fechado' ? 'Preço Fechado' : 'Saída Diária'}
                        </label>
                    ))}
                </div>

                {data.modalidadeESC === 'preco_fechado' && (
                    <div className="bg-white p-6 border rounded-xl shadow-sm">
                        <Label className="font-bold">Valor Total (Preço Fechado)</Label>
                        <Input type="number" value={data.precoFechadoESC || ''} onChange={e => updateData({ precoFechadoESC: Number(e.target.value) })} placeholder="R$ 0,00" className="text-lg w-full md:w-1/3 mt-2" />
                    </div>
                )}

                {data.modalidadeESC === 'saida_diaria' && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border rounded-lg">
                        <div>
                            <Label>Metros diários contratados</Label>
                            <Input type="number" value={data.metrosDiariosESC || 0} onChange={e => updateData({ metrosDiariosESC: Number(e.target.value) })} className="mt-1 bg-white" />
                        </div>
                        <div>
                            <Label>Preço do excedente (R$/m)</Label>
                            <Input type="number" value={data.precoExcedenteESC || 0} onChange={e => updateData({ precoExcedenteESC: Number(e.target.value) })} className="mt-1 bg-white" />
                        </div>
                        <div className="col-span-2 text-xs text-slate-500">Excedente cobrado na medição real, não nesta proposta.</div>
                    </div>
                )}

                {(data.modalidadeESC === 'por_metro' || data.modalidadeESC === 'saida_diaria') && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-3 py-3 text-left">Diâmetro</th>
                                    <th className="px-3 py-3 text-left">Qtd Estacas</th>
                                    <th className="px-3 py-3 text-left">Comp. Unit. (m)</th>
                                    <th className="px-3 py-3 text-left">Total (m)</th>
                                    <th className="px-3 py-3 text-left">R$/m <span className="text-indigo-500">(editável)</span></th>
                                    <th className="px-3 py-3 text-left">Subtotal</th>
                                    <th className="px-3 py-3 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.itens.map((item: any) => buildItemRow(item, DIAMETROS_ESC_CM, 5, 12.5))}
                            </tbody>
                        </table>
                        <div className="p-3 border-t bg-slate-50">
                            <Button variant="outline" size="sm" onClick={addItemESC} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                <Plus size={16} /> Adicionar linha de estacas
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <input type="checkbox" id="mobESC" checked={data.mobilizacao > 0} onChange={e => updateData({ mobilizacao: e.target.checked ? (conf.mobilizacaoPadrao || 500) : 0 })} className="w-5 h-5 rounded border-slate-300 accent-indigo-600" />
                    <Label className="text-base font-medium">Incluir Mobilização</Label>
                    {data.mobilizacao > 0 && <Input type="number" value={data.mobilizacao} onChange={e => updateData({ mobilizacao: Number(e.target.value) })} className="w-36 bg-white" />}
                </div>

                <div className="text-right p-5 bg-blue-50 border border-blue-100 rounded-xl">
                    {calc.valorTotal > (calc.subtotalExecucao + calc.valorMobilizacao) && (
                        <p className="text-amber-600 text-sm font-bold mb-1">Aplicação de Faturamento Mínimo</p>
                    )}
                    <p className="text-slate-500 text-sm mb-1">Subtotal Estimado</p>
                    <h3 className="text-3xl font-black text-blue-800">R$ {calc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>
        );
    };

    // ── SPT ─────────────────────────────────────────────────────────────────────

    const renderSPT = () => {
        const conf = config as ConfigSPT;
        const furos = data.itens as ItemFuroSPT[];
        const calc = calcularPropostaSPT(furos, data.mobilizacao, data.incluirART, data.valorART);
        const totalM = furos.reduce((a, b) => a + b.profundidade, 0);

        const addFuro = () => updateData({ itens: [...furos, { id: Date.now().toString(), numeroFuro: furos.length + 1, profundidade: conf.metrosPorFuroEstimado || 13.33 }] });
        const remFuro = (id: string) => updateData({ itens: furos.filter(f => f.id !== id).map((f, i) => ({ ...f, numeroFuro: i + 1 })) });
        const updFuro = (id: string, v: number) => updateData({ itens: furos.map(f => f.id === id ? { ...f, profundidade: v } : f) });

        return (
            <div className="space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex gap-3 shadow-sm">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-red-800">REGRA DE FATURAMENTO SPT:</h4>
                        <p className="text-sm text-red-700 mt-1">• Até 2 furos no dia → faturamento por metragem<br />• Acima de 2 furos no dia → aplica DIÁRIA MÍNIMA<br />Esta regra é aplicada no BDM, não nesta proposta.</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-3 text-left w-24">Nº Furo</th>
                                <th className="px-4 py-3 text-left">Profundidade Estimada (m)</th>
                                <th className="px-4 py-3 w-12" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {furos.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-2 font-bold text-slate-400">Furo {item.numeroFuro.toString().padStart(2, '0')}</td>
                                    <td className="px-4 py-2"><Input type="number" step="0.1" min="1" value={item.profundidade} onChange={e => updFuro(item.id, Number(e.target.value))} className="w-40" /></td>
                                    <td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => remFuro(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50 flex justify-between items-center">
                        <Button variant="outline" size="sm" onClick={addFuro} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"><Plus size={16} /> Adicionar Furo</Button>
                        <div className="text-slate-600 font-medium text-sm">
                            {furos.length} furos | <span className={totalM < 40 ? 'text-amber-600 font-bold' : ''}>{totalM.toFixed(2)}m total</span>
                        </div>
                    </div>
                </div>

                {totalM < 40 && <p className="text-amber-600 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} /> Metragem abaixo do mínimo (40m). Será faturado 40m.</p>}

                <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <input type="checkbox" id="mobSPT" checked={data.mobilizacao > 0} onChange={e => updateData({ mobilizacao: e.target.checked ? (conf.mobilizacaoLaboratorio || 600) : 0 })} className="w-5 h-5 rounded border-slate-300 accent-indigo-600" />
                        <Label className="text-base font-medium">Incluir Despesas e Mobilização</Label>
                        {data.mobilizacao > 0 && <Input type="number" value={data.mobilizacao} onChange={e => updateData({ mobilizacao: Number(e.target.value) })} className="w-36 bg-white" />}
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <input type="checkbox" id="artSPT" checked={data.incluirART} onChange={e => updateData({ incluirART: e.target.checked })} className="w-5 h-5 rounded border-slate-300 accent-indigo-600" />
                        <Label className="text-base font-medium">Incluir recolhimento A.R.T</Label>
                        {data.incluirART && <Input type="number" value={data.valorART} onChange={e => updateData({ valorART: Number(e.target.value) })} className="w-36 bg-white" />}
                    </div>
                </div>

                <div className="text-right p-5 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-slate-500 flex items-center justify-end gap-2 mb-1"><FileText size={16} /> Sinal: <strong className="text-slate-800">R$ {conf.sinalAgendamento?.toLocaleString('pt-BR')}</strong></p>
                    <p className="text-slate-500 text-sm mb-1">Subtotal Estimado</p>
                    <h3 className="text-3xl font-black text-red-800">R$ {calc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-1">Itens do Serviço e Escopo Comercial</h2>
                <p className="text-slate-500">Parametrização de custos para {data.tipo} — os diâmetros e preços por metro são editáveis por linha.</p>
            </div>
            {data.tipo === 'HCM' && renderHCM()}
            {data.tipo === 'ESC' && renderESC()}
            {data.tipo === 'SPT' && renderSPT()}
        </div>
    );
};
