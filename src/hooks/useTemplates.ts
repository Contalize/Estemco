import { useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfiguracaoTemplate } from '../services/templateService';

export const useTemplates = () => {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buscarTemplate = async (tipo: 'HCM' | 'ESC' | 'SPT'): Promise<ConfiguracaoTemplate | null> => {
        if (!profile?.tenantId) return null;
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'empresas', profile.tenantId, 'templates', tipo);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as ConfiguracaoTemplate;
            }
            return null;
        } catch (err: any) {
            console.error('Erro ao buscar template:', err);
            setError(err.message || 'Erro ao buscar template');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const salvarTemplate = async (tipo: 'HCM' | 'ESC' | 'SPT', dados: Partial<ConfiguracaoTemplate>) => {
        if (!profile?.tenantId || !user) throw new Error('Usuário não autenticado ou sem tenant');
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'empresas', profile.tenantId, 'templates', tipo);
            const snap = await getDoc(docRef);
            
            const versaoAtual = snap.exists() ? (snap.data().versao || 0) : 0;
            
            await setDoc(docRef, {
                ...dados,
                versao: versaoAtual + 1,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            }, { merge: true });
        } catch (err: any) {
            console.error('Erro ao salvar template:', err);
            setError(err.message || 'Erro ao salvar template');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const resetarTemplate = async (tipo: 'HCM' | 'ESC' | 'SPT') => {
        if (!profile?.tenantId) throw new Error('Não há tenant associado');
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'empresas', profile.tenantId, 'templates', tipo);
            await deleteDoc(docRef);
        } catch (err: any) {
            console.error('Erro ao resetar template:', err);
            setError(err.message || 'Erro ao resetar template');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        buscarTemplate,
        salvarTemplate,
        resetarTemplate,
        loading,
        error
    };
};
