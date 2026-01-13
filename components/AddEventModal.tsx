import React, { useState } from 'react';
import { X, Calendar, Clock, Tag, User, Users, Plus, Trash2 } from 'lucide-react';
import { createCalendarEvent } from '../services/googleService';

interface AddEventModalProps {
    onClose: () => void;
    onSave: () => void;
    selectedDate: Date;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onSave, selectedDate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('PERSONAL'); // PERSONAL, EQUIPMENT, TASK
    const [equipmentId, setEquipmentId] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [loading, setLoading] = useState(false);

    // Attendees State
    const [emailInput, setEmailInput] = useState('');
    const [attendees, setAttendees] = useState<string[]>([]);

    const handleAddEmail = () => {
        if (emailInput && emailInput.includes('@')) {
            setAttendees(prev => [...prev, emailInput]);
            setEmailInput('');
        }
    };

    const removeEmail = (email: string) => {
        setAttendees(attendees.filter(e => e !== email));
    };

    const handleSave = async () => {
        setLoading(true);
        const token = localStorage.getItem('estemco_google_token');
        if (!token) {
            alert("Erro de autenticação. Reconecte ao Google.");
            setLoading(false);
            return;
        }

        const startDateTime = new Date(selectedDate);
        const [startH, startM] = startTime.split(':');
        startDateTime.setHours(Number(startH), Number(startM));

        const endDateTime = new Date(selectedDate);
        const [endH, endM] = endTime.split(':');
        endDateTime.setHours(Number(endH), Number(endM));

        let finalTitle = title;
        let finalDesc = description;

        if (type === 'EQUIPMENT') {
            finalTitle = `[OBRA] ${title}`;
            finalDesc = `[EQP:${equipmentId || 'GERAL'}] ${description}`;
        } else if (type === 'TASK') {
            finalTitle = `[TASK] ${title}`;
        }

        const event = {
            summary: finalTitle,
            description: finalDesc,
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            extendedProperties: {
                shared: {
                    estemcoType: type,
                    estemcoEquipmentId: equipmentId
                }
            }
        };

        try {
            await createCalendarEvent(event, token, attendees);
            onSave();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao criar evento: ${e.message || e}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" /> Novo Agendamento
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500" /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-2 border rounded font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Vistoria Obra X"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock size={12} /> Início</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock size={12} /> Fim</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag size={12} /> Categoria</label>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => setType('PERSONAL')} className={`flex-1 py-2 text-xs font-bold rounded border ${type === 'PERSONAL' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-slate-50 text-slate-500'}`}>Pessoal</button>
                            <button onClick={() => setType('EQUIPMENT')} className={`flex-1 py-2 text-xs font-bold rounded border ${type === 'EQUIPMENT' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-slate-50 text-slate-500'}`}>Equipamento</button>
                            <button onClick={() => setType('TASK')} className={`flex-1 py-2 text-xs font-bold rounded border ${type === 'TASK' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-slate-50 text-slate-500'}`}>Tarefa</button>
                        </div>
                    </div>

                    {type === 'EQUIPMENT' && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Selecione Máquina</label>
                            <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} className="w-full p-2 border rounded text-sm bg-blue-50/50">
                                <option value="">Selecione...</option>
                                <option value="HELICE-01">Hélice Contínua 01</option>
                                <option value="HELICE-02">Hélice Contínua 02</option>
                                <option value="ESCAVADA-01">Escavada 01</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Descrição / Detalhes</label>
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full p-2 border rounded text-sm h-20 resize-none"
                            placeholder="Detalhes adicionais..."
                        />
                    </div>

                    {/* ATTENDEES SECTION */}
                    <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                            <Users size={12} /> Convidados & Equipe
                        </label>

                        <div className="flex gap-2 mb-2">
                            <input
                                type="email"
                                placeholder="email@exemplo.com"
                                className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
                            />
                            <button
                                onClick={handleAddEmail}
                                className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {attendees.length > 0 && (
                            <div className="flex flex-wrap gap-2 animate-in fade-in">
                                {attendees.map(email => (
                                    <span key={email} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                                        <User size={10} className="text-slate-400" />
                                        {email}
                                        <button onClick={() => removeEmail(email)} className="text-slate-400 hover:text-red-600 ml-1">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                            Convites serão enviados automaticamente pelo Google.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || !title}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                    {loading ? <span className="animate-spin">⌛</span> : <Calendar size={18} />}
                    Agendar Evento
                </button>
            </div>
        </div>
    );
};
