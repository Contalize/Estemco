import React, { useState, useEffect } from 'react';
import { Save, Plus, ArrowLeft, Droplets, MapPin, Calculator, FileText } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Borehole, SPTSample } from '../types';
import { SOIL_LIBRARY, SoilType, getSoilConsistency } from '../data/soils';

interface SptManagerProps {
    projectId?: string; // Optional: if linked to a project context
    onClose?: () => void;
}

export const SptManager: React.FC<SptManagerProps> = ({ projectId, onClose }) => {
    // --- Header State ---
    const [boreholeName, setBoreholeName] = useState('SP-01');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [coordX, setCoordX] = useState('');
    const [coordY, setCoordY] = useState('');
    const [elevationZ, setElevationZ] = useState(''); // Cota Boca
    const [waterLevelDepth, setWaterLevelDepth] = useState<number | null>(null);

    // --- Grid State ---
    // Initialize with 10 meters by default
    const [samples, setSamples] = useState<SPTSample[]>(Array.from({ length: 15 }, (_, i) => ({
        depth: i + 1,
        n1: 0,
        n2: 0,
        n3: 0,
        nspt: 0,
        soilType: SoilType.ARGILA, // Default
        color: 'Vermelha',
        waterLevel: false
    })));

    const [saving, setSaving] = useState(false);

    // --- Helpers ---
    const updateSample = (index: number, field: keyof SPTSample, value: any) => {
        const newSamples = [...samples];
        newSamples[index] = { ...newSamples[index], [field]: value };

        // Auto-Calc NSPT
        if (field === 'n2' || field === 'n3') {
            newSamples[index].nspt = Number(newSamples[index].n2) + Number(newSamples[index].n3);
        }

        // Auto Water Level Logic (Only one depth can be WL ideally, or multiple?)
        // For now, let's just toggle. If user sets WL true here, update header
        if (field === 'waterLevel' && value === true) {
            setWaterLevelDepth(newSamples[index].depth);
            // Optional: Uncheck others? Keeping simple for now.
            newSamples.forEach((s, i) => { if (i !== index) s.waterLevel = false; });
        }

        setSamples(newSamples);
    };

    const handleSave = async () => {
        if (!projectId) {
            alert("Erro: Projeto não vinculado."); // In standalone mode, we might need a project selector
            return;
        }

        setSaving(true);
        try {
            // Filter out empty rows (where NSPT is 0 and no N1 is recorded, assuming end of hole)
            // Or keep all up to the last filled one.
            const validSamples = samples.filter(s => s.n1 > 0 || s.n2 > 0 || s.n3 > 0);

            const borehole: Omit<Borehole, 'id'> = {
                projectId,
                name: boreholeName,
                date,
                coordinates: {
                    x: Number(coordX),
                    y: Number(coordY),
                    z: Number(elevationZ)
                },
                waterLevelDepth,
                samples: validSamples,
                status: 'EXECUTED'
            };

            await addDoc(collection(db, 'investigations'), borehole);
            alert("Sondagem salva com sucesso!");
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving borehole:", error);
            alert("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white min-h-screen p-6">

            {/* Header / Toolbar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    {onClose && <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-amber-600" /> Cadastro de Sondagem (SPT)
                        </h1>
                        <p className="text-sm text-slate-500">Digitalização de Boletins de Campo</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Boletim'}
                </button>
            </div>

            {/* Meta Data Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identificação do Furo</label>
                    <input value={boreholeName} onChange={e => setBoreholeName(e.target.value)} className="w-full p-2 border rounded font-bold text-lg text-slate-700" placeholder="SP-01" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Execução</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> Coord X (UTM)</label>
                        <input type="number" value={coordX} onChange={e => setCoordX(e.target.value)} className="w-full p-2 border rounded text-xs" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> Coord Y (UTM)</label>
                        <input type="number" value={coordY} onChange={e => setCoordY(e.target.value)} className="w-full p-2 border rounded text-xs" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><ArrowDownToLine size={10} /> Cota Boca (Z)</label>
                        <input type="number" value={elevationZ} onChange={e => setElevationZ(e.target.value)} className="w-full p-2 border rounded text-xs" />
                    </div>
                </div>
            </div>

            {/* SPT GRID */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3 w-16 text-center border-r border-slate-200">Prof (m)</th>
                            <th className="p-3 w-16 text-center bg-slate-200">N1</th>
                            <th className="p-3 w-16 text-center bg-slate-200">N2</th>
                            <th className="p-3 w-16 text-center bg-slate-200 border-r border-slate-300">N3</th>
                            <th className="p-3 w-20 text-center bg-amber-100 text-amber-800 border-r border-amber-200">N-SPT</th>
                            <th className="p-3 w-32 border-r border-slate-200">Solo (Biblioteca)</th>
                            <th className="p-3 w-32 border-r border-slate-200">Cor / Visual</th>
                            <th className="p-3 w-24 border-r border-slate-200">Consistência</th>
                            <th className="p-3 w-16 text-center text-blue-600"><Droplets size={16} className="mx-auto" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {samples.map((row, idx) => (
                            <tr key={row.depth} className="hover:bg-slate-50">
                                <td className="p-2 text-center font-bold text-slate-500 border-r">{row.depth}m</td>

                                <td className="p-1"><input type="number" min="0" className="w-full text-center p-1 border rounded bg-slate-50 focus:bg-white" value={row.n1 || ''} onChange={e => updateSample(idx, 'n1', Number(e.target.value))} /></td>
                                <td className="p-1"><input type="number" min="0" className="w-full text-center p-1 border rounded bg-slate-50 focus:bg-white" value={row.n2 || ''} onChange={e => updateSample(idx, 'n2', Number(e.target.value))} /></td>
                                <td className="p-1 border-r"><input type="number" min="0" className="w-full text-center p-1 border rounded bg-slate-50 focus:bg-white" value={row.n3 || ''} onChange={e => updateSample(idx, 'n3', Number(e.target.value))} /></td>

                                <td className="p-2 text-center font-black text-lg text-amber-600 bg-amber-50 border-r border-amber-100">
                                    {row.nspt > 0 ? row.nspt : '-'}
                                </td>

                                <td className="p-1 border-r">
                                    <select
                                        className="w-full p-1 border rounded text-xs bg-slate-50"
                                        value={row.soilType}
                                        onChange={e => updateSample(idx, 'soilType', e.target.value)}
                                    >
                                        {Object.values(SoilType).map(t => (
                                            <option key={t} value={t}>{SOIL_LIBRARY[t]?.name}</option>
                                        ))}
                                    </select>
                                </td>

                                <td className="p-1 border-r">
                                    <input className="w-full p-1 border rounded text-xs" value={row.color} onChange={e => updateSample(idx, 'color', e.target.value)} />
                                </td>

                                <td className="p-2 text-xs text-slate-500 border-r italic">
                                    {getSoilConsistency(row.nspt, row.soilType)}
                                </td>

                                <td className="p-1 text-center">
                                    <input
                                        type="checkbox"
                                        checked={row.waterLevel}
                                        onChange={e => updateSample(idx, 'waterLevel', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={() => setSamples([...samples, { depth: samples.length + 1, n1: 0, n2: 0, n3: 0, nspt: 0, soilType: samples[samples.length - 1].soilType, color: samples[samples.length - 1].color, waterLevel: false }])}
                className="mt-4 w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-lg border border-dashed border-slate-300 hover:bg-slate-200 hover:text-slate-700 transition-colors flex justify-center items-center gap-2"
            >
                <Plus size={16} /> Adicionar +1 Metro de Profundidade
            </button>

        </div>
    );
};
