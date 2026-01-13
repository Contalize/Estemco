import React, { useState, useEffect } from 'react';
import { Asset } from '../types';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Trash2, Plus, Truck, AlertTriangle, Settings, Anchor, ArrowDownToLine, Wrench } from 'lucide-react';
import { MaintenanceModal } from './MaintenanceModal';

export const FleetRegistry = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'HELICE' | 'ESCAVADA' | 'SONDAGEM' | 'OUTROS'>('HELICE');
    const [newCost, setNewCost] = useState('');
    const [newPlate, setNewPlate] = useState('');

    // Maintenance Modal State
    const [maintenanceAsset, setMaintenanceAsset] = useState<{ id: string, name: string } | null>(null);

    // Technical Specs State
    const [torque, setTorque] = useState('');
    const [pullBack, setPullBack] = useState('');
    const [maxDepth, setMaxDepth] = useState('');
    const [toolsStr, setToolsStr] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'assets'), where('status', '==', 'ACTIVE'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Asset[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Asset));
            setAssets(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching fleet:", err);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleAdd = async () => {
        if (!newName || !newCost) return;

        const tools = toolsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);

        try {
            await addDoc(collection(db, 'assets'), {
                name: newName,
                type: newType,
                dailyCost: parseFloat(newCost),
                plate: newPlate,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                // Save Technical Specs if it's a Heavy Machine
                technicalSpecs: (newType === 'HELICE' || newType === 'ESCAVADA') ? {
                    torqueNominal: Number(torque) || 0,
                    pullBackForce: Number(pullBack) || 0,
                    maxDepth: Number(maxDepth) || 0,
                    tools: tools
                } : undefined
            });

            // Reset Form
            setNewName('');
            setNewCost('');
            setNewPlate('');
            setTorque('');
            setPullBack('');
            setMaxDepth('');
            setToolsStr('');

        } catch (error) {
            console.error("Error adding asset:", error);
            alert("Erro ao salvar ativo. Verifique a conexão.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja remover este ativo?')) {
            try {
                // Soft delete usually better, but hard delete for now as per "Remove" icon
                await deleteDoc(doc(db, 'assets', id));
            } catch (error) {
                console.error("Error removing asset:", error);
            }
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="text-blue-600" /> Gestão de Frota (Ativos & Engenharia)
            </h2>

            <div className="space-y-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome/Modelo</label>
                        <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border rounded" placeholder="Ex: Hélice H-01" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                        <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="HELICE">Hélice Contínua</option>
                            <option value="ESCAVADA">Estaca Escavada</option>
                            <option value="SONDAGEM">Sondagem SPT</option>
                            <option value="OUTROS">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Custo/Dia (R$)</label>
                        <input value={newCost} onChange={e => setNewCost(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="0.00" />
                    </div>
                </div>

                {/* Technical Specs (Conditional) */}
                {(newType === 'HELICE' || newType === 'ESCAVADA') && (
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <h4 className="text-xs font-black text-blue-800 uppercase mb-3 flex items-center gap-1"><Settings size={12} /> Especificações Técnicas (Engenharia)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Torque (kNm)</label>
                                <input type="number" value={torque} onChange={e => setTorque(e.target.value)} className="w-full p-2 text-xs border border-blue-200 rounded" placeholder="Ex: 80" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Arrancamento (kN)</label>
                                <input type="number" value={pullBack} onChange={e => setPullBack(e.target.value)} className="w-full p-2 text-xs border border-blue-200 rounded" placeholder="Ex: 120" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Profundidade Max (m)</label>
                                <input type="number" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} className="w-full p-2 text-xs border border-blue-200 rounded" placeholder="Ex: 24" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Diâmetros (cm)</label>
                                <input value={toolsStr} onChange={e => setToolsStr(e.target.value)} className="w-full p-2 text-xs border border-blue-200 rounded" placeholder="30, 40, 50" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button onClick={handleAdd} disabled={!newName || !newCost} className="bg-slate-900 text-white px-6 py-2 rounded font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2 transition-colors">
                        <Plus size={18} /> Cadastrar Ativo
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500">Carregando frota...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-3">Equipamento</th>
                                <th className="p-3">Engenharia (Torque/Prof)</th>
                                <th className="p-3">Ferramentas</th>
                                <th className="p-3">Custo Diário</th>
                                <th className="p-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-700">{asset.name}</div>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${asset.type === 'HELICE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                            }`}>{asset.type}</span>
                                    </td>

                                    <td className="p-3">
                                        {asset.technicalSpecs ? (
                                            <div className="flex gap-3 text-xs text-slate-600">
                                                <div title="Torque Nominal"><span className="font-bold text-slate-800">{asset.technicalSpecs.torqueNominal}</span> kNm</div>
                                                <div title="Profundidade Máxima"><span className="font-bold text-slate-800">{asset.technicalSpecs.maxDepth}</span>m</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 italic text-xs">-</span>
                                        )}
                                    </td>

                                    <td className="p-3">
                                        {asset.technicalSpecs?.tools ? (
                                            <div className="flex gap-1 flex-wrap max-w-[150px]">
                                                {asset.technicalSpecs.tools.map(t => (
                                                    <span key={t} className="bg-slate-100 border border-slate-200 text-xs px-1 rounded text-slate-600 font-mono">Ø{t}</span>
                                                ))}
                                            </div>
                                        ) : <span className="text-slate-300 italic text-xs">-</span>}
                                    </td>

                                    <td className="p-3 font-medium text-emerald-700">R$ {asset.dailyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>

                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => setMaintenanceAsset({ id: asset.id, name: asset.name })}
                                            className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                                            title="Agendar Manutenção"
                                        >
                                            <Wrench size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(asset.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {assets.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                        Nenhum equipamento cadastrado. Adicione acima.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {
                maintenanceAsset && (
                    <MaintenanceModal
                        machineId={maintenanceAsset.id}
                        machineName={maintenanceAsset.name}
                        onClose={() => setMaintenanceAsset(null)}
                    />
                )
            }
        </div >
    );
};
