import React, { useState } from 'react';
import { X, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createCalendarEvent } from '../services/googleService'; // To sync with GCal

interface MaintenanceModalProps {
    machineId: string;
    machineName: string;
    onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ machineId, machineName, onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!startDate || !endDate || !reason) return alert("Preencha todos os campos.");

        setLoading(true);
        try {
            // 1. Save to Phoenix (Firestore) - For internal availability logic
            await addDoc(collection(db, 'events'), {
                type: 'MAINTENANCE',
                resourceId: machineId,
                title: `[MANUTENÇÃO] ${machineName}`,
                start: startDate,
                end: endDate,
                description: reason,
                createdAt: new Date().toISOString()
            });

            // 2. Sync to Google Calendar (Visual Block)
            const token = localStorage.getItem('estemco_google_token');
            if (token) {
                await createCalendarEvent({
                    summary: `[MANUTENÇÃO] ${machineName}`,
                    description: `Motivo: ${reason}`,
                    start: { date: startDate },
                    end: { date: endDate },
                    colorId: '11' // Red
                }, token);
            }

            alert("Manutenção agendada com sucesso!");
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao agendar manutenção.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                            <Wrench size={20} /> Agendar Manutenção
                        </h3>
                        <p className="text-sm font-bold text-slate-700">{machineName}</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500" /></button>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-3 text-xs text-red-800">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p>Ao confirmar, esta máquina ficará bloqueada para novos contratos e a agenda será fechada nas datas selecionadas.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Fim (Previsão)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Motivo / Peças</label>
                    <textarea
                        value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full p-2 border rounded h-20 resize-none"
                        placeholder="Ex: Troca de mangueiras, Revisão de motor..."
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? "Salvando..." : "Confirmar Bloqueio"}
                </button>
            </div>
        </div>
    );
};
