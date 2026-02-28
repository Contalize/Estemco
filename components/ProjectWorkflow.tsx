import React, { useState, useMemo } from 'react';
import { usePhoenixData } from '../hooks/usePhoenixData';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    FileText, CheckCircle, PenTool, HardHat, Ruler, Receipt,
    Archive, XCircle, Undo2, Download, Eye
} from 'lucide-react';

export function ProjectWorkflow() {
    const { projects, updateProject, loading } = usePhoenixData();
    const [showArchived, setShowArchived] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null); // For Details Modal

    const COLUMN_CONFIG: any = {
        'PROPOSTA': { title: '1. Proposta Enviada', color: 'border-blue-500', bg: 'bg-blue-50', icon: FileText },
        'ACEITE': { title: '2. Aceite Cliente', color: 'border-indigo-500', bg: 'bg-indigo-50', icon: CheckCircle },
        'CONTRATO': { title: '3. Contrato', color: 'border-purple-500', bg: 'bg-purple-50', icon: PenTool },
        'EXECUCAO': { title: '4. Execução', color: 'border-orange-500', bg: 'bg-orange-50', icon: HardHat },
        'MEDICAO': { title: '5. Medição', color: 'border-cyan-500', bg: 'bg-cyan-50', icon: Ruler },
        'A_FATURAR': { title: '6. A Faturar', color: 'border-emerald-500', bg: 'bg-emerald-50', icon: Receipt },
    };

    const boardData = useMemo(() => {
        const columns: any = {};
        Object.keys(COLUMN_CONFIG).forEach(key => columns[key] = []);
        projects.forEach(project => {
            if (['CANCELADO', 'PERDIDO'].includes(project.status)) return;
            const statusKey = COLUMN_CONFIG[project.status] ? project.status : 'PROPOSTA';
            columns[statusKey].push(project);
        });
        return columns;
    }, [projects]);

    const archivedProjects = useMemo(() => projects.filter(p => ['CANCELADO', 'PERDIDO'].includes(p.status)), [projects]);

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        // Fix: verify updateProject API in usePhoenixData. Assumed updateProject.mutate({ id, data: { status } })
        updateProject.mutate({ id: result.draggableId, data: { status: result.destination.droppableId } });
    };

    // --- CSV EXPORT PRO ---
    const handleExportCSV = () => {
        const headers = ['Cliente', 'Obra', 'Status', 'Valor Total', 'Data', 'Escopo Resumido'];
        const rows = projects.map(p => {
            const scope = p.itens?.map((i: any) => `${i.qty || i.quantity}x ${i.type} Ø${i.diametro || i.diameter}`).join(' | ') || 'N/A';
            const dateStr = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : (p.startDate ? new Date(p.startDate).toLocaleDateString() : '-');

            return [
                `"${p.clientName}"`,
                `"${p.name}"`,
                p.status,
                `"${(p.totalBudget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}"`,
                dateStr,
                `"${scope}"`
            ].join(';');
        });

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n'); // \uFEFF fixes Excel accents
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Estemco_Obras_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };

    if (loading) return <div className="p-10 text-center">Carregando workflow...</div>;

    return (
        <div className="p-6 bg-slate-50 min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {showArchived ? <Archive className="text-slate-400" /> : <HardHat className="text-blue-600" />}
                        {showArchived ? 'Arquivo Morto' : 'Esteira de Produção'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-bold">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold border ${showArchived ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                        {showArchived ? <Undo2 size={16} /> : <Archive size={16} />}
                        {showArchived ? 'Voltar' : 'Arquivados'}
                    </button>
                </div>
            </div>

            {/* Board */}
            {!showArchived && (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-[1600px] h-full">
                            {Object.entries(COLUMN_CONFIG).map(([columnId, config]: any) => (
                                <div key={columnId} className="flex-1 min-w-[260px] flex flex-col h-full rounded-xl bg-slate-100/50 border border-slate-200/60">
                                    <div className={`p-3 border-b-2 flex items-center justify-between bg-white rounded-t-xl ${config.color}`}>
                                        <h2 className="font-bold text-slate-700 text-xs uppercase">{config.title}</h2>
                                        <span className="bg-slate-100 text-[10px] px-2 py-1 rounded-full font-bold">{boardData[columnId]?.length || 0}</span>
                                    </div>
                                    <Droppable droppableId={columnId}>
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 p-2 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
                                                {boardData[columnId]?.map((item: any, index: number) => (
                                                    <Draggable draggableId={String(item.id)} index={index}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md group">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.clientName}</span>
                                                                    <button onClick={() => setSelectedProject(item)} className="text-blue-400 hover:text-blue-600"><Eye size={14} /></button>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{item.name}</p>
                                                                {/* CRITICAL FIX: Display totalBudget, not grandTotal */}
                                                                <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                    {(item.totalBudget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>
                    </div>
                </DragDropContext>
            )}

            {/* DETAILS MODAL (SCOPE PREVIEW) */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4 border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{selectedProject.name}</h2>
                                <p className="text-slate-500 text-sm">{selectedProject.clientName}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-100 rounded-full"><XCircle /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Resumo do Escopo</h3>
                                {selectedProject.itens && selectedProject.itens.length > 0 ? (
                                    <ul className="space-y-2">
                                        {selectedProject.itens.map((it: any, idx: number) => (
                                            <li key={idx} className="text-sm flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                                <span>{it.qty || it.quantity}x {it.type} Ø{it.diameter || it.diametro}cm</span>
                                                <span className="font-mono text-slate-600">{it.depth}m prof.</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-slate-400 italic">Nenhum item detalhado.</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-3 rounded">
                                    <span className="text-xs text-slate-400 uppercase">Valor Total</span>
                                    <p className="font-bold text-emerald-600 text-lg">
                                        {(selectedProject.totalBudget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                                <div className="border p-3 rounded">
                                    <span className="text-xs text-slate-400 uppercase">Pagamento</span>
                                    <p className="font-bold text-slate-700 text-sm">{selectedProject.paymentMethod || 'Não def.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
