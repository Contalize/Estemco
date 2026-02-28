// hooks/usePhoenixData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { DailyLog } from '../types';

// Tipagem Centralizada
export interface Client { id: string; nome: string;[key: string]: any }
export interface Project { id: string; status: string; clientName: string;[key: string]: any }
export interface Asset { id: string; name: string; type: string;[key: string]: any }

export const usePhoenixData = () => {
    const queryClient = useQueryClient();

    // 1. Clientes (Cache 10 min)
    const clients = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            try {
                const q = query(collection(db, 'clients'), orderBy('razaoSocial')); // Changed 'nome' to 'razaoSocial' based on previous types
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Client[];
            } catch (error) {
                console.error("Error fetching clients:", error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 10,
    });

    // 2. Obras / Projetos (Atualização Frequente)
    const projects = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            // Ordenar por criação para ver as novas primeiro
            // Note: Requires index if 'createdAt' doesn't exist on all docs or simple query first
            // Falling back to simple collection fetch if index issues arise, but trying orderBy first
            try {
                const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
            } catch (e) {
                console.warn("Index missing for orderBy? Fetching all.", e);
                const snap = await getDocs(collection(db, 'projects'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
            }
        },
        staleTime: 1000 * 30, // 30 segundos
    });

    // 3. Frota / Ativos
    const assets = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            try {
                const snap = await getDocs(collection(db, 'assets'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Asset[];
            } catch (error) {
                console.error("Error fetching assets:", error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hora (muda pouco)
    });

    // 4. Calendar Events (Internal - For Availability Check)
    const events = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            try {
                const snap = await getDocs(collection(db, 'events'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.error("Error fetching events:", error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    // --- Mutações (Ações de Escrita) ---

    const addProject = useMutation({
        mutationFn: (newProject: any) => addDoc(collection(db, 'projects'), newProject),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    });

    const addClient = useMutation({
        mutationFn: (newClient: any) => addDoc(collection(db, 'clients'), newClient),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    });

    const updateProject = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateDoc(doc(db, 'projects', id), data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    });

    const updateClient = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateDoc(doc(db, 'clients', id), data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    });

    // --- Daily Logs (RDO) ---
    const getDailyLogs = async (projectId: string) => {
        const q = query(collection(db, 'daily_logs'), where('projetoId', '==', projectId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[];
    };

    const saveDailyLog = useMutation({
        mutationFn: (logData: any) => addDoc(collection(db, 'daily_logs'), {
            ...logData,
            createdAt: new Date()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            // alert("RDO Salvo na Nuvem com Sucesso!"); // Let UI handle feedback
        }
    });

    // --- BI Data (Global Logs) ---
    const allDailyLogs = useQuery({
        queryKey: ['allDailyLogs'],
        queryFn: async () => {
            try {
                const snap = await getDocs(collection(db, 'daily_logs'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[];
            } catch (error) {
                console.error("Error fetching all daily logs:", error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    return {
        clients: clients.data || [],
        projects: projects.data || [],
        assets: assets.data || [],
        events: events.data || [],
        allDailyLogs: allDailyLogs.data || [],
        loading: clients.isLoading || projects.isLoading || assets.isLoading || events.isLoading,
        addProject,
        addClient,
        updateProject,
        updateClient,
        getDailyLogs,
        saveDailyLog
    };
};
