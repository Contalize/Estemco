import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTemplates } from '../../hooks/useTemplates';
import { ConfiguracaoTemplate } from '../../services/templateService';
import { FileText, Save, RotateCcw, Plus, Trash2, Info } from 'lucide-react';
import { Button, Textarea, Input, Label, ConfirmDialog } from '../../../components/ui';
import { toast } from 'sonner';

type TipoTemplate = 'HCM' | 'ESC' | 'SPT';

export const Templates: React.FC = () => {
    const { profile } = useAuth();
    const { buscarTemplate, salvarTemplate, resetarTemplate, loading } = useTemplates();
    
    const [activeTab, setActiveTab] = useState<TipoTemplate>('HCM');
    const [formData, setFormData] = useState<Partial<ConfiguracaoTemplate>>({ clausulas_ativo: true });
    
    const [confirmReset, setConfirmReset] = useState(false);

    // Carregar dados
    useEffect(() => {
        if (profile?.role !== 'Administrador') return;
        
        const load = async () => {
            const data = await buscarTemplate(activeTab);
            if (data) {
                setFormData(data);
            } else {
                setFormData({ clausulas_ativo: true }); // Reseta para vazio/padrão ao mudar de aba se não houver no banco
            }
        };
        load();
    }, [activeTab, profile]);

    if (profile?.role !== 'Administrador') {
        return <div className="p-8 text-center text-red-500">Acesso negado. Apenas administradores podem acessar esta página.</div>;
    }

    const handleSave = async () => {
        try {
            await salvarTemplate(activeTab, formData);
            toast.success(`Template ${activeTab} salvo com sucesso!`);
        } catch (e) {
            toast.error('Erro ao salvar template');
        }
    };

    const handleReset = async () => {
        try {
            await resetarTemplate(activeTab);
            setFormData({ clausulas_ativo: true });
            toast.success(`Template ${activeTab} restaurado para o padrão!`);
            setConfirmReset(false);
        } catch (e) {
            toast.error('Erro ao restaurar template');
        }
    };

    const updateArray = (field: keyof ConfiguracaoTemplate, index: number, value: string) => {
        const arr = [...(formData[field] as string[] || [])];
        arr[index] = value;
        setFormData({ ...formData, [field]: arr });
    };

    const addToArray = (field: keyof ConfiguracaoTemplate) => {
        const arr = [...(formData[field] as string[] || [])];
        arr.push('');
        setFormData({ ...formData, [field]: arr });
    };

    const removeFromArray = (field: keyof ConfiguracaoTemplate, index: number) => {
        const arr = [...(formData[field] as string[] || [])];
        arr.splice(index, 1);
        setFormData({ ...formData, [field]: arr });
    };

    const renderArraySection = (title: string, fieldTitle: keyof ConfiguracaoTemplate, fieldItems: keyof ConfiguracaoTemplate) => (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
            <h3 className="font-bold text-slate-800">{title}</h3>
            <div>
                <Label className="text-xs text-slate-500 uppercase">Título da Seção</Label>
                <Input 
                    value={(formData[fieldTitle] as string) || ''} 
                    onChange={e => setFormData({ ...formData, [fieldTitle]: e.target.value })}
                    placeholder={`Ex: ${title.toUpperCase()}`}
                    className="mt-1"
                />
            </div>
            
            <div className="space-y-3">
                <Label className="text-xs text-slate-500 uppercase">Itens (Linhas)</Label>
                {(formData[fieldItems] as string[] || []).map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                        <Textarea 
                            value={item} 
                            onChange={e => updateArray(fieldItems, i, e.target.value)}
                            className="min-h-[60px] text-sm flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeFromArray(fieldItems, i)} className="text-red-500 hover:bg-red-50 shrink-0">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addToArray(fieldItems)} className="gap-2 text-xs">
                    <Plus size={14} /> Adicionar Item
                </Button>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                        <FileText className="text-indigo-600" />
                        Templates de Proposta
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Configure as cláusulas contratuais e obrigações geradas automaticamente nos PDFs para cada equipamento.
                    </p>
                </div>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-200 mb-6">
                {(['HCM', 'ESC', 'SPT'] as TipoTemplate[]).map(tipo => (
                    <button
                        key={tipo}
                        onClick={() => setActiveTab(tipo)}
                        className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === tipo ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tipo}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                
                <div className="mb-6 flex items-center gap-3 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                    <Info size={20} className="shrink-0" />
                    <p>
                        Dica: Você pode usar variáveis que serão substituídas na geração. Ex: <strong>{`{{VALOR_TOTAL}}`}</strong>, <strong>{`{{NUM_PROPOSTA}}`}</strong>. <br/>
                        Se deixar vazio, o sistema usará o texto padrão da Estemco (offline).
                    </p>
                </div>

                <div className="flex items-center gap-2 mb-6 p-4 border rounded-lg bg-slate-50">
                    <input 
                        type="checkbox" 
                        id="ativo" 
                        checked={formData.clausulas_ativo ?? true}
                        onChange={e => setFormData({ ...formData, clausulas_ativo: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="ativo" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Ativar cláusulas customizadas para este modelo (Se desativado, usa o padrão do sistema)
                    </label>
                </div>

                {formData.clausulas_ativo && (
                    <div className="space-y-6">
                        {renderArraySection('Faturamento Mínimo', 'fat_minimo_titulo', 'fat_minimo_items')}
                        {renderArraySection('Isenção de Faturamento Mínimo', 'isencao_titulo', 'isencao_items')}
                        {renderArraySection('Cobranças em Geral', 'cobrancas_titulo', 'cobrancas_items')}
                        {renderArraySection('Obrigações do Contratante', 'obrig_contratante', 'obrig_contratante')} {/* Actually this is not a section with title in the array, let's fix below */}
                        
                        {/* Seções simples (array sem título configurável) */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
                            <h3 className="font-bold text-slate-800">Obrigações do Contratante</h3>
                            <div className="space-y-3">
                                {(formData.obrig_contratante || []).map((item, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <Textarea value={item} onChange={e => updateArray('obrig_contratante', i, e.target.value)} className="min-h-[60px] text-sm flex-1" />
                                        <Button variant="ghost" size="icon" onClick={() => removeFromArray('obrig_contratante', i)} className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => addToArray('obrig_contratante')} className="gap-2 text-xs"><Plus size={14} /> Adicionar Item</Button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
                            <h3 className="font-bold text-slate-800">Obrigações da Contratada (Estemco)</h3>
                            <div className="space-y-3">
                                {(formData.obrig_proponente || []).map((item, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <Textarea value={item} onChange={e => updateArray('obrig_proponente', i, e.target.value)} className="min-h-[60px] text-sm flex-1" />
                                        <Button variant="ghost" size="icon" onClick={() => removeFromArray('obrig_proponente', i)} className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => addToArray('obrig_proponente')} className="gap-2 text-xs"><Plus size={14} /> Adicionar Item</Button>
                            </div>
                        </div>

                        {/* Campos únicos de texto */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
                            <h3 className="font-bold text-slate-800">Direitos e Risco Geotécnico</h3>
                            <Textarea 
                                value={formData.clausula_risco || ''} 
                                onChange={e => setFormData({ ...formData, clausula_risco: e.target.value })}
                                className="min-h-[100px] text-sm"
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
                            <h3 className="font-bold text-slate-800">Termo de Aceitação da Proposta</h3>
                            <Textarea 
                                value={formData.termo_aceite || ''} 
                                onChange={e => setFormData({ ...formData, termo_aceite: e.target.value })}
                                className="min-h-[100px] text-sm"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                    <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2">
                        <RotateCcw size={16} /> Restaurar Padrões
                    </Button>
                    
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8">
                        <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Template'}
                    </Button>
                </div>

                {formData.updatedAt && (
                    <div className="mt-4 text-center text-xs text-slate-400">
                        Última atualização: {new Date(formData.updatedAt?.toDate?.() || formData.updatedAt).toLocaleString()} · Versão {formData.versao || 1}
                    </div>
                )}
            </div>

            <ConfirmDialog 
                isOpen={confirmReset}
                title="Restaurar Padrões Originais"
                message="Isso apagará todas as configurações deste template e voltará a usar os textos originais da Estemco (embutidos no sistema). Esta ação não pode ser desfeita."
                variant="destructive"
                onConfirm={handleReset}
                onClose={() => setConfirmReset(false)}
                confirmLabel="Restaurar"
            />
        </div>
    );
};
