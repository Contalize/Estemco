import React, { useState, useEffect } from 'react';
import { usePhoenixData } from '../hooks/usePhoenixData';
import {
    CloudRain, Hammer, Users, Clock, Save, Trash2,
    HardHat, AlertTriangle, Loader2, Gauge, Droplets
} from 'lucide-react';

export const DailyLog = ({ projetoAtivo, onClose }: { projetoAtivo: any, onClose: () => void }) => {
    const { saveDailyLog } = usePhoenixData();
    const [loading, setLoading] = useState(false);

    // --- FIELD STATE ---
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [weather, setWeather] = useState('SOL');
    const [team, setTeam] = useState({ operator: '', helper: '' });

    // --- NEW: UNIT ECONOMICS STATE ---
    const [horimeter, setHorimeter] = useState({ start: 0, end: 0, total: 0 });
    const [concreteVolume, setConcreteVolume] = useState(0);

    // Production State
    const [piles, setPiles] = useState<any[]>([]);
    const [idles, setIdles] = useState<any[]>([]);

    // Auto-calculate Engine Hours
    useEffect(() => {
        const total = parseFloat((horimeter.end - horimeter.start).toFixed(1));
        setHorimeter(h => ({ ...h, total: total > 0 ? total : 0 }));
    }, [horimeter.start, horimeter.end]);

    const addPile = () => {
        setPiles([...piles, { id: Date.now(), number: `E-${piles.length + 1}`, depth: 0, diameter: 40 }]);
    };

    const addIdle = () => {
        setIdles([...idles, { id: Date.now(), reason: '', hours: 0 }]);
    };

    const handleSubmit = async () => {
        if (!team.operator) return alert("Informe o nome do Operador.");
        if (horimeter.total < 0) return alert("Horímetro Final deve ser maior que o Inicial.");

        setLoading(true);
        const totalMeters = piles.reduce((acc, p) => acc + Number(p.depth), 0);
        const totalIdle = idles.reduce((acc, i) => acc + Number(i.hours), 0);

        const payload = {
            projetoId: projetoAtivo.id,
            date,
            weather,
            team,
            // Financial Data
            horimeterStart: Number(horimeter.start),
            horimeterEnd: Number(horimeter.end),
            engineHours: Number(horimeter.total),
            concreteTotalVolume: Number(concreteVolume),
            // Production
            estacas: piles,
            idleEvents: idles,
            totalMeters,
            totalIdleHours: totalIdle,
            clientName: projetoAtivo.clientName,
            createdAt: new Date()
        };

        try {
            await saveDailyLog.mutateAsync(payload);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar RDO.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-2xl bg-slate-50 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">

                {/* HEADER */}
                <div className="bg-white p-6 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <HardHat className="text-orange-600" /> Diário de Obra (RDO)
                        </h2>
                        <p className="text-sm text-slate-500">{projetoAtivo.name} • {projetoAtivo.clientName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Fechar</button>
                </div>

                <div className="p-6 space-y-6">

                    {/* 1. OPERACIONAL (CLIMA & EQUIPE) */}
                    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Data</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded bg-slate-50 font-bold" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Clima</label>
                                <select
                                    value={weather} onChange={e => setWeather(e.target.value)}
                                    className="w-full p-2 border rounded bg-white font-bold text-slate-700"
                                >
                                    <option value="SOL">☀️ Sol</option>
                                    <option value="NUBLADO">☁️ Nublado</option>
                                    <option value="CHUVA">🌧️ Chuva</option>
                                    <option value="IMPRATICAVEL">⛈️ Impraticável</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Users size={12} /> Operador</label>
                                <input placeholder="Nome" value={team.operator} onChange={e => setTeam({ ...team, operator: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Users size={12} /> Auxiliar</label>
                                <input placeholder="Nome" value={team.helper} onChange={e => setTeam({ ...team, helper: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                    </section>

                    {/* 2. CUSTOS OPERACIONAIS (NOVO MÓDULO) */}
                    <section className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                        <h3 className="text-sm font-bold text-blue-800 uppercase mb-4 flex items-center gap-2">
                            <Gauge size={16} /> Controle de Máquina & Insumos
                        </h3>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase">Horímetro Inicial</label>
                                <input
                                    type="number"
                                    value={horimeter.start}
                                    onChange={e => setHorimeter({ ...horimeter, start: Number(e.target.value) })}
                                    className="w-full p-2 border border-blue-200 rounded text-center font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase">Horímetro Final</label>
                                <input
                                    type="number"
                                    value={horimeter.end}
                                    onChange={e => setHorimeter({ ...horimeter, end: Number(e.target.value) })}
                                    className="w-full p-2 border border-blue-200 rounded text-center font-mono font-bold"
                                />
                            </div>
                            <div className="bg-white rounded border border-blue-200 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-blue-400 font-bold uppercase">Total Horas</span>
                                <span className="text-lg font-extrabold text-blue-700">{horimeter.total}h</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-1">
                                <Droplets size={14} /> Volume Total de Concreto (Nota Fiscal)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={concreteVolume}
                                    onChange={e => setConcreteVolume(Number(e.target.value))}
                                    className="flex-1 p-2 border border-blue-200 rounded font-bold text-slate-700"
                                    placeholder="0.00"
                                />
                                <span className="text-sm font-bold text-slate-500">m³</span>
                            </div>
                            <p className="text-[10px] text-blue-400 mt-1">Soma das notas fiscais do dia.</p>
                        </div>
                    </section>

                    {/* 3. PRODUÇÃO (GRID) */}
                    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Hammer size={16} /> Produção</h3>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                                {piles.reduce((acc, p) => acc + Number(p.depth), 0).toFixed(1)}m
                            </span>
                        </div>
                        <div className="space-y-2">
                            {piles.map((p, idx) => (
                                <div key={p.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-xs font-bold w-8 text-slate-400">#{idx + 1}</span>
                                    <input
                                        value={p.number}
                                        onChange={e => { const n = [...piles]; n[idx].number = e.target.value; setPiles(n); }}
                                        className="w-20 p-1.5 text-xs font-bold text-center border rounded"
                                        placeholder="Nº Estaca"
                                    />
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Prof:</span>
                                        <input
                                            type="number"
                                            value={p.depth}
                                            onChange={e => { const n = [...piles]; n[idx].depth = e.target.value; setPiles(n); }}
                                            className="w-full p-1.5 text-sm font-bold border rounded text-emerald-600"
                                        />
                                    </div>
                                    <button onClick={() => setPiles(piles.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button onClick={addPile} className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs rounded hover:border-emerald-400 hover:text-emerald-500">+ Estaca</button>
                        </div>
                    </section>

                    {/* 4. PARADAS */}
                    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={16} /> Paradas</h3>
                            {idles.reduce((acc, i) => acc + Number(i.hours), 0) > 0 && (
                                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                                    {idles.reduce((acc, i) => acc + Number(i.hours), 0)}h perdidas
                                </span>
                            )}
                        </div>
                        <div className="space-y-2">
                            {idles.map((i, idx) => (
                                <div key={i.id} className="flex gap-2 items-center bg-orange-50/50 p-2 rounded border border-orange-100">
                                    <input
                                        placeholder="Motivo"
                                        value={i.reason}
                                        onChange={e => { const n = [...idles]; n[idx].reason = e.target.value; setIdles(n); }}
                                        className="flex-1 p-1.5 text-xs border rounded bg-white"
                                    />
                                    <div className="w-20 flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={i.hours}
                                            onChange={e => { const n = [...idles]; n[idx].hours = e.target.value; setIdles(n); }}
                                            className="w-full p-1.5 text-sm font-bold border rounded text-orange-600 text-center"
                                        />
                                        <span className="text-xs text-slate-400">h</span>
                                    </div>
                                    <button onClick={() => setIdles(idles.filter(x => x.id !== i.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button onClick={addIdle} className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs rounded hover:border-orange-400 hover:text-orange-500">+ Parada</button>
                        </div>
                    </section>

                </div>

                {/* FOOTER */}
                <div className="bg-white p-4 border-t border-slate-200 sticky bottom-0 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save />}
                        Salvar RDO Financeiro
                    </button>
                </div>
            </div>
        </div>
    );
};
